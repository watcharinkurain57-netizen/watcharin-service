-- ============================================================================
-- prod_deploy_0001_0008 — รวม migration ทั้งหมดสำหรับตั้ง production ครั้งแรก
--
-- รันไฟล์นี้ทีเดียวบน Supabase project ตัวใหม่ที่ยังว่างเปล่า
-- ลำดับสำคัญ ห้ามสลับ เพราะ 0005 อ่านค่าจากคอลัมน์ status ที่ 0002 สร้างไว้
-- ก่อนจะลบทิ้ง และ 0007 แก้ foreign key ที่ 0001/0006 สร้างไว้
--
-- ⚠️ ตอนรันครั้งแรกจะยังไม่มีใครใน auth.users
--    ส่วนที่ตั้งแอดมิน (ใน 0003) จะไม่ทำอะไรเลยเพราะหาอีเมลไม่เจอ
--    ต้องล็อกอินบนเว็บ prod ก่อน แล้วค่อยรัน prod_post_login.sql
-- ============================================================================

-- ############################################################################
-- >>> 0001_projects.sql
-- ############################################################################

-- ============================================================================
-- 0001_projects — คลังโปรเจกต์ + โครงสิทธิ์
--
-- ทำอะไร:
--   1. ย้ายรายการโปรเจกต์จากไฟล์ src/lib/project-archive.ts เข้าฐานข้อมูล
--   2. วางตาราง project_members ไว้รองรับ login (owner / client)
--   3. วางตาราง project_invites ไว้รองรับลิงก์เชิญ
--
-- ยังไม่ทำในรอบนี้: งานค้าง งวดจ่าย ไฟล์ส่งมอบ — รอตอนทำ auth เสร็จ
--
-- หลักที่ยึด: ทุกตารางเปิด RLS เสมอ เพราะฝั่งเบราว์เซอร์ใช้ publishable key
-- ที่ใครก็อ่านได้ ตัวที่กันข้อมูลจริงคือ policy ไม่ใช่การซ่อนคีย์
-- ============================================================================

-- ---------- ชนิดข้อมูล ----------
do $$ begin
  create type public.project_status as enum ('building', 'shipped', 'sunset');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_kind as enum ('factory', 'software');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.project_role as enum ('owner', 'client');
exception when duplicate_object then null; end $$;

-- ---------- ตารางโปรเจกต์ ----------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  tagline       text not null,
  -- ย่อหน้าละ 1 element ตามที่หน้าเว็บเรนเดอร์
  problem       text[] not null default '{}',
  status        public.project_status not null,
  status_note   text,
  kind          public.project_kind not null,
  tags          text[] not null default '{}',
  tech          text[] not null default '{}',
  -- เก็บเป็นข้อความที่แสดงจริง เช่น 'มี.ค. 2026' ไม่ใช่ date
  -- เพราะรูปแบบเดือนไทยแบบ พ.ศ./ค.ศ. ของ Intl ไม่ตรงกับที่ใช้อยู่
  started_label text not null,
  ended_label   text,
  collaborators int not null default 0 check (collaborators >= 0),
  progress      int check (progress between 0 and 100),
  done          text[] not null default '{}',
  next_up       text[] not null default '{}',
  -- { src, alt, focus } — ดู public/projects/README.md
  cover         jsonb,
  gallery       jsonb not null default '[]'::jsonb,
  featured      boolean not null default false,
  views         int not null default 0 check (views >= 0),
  -- ปิดไม่ให้โชว์ในคลังสาธารณะได้ โดยไม่ต้องลบทิ้ง
  is_public     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_public_idx on public.projects (is_public, status);

-- ---------- ใครอยู่ในโปรเจกต์ไหน ----------
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.project_role not null,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx on public.project_members (user_id);

-- ---------- ลิงก์เชิญ ----------
-- ลูกค้ากดลิงก์ → LINE Login → ระบบผูกเข้าโปรเจกต์ให้เอง
-- ไม่ใช่ "สมัครแล้วรออนุมัติ" เพราะคนจะเลิกกลางคัน
create table if not exists public.project_invites (
  token       text primary key default encode(gen_random_bytes(24), 'hex'),
  project_id  uuid not null references public.projects (id) on delete cascade,
  role        public.project_role not null default 'client',
  label       text,
  expires_at  timestamptz,
  used_at     timestamptz,
  used_by     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists project_invites_project_idx on public.project_invites (project_id);

-- ---------- ฟังก์ชันช่วยเช็คสิทธิ์ ----------
-- ⚠️ ต้องเป็น security definer มิฉะนั้น policy ของ project_members
-- จะไปเรียก project_members ซ้อนตัวเอง แล้ว Postgres จะฟ้อง infinite recursion
-- (เป็นกับดักเดียวกับที่เคยเจอตอนทำ x-tier)
create or replace function public.is_project_member(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid()
  );
$$;

create or replace function public.is_project_owner(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project and user_id = auth.uid() and role = 'owner'
  );
$$;

-- ---------- RLS ----------
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;

-- โปรเจกต์สาธารณะ ใครเปิดก็เห็น (ยังไม่ล็อกอินก็เห็น)
drop policy if exists projects_read_public on public.projects;
create policy projects_read_public on public.projects
  for select
  to anon, authenticated
  using (is_public = true);

-- คนในโปรเจกต์เห็นโปรเจกต์ตัวเองได้เสมอ แม้จะปิดไม่ให้สาธารณะเห็น
drop policy if exists projects_read_member on public.projects;
create policy projects_read_member on public.projects
  for select
  to authenticated
  using (public.is_project_member(id));

-- เห็นเฉพาะรายชื่อของโปรเจกต์ที่ตัวเองอยู่
drop policy if exists project_members_read on public.project_members;
create policy project_members_read on public.project_members
  for select
  to authenticated
  using (public.is_project_member(project_id));

-- project_invites: ยังไม่เปิด policy ให้ใครเลยในรอบนี้
-- เปิด RLS ไว้แล้วไม่มี policy = ฝั่งเบราว์เซอร์อ่านไม่ได้เลย ซึ่งคือสิ่งที่ต้องการ
-- การแลกลิงก์เชิญจะทำผ่านฟังก์ชัน security definer ตอนทำ auth

-- การเพิ่ม/แก้/ลบโปรเจกต์ยังไม่เปิดให้ทำจากฝั่งเบราว์เซอร์
-- ตอนนี้แก้ผ่าน SQL editor เท่านั้น ยังไม่มีหน้าแอดมิน จึงไม่ต้องเปิดประตูทิ้งไว้

-- ---------- อัปเดต updated_at อัตโนมัติ ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ข้อมูลเริ่มต้น — ตรงกับ src/lib/project-archive.ts
-- ใส่เฉพาะโปรเจกต์จริง ไม่ใส่ของสมมติ
-- ============================================================================

insert into public.projects
  (slug, name, tagline, problem, status, status_note, kind, tags, tech,
   started_label, ended_label, collaborators, progress, done, next_up, featured, views)
values
  (
    'coresync',
    'CoreSync',
    'แดชบอร์ดติดตามสายการผลิตแบบเรียลไทม์',
    array[
      'โรงงานมีข้อมูลอยู่แล้วทุกอย่าง แต่กระจายกันคนละที่ — ค่าจากเครื่องอยู่ใน PLC ใบสั่งงานอยู่ในกระดาษ บิลค่าไฟอยู่ในไฟล์ Excel หัวหน้ากะเลยไม่รู้ว่าสายไหนมีปัญหาจนกว่าจะสิ้นวัน',
      'CoreSync รวมทุกอย่างขึ้นจอเดียว เห็นสถานะเครื่องแบบเรียลไทม์ และแจ้งเตือนก่อนที่ของเสียจะออกมาเป็นล็อต'
    ],
    'building', null, 'factory',
    array['PLC', 'Sensor', 'SCADA', 'MES'],
    array['Next.js', 'React', 'TypeScript'],
    'มี.ค. 2026', null, 0, 62,
    array[
      'แดชบอร์ดคุณภาพ ใช้หลัก SPC',
      'ติดตามพลังงานและคำนวณบิลค่าไฟตามโครงสร้างของไทย',
      'แผนซ่อมบำรุงตามรอบ',
      'ใบสั่งงาน พร้อมชุดตรวจ 39 ข้อที่รันอัตโนมัติ'
    ],
    array['เชื่อมใบสั่งงานเข้ากับ ERP', 'หน้ารายงานสรุปส่งหัวหน้ากะ'],
    true, 320
  ),
  (
    'watcharin-service',
    'watcharin-service',
    'เว็บบริการและคลังโปรเจกต์ที่คุณกำลังเปิดอยู่',
    array[
      'งานที่ทำมากระจายอยู่หลายที่ ทั้งเว็บ ทั้งไลน์ ทั้งไฟล์ในเครื่อง คนที่อยากมาคุยงานเลยไม่รู้จะเริ่มตรงไหน',
      'เว็บนี้รวมทุกอย่างไว้ที่เดียว — ดูงานที่เคยทำ อ่านเรื่องที่เคยตอบ แล้วทักมาคุยได้เลย'
    ],
    'shipped', null, 'software',
    array['เว็บ', 'SEO'],
    array['Next.js 16', 'React 19', 'Tailwind CSS 4', 'Vercel'],
    'มิ.ย. 2026', null, 0, null,
    array[
      'หน้าเว็บพร้อมฉาก WebGL ที่เล่าเรื่องตามการเลื่อนจอ',
      'เรซูเม่สองภาษาที่สั่งพิมพ์ได้',
      'เดโม CoreSync เปิดเล่นได้ในเบราว์เซอร์',
      'เครื่องคำนวณความคุ้มค่าสำหรับเจ้าของโรงงาน'
    ],
    array[]::text[],
    false, 210
  ),
  (
    'tang-tee',
    'ตั้งตี้',
    'แอปหารบิลที่จบได้ในไลน์ ไม่ต้องออกไปหน้าเว็บ',
    array[
      'หารบิลหลังไปเที่ยวกันเป็นเรื่องน่าปวดหัว คนจ่ายแทนต้องไล่ทวงเอง คนที่ต้องจ่ายก็ไม่รู้ว่าต้องโอนเท่าไหร่',
      'ตั้งตี้ทำให้พิมพ์ในกลุ่มไลน์แล้วบิลเด้งขึ้นมาพร้อม QR พร้อมเพย์ ใครไม่มีบัญชีก็กดจ่ายผ่านลิงก์ได้ ไม่ต้องสมัครอะไร'
    ],
    'sunset', 'ปิดบริการ ส.ค. 2026', 'software',
    array['LINE Bot', 'LIFF', 'PromptPay'],
    array['Next.js', 'Supabase', 'PostgreSQL', 'LINE Messaging API'],
    'มิ.ย. 2026', 'ส.ค. 2026', 0, null,
    array[
      'หารบิลอัตโนมัติ พร้อม AI ช่วยอ่านใบเสร็จ',
      'บอทไลน์ที่สร้างบิลจากในกลุ่มได้เลย พร้อมการ์ดและ QR พร้อมเพย์',
      'คนนอกที่ไม่มีบัญชีเปิดลิงก์จ่ายและแนบสลิปได้',
      'แผนที่ค้นหาตี้ทั่วไทย กรองถึงระดับตำบล',
      'ฐานข้อมูล 43 migration ดูแลเองทั้งชุด'
    ],
    array[]::text[],
    false, 260
  ),
  (
    'x-tier',
    'X-Tier',
    'ระบบจัดการองค์กรและทีมขาย',
    array[
      'ทีมขายที่โตขึ้นเริ่มจัดการด้วย Excel ไม่ไหว ไม่รู้ว่าใครทำถึงไหน เป้าเดือนนี้เหลืออีกเท่าไหร่ เอกสารอยู่ที่ใคร',
      'X-Tier รวมโครงสร้างทีม เป้าหมาย งาน และเอกสารไว้ที่เดียว พร้อมงานอัตโนมัติประจำวันที่รันเองด้วย pg_cron'
    ],
    'sunset', 'ปิดบริการ ส.ค. 2026', 'software',
    array['จัดการองค์กร', 'CRM', 'เอกสาร'],
    array['Next.js', 'Supabase', 'PostgreSQL', 'pg_cron'],
    'มิ.ย. 2026', 'ส.ค. 2026', 0, null,
    array[
      'โครงสร้างทีมพร้อมสิทธิ์การเข้าถึงแยกตามบทบาท',
      'เป้าหมายและการเคลม พร้อมกระดานติดตาม',
      'ระบบเอกสารที่แยกสิทธิ์ตามองค์กร',
      'แผนงานแบบ Gantt พร้อมความสัมพันธ์ระหว่างงาน',
      'ฐานข้อมูล 48 migration และงานอัตโนมัติรายวัน'
    ],
    array[]::text[],
    false, 180
  )
on conflict (slug) do nothing;


-- ############################################################################
-- >>> 0002_project_work.sql
-- ############################################################################

-- ============================================================================
-- 0002_project_work — งานค้าง งวดจ่าย ไฟล์ส่งมอบ
--
-- สามตารางนี้คือของที่อยู่ใน "แผงของเจ้าของ" บนหน้าโปรเจกต์
--
-- เรื่องสิทธิ์ที่ต้องเข้าใจก่อนอ่าน policy ข้างล่าง:
--   ลูกค้าที่อยู่ในโปรเจกต์เห็นได้ทั้งสามตาราง รวมถึงตารางงวดจ่ายของตัวเอง
--   เพราะคนที่กำลังจะจ่ายงวด 3 ต้องรู้ว่าจ่ายไปแล้วเท่าไหร่
--
--   ⚠️ ตารางนี้จึงห้ามมีต้นทุน กำไร หรือเรทที่คิดจริง เด็ดขาด
--   ถ้าวันหนึ่งต้องเก็บตัวเลขพวกนั้น ให้สร้างตารางแยกที่เปิดให้เฉพาะ owner
--   (คู่กับ capability project.finance.view ที่แยกไว้แล้วใน archive-access.ts)
--   Postgres คุมสิทธิ์ระดับแถวได้ แต่คุมระดับคอลัมน์ได้ลำบาก
--   แยกตารางตั้งแต่แรกถูกกว่ามาแยกทีหลังตอนมีข้อมูลจริงแล้ว
-- ============================================================================

do $$ begin
  create type public.task_status as enum ('todo', 'doing', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('paid', 'pending', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.file_status as enum ('delivered', 'pending');
exception when duplicate_object then null; end $$;

-- ---------- งานในโปรเจกต์ ----------
create table if not exists public.project_tasks (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null,
  status     public.task_status not null default 'todo',
  -- ข้อความกำหนดส่งแบบที่แสดงจริง เช่น 'พรุ่งนี้' 'ค้าง 3 วัน' 'ก.ย.'
  -- เหตุผลเดียวกับ started_label: เดือนไทยของ Intl ให้ พ.ศ. ซึ่งไม่ตรงกับที่ใช้
  due_label  text,
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_tasks_project_idx
  on public.project_tasks (project_id, sort);

-- ---------- งวดจ่าย ----------
-- เห็นได้ทั้งเจ้าของและลูกค้า จึงมีแต่ตัวเลขที่ลูกค้าควรเห็นเท่านั้น
create table if not exists public.project_payments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label      text not null,
  amount     numeric(12, 2) not null check (amount >= 0),
  status     public.payment_status not null default 'pending',
  due_label  text,
  paid_on    date,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_payments_project_idx
  on public.project_payments (project_id, sort);

-- ---------- ไฟล์ส่งมอบ ----------
create table if not exists public.project_files (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  name         text not null,
  -- พาธใน Supabase Storage — ยังไม่สร้าง bucket ในรอบนี้
  storage_path text,
  size_bytes   bigint check (size_bytes >= 0),
  status       public.file_status not null default 'pending',
  delivered_on date,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists project_files_project_idx
  on public.project_files (project_id, sort);

-- ---------- RLS ----------
alter table public.project_tasks    enable row level security;
alter table public.project_payments enable row level security;
alter table public.project_files    enable row level security;

-- คนในโปรเจกต์เห็นได้ (ทั้ง owner และ client) คนนอกไม่เห็นอะไรเลย
-- ใช้ is_project_member ที่เป็น security definer จาก 0001 เพื่อกัน recursion
drop policy if exists project_tasks_read on public.project_tasks;
create policy project_tasks_read on public.project_tasks
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_payments_read on public.project_payments;
create policy project_payments_read on public.project_payments
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_files_read on public.project_files;
create policy project_files_read on public.project_files
  for select to authenticated
  using (public.is_project_member(project_id));

-- แก้ไขได้เฉพาะเจ้าของ — เผื่อหน้าแอดมินในอนาคต
-- ตอนนี้ยังไม่มีหน้าจอที่เขียน แต่เปิดไว้ให้เจ้าของเท่านั้นก็ไม่เสียหาย
-- เพราะยังไงคนที่ไม่ได้เป็น owner ก็ผ่าน policy ไม่ได้
drop policy if exists project_tasks_write on public.project_tasks;
create policy project_tasks_write on public.project_tasks
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists project_payments_write on public.project_payments;
create policy project_payments_write on public.project_payments
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists project_files_write on public.project_files;
create policy project_files_write on public.project_files
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop trigger if exists project_tasks_touch on public.project_tasks;
create trigger project_tasks_touch before update on public.project_tasks
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- ข้อมูลตัวอย่างของ CoreSync — ให้มีของให้เห็นตอนทดสอบแผงของเจ้าของ
-- ตัวเลขเงินเป็นของสมมติ แก้ให้ตรงกับงานจริงได้เลย
-- ============================================================================

insert into public.project_tasks (project_id, title, status, due_label, sort)
select p.id, t.title, t.status::public.task_status, t.due_label, t.sort
from public.projects p
cross join (values
  ('แดชบอร์ดคุณภาพ ใช้หลัก SPC',            'done',  null,        1),
  ('ติดตามพลังงานและคำนวณบิลค่าไฟ',          'done',  null,        2),
  ('แผนซ่อมบำรุงตามรอบ',                    'done',  null,        3),
  ('ต่อ API ใบสั่งงานกับ ERP',               'doing', 'ค้าง 3 วัน', 4),
  ('ทดสอบอ่านค่าจาก PLC ตัวที่ 4',           'todo',  'พรุ่งนี้',    5),
  ('ทำหน้ารายงานส่งหัวหน้ากะ',                'todo',  'สัปดาห์หน้า', 6),
  ('อบรมการใช้งานให้ทีมหน้างาน',              'todo',  'ก.ย.',      7)
) as t(title, status, due_label, sort)
where p.slug = 'coresync'
  and not exists (select 1 from public.project_tasks x where x.project_id = p.id);

insert into public.project_payments (project_id, label, amount, status, due_label, paid_on, sort)
select p.id, v.label, v.amount, v.status::public.payment_status, v.due_label, v.paid_on::date, v.sort
from public.projects p
cross join (values
  ('มัดจำ 30%',                24000, 'paid',    null,           '2026-03-14', 1),
  ('งวดที่ 2 — ส่งแดชบอร์ด',     24000, 'paid',    null,           '2026-06-02', 2),
  ('งวดที่ 3 — เชื่อม ERP',      32000, 'pending', 'รอส่งมอบ',      null,        3)
) as v(label, amount, status, due_label, paid_on, sort)
where p.slug = 'coresync'
  and not exists (select 1 from public.project_payments x where x.project_id = p.id);

insert into public.project_files (project_id, name, status, delivered_on, sort)
select p.id, v.name, v.status::public.file_status, v.delivered_on::date, v.sort
from public.projects p
cross join (values
  ('เอกสารออกแบบระบบ v2.pdf', 'delivered', '2026-08-12', 1),
  ('คู่มือใช้งานหน้างาน.pdf',   'delivered', '2026-08-02', 2),
  ('รายงานทดสอบ UAT',         'pending',   null,        3)
) as v(name, status, delivered_on, sort)
where p.slug = 'coresync'
  and not exists (select 1 from public.project_files x where x.project_id = p.id);


-- ############################################################################
-- >>> 0003_admin_create.sql
-- ############################################################################

-- ============================================================================
-- 0003_admin_create — เปิดให้สร้างและแก้โปรเจกต์จากหน้าเว็บได้
--
-- ปัญหาไก่กับไข่ที่ต้องแก้:
--   สิทธิ์ owner เก็บอยู่ใน project_members ซึ่งผูกกับ "โปรเจกต์ที่มีอยู่แล้ว"
--   แต่ตอนกดสร้างโปรเจกต์ใหม่ ยังไม่มีโปรเจกต์ให้เป็นเจ้าของ
--   จึงไม่มีทางพิสูจน์สิทธิ์ด้วย project_members ได้
--
--   ทางออก: มีตาราง app_admins แยกต่างหาก เก็บว่าใครเป็นเจ้าของเว็บนี้
--   สร้างเสร็จแล้ว trigger จะใส่คนสร้างเป็น owner ของโปรเจกต์นั้นให้เอง
-- ============================================================================

create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- เห็นได้แค่แถวของตัวเอง — พอให้หน้าเว็บรู้ว่า "ฉันเป็นแอดมินไหม"
-- แต่ไม่ให้ไล่ดูว่าใครเป็นแอดมินบ้าง
drop policy if exists app_admins_read_self on public.app_admins;
create policy app_admins_read_self on public.app_admins
  for select to authenticated
  using (user_id = auth.uid());

-- security definer เพราะถูกเรียกจาก policy ของตารางอื่น
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ---------- ให้แอดมินสร้างโปรเจกต์ได้ ----------
drop policy if exists projects_insert_admin on public.projects;
create policy projects_insert_admin on public.projects
  for insert to authenticated
  with check (public.is_app_admin());

-- แก้ไขได้ทั้งแอดมินและเจ้าของโปรเจกต์นั้น
drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner on public.projects
  for update to authenticated
  using (public.is_app_admin() or public.is_project_owner(id))
  with check (public.is_app_admin() or public.is_project_owner(id));

-- ลบได้เฉพาะแอดมิน — ลบโปรเจกต์คือ cascade ลบงาน งวดจ่าย ไฟล์ ทิ้งหมด
drop policy if exists projects_delete_admin on public.projects;
create policy projects_delete_admin on public.projects
  for delete to authenticated
  using (public.is_app_admin());

-- ---------- เจ้าของจัดการสมาชิกในโปรเจกต์ตัวเองได้ ----------
-- จำเป็นสำหรับ trigger ด้านล่าง และสำหรับลิงก์เชิญในอนาคต
drop policy if exists project_members_write_owner on public.project_members;
create policy project_members_write_owner on public.project_members
  for all to authenticated
  using (public.is_app_admin() or public.is_project_owner(project_id))
  with check (public.is_app_admin() or public.is_project_owner(project_id));

-- ---------- สร้างเสร็จแล้วใส่คนสร้างเป็นเจ้าของให้เลย ----------
-- ถ้าไม่มี trigger นี้ คนสร้างจะสร้างโปรเจกต์แล้วเข้าไปแก้ต่อไม่ได้
-- เพราะยังไม่ได้เป็น owner ของมัน
create or replace function public.claim_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- รันจาก SQL editor จะไม่มี auth.uid() ก็ข้ามไป ไม่ต้องพัง
  if auth.uid() is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists projects_claim on public.projects;
create trigger projects_claim after insert on public.projects
  for each row execute function public.claim_new_project();

-- ============================================================================
-- ตั้งเจ้าของเว็บเป็นแอดมิน — แก้อีเมลให้ตรงกับที่ใช้ล็อกอิน
-- ============================================================================

insert into public.app_admins (user_id, note)
select id, 'เจ้าของเว็บ'
from auth.users
where email = 'watcharinkurain57@gmail.com'
on conflict (user_id) do nothing;

-- ตรวจว่าเข้าแล้ว — ควรได้ 1 แถว
select u.email, a.note
from public.app_admins a
join auth.users u on u.id = a.user_id;


-- ############################################################################
-- >>> 0004_task_dates.sql
-- ############################################################################

-- ============================================================================
-- 0004_task_dates — ใส่วันที่จริงให้งาน เพื่อรองรับมุมมองปฏิทิน/ไทม์ไลน์
--
-- ของเดิม due_label เก็บเป็นข้อความที่แสดงจริง เช่น 'พรุ่งนี้' 'ค้าง 3 วัน'
-- อ่านง่ายก็จริง แต่เอาไปวางบนปฏิทินหรือเรียงตามเวลาไม่ได้เลย
--
-- เพิ่ม due_on เป็นวันที่จริง และเก็บ due_label ไว้เป็นข้อความเสริม
-- (เช่นงานที่ยังไม่มีกำหนดแน่นอน เขียนว่า 'รอลูกค้าตอบ' ได้)
-- ============================================================================

alter table public.project_tasks
  add column if not exists due_on date;

alter table public.project_tasks
  add column if not exists started_on date;

-- ใช้ตอนเรียงงานตามกำหนดส่ง และตอนดึงงานของช่วงเวลาหนึ่งมาแสดงบนปฏิทิน
create index if not exists project_tasks_due_idx
  on public.project_tasks (project_id, due_on);

-- ---------- เติมวันที่ให้ข้อมูลตัวอย่างของ CoreSync ----------
-- ให้มีของวางบนปฏิทินตอนทดสอบ
update public.project_tasks t
set due_on = case t.title
      when 'ต่อ API ใบสั่งงานกับ ERP'      then current_date - 3
      when 'ทดสอบอ่านค่าจาก PLC ตัวที่ 4'  then current_date + 1
      when 'ทำหน้ารายงานส่งหัวหน้ากะ'      then current_date + 7
      when 'อบรมการใช้งานให้ทีมหน้างาน'    then current_date + 30
      else null
    end
from public.projects p
where p.id = t.project_id
  and p.slug = 'coresync'
  and t.due_on is null;


-- ############################################################################
-- >>> 0005_task_columns.sql
-- ############################################################################

-- ============================================================================
-- 0005_task_columns — คอลัมน์บอร์ดที่ตั้งเองได้ต่อโปรเจกต์
--
-- ของเดิม status เป็น enum ('todo','doing','done') ซึ่งตายตัวทั้งระบบ
-- อยากเพิ่มขั้นตอนอย่าง 'รอรีวิว' ต้องแก้ enum ซึ่งกระทบทุกโปรเจกต์พร้อมกัน
-- และคนละโปรเจกต์อาจมีขั้นตอนไม่เหมือนกัน
--
-- ย้ายไปเป็นตาราง project_task_columns แทน แต่ละโปรเจกต์กำหนดเองได้
--
-- ⚠️ migration นี้ลบคอลัมน์ status ทิ้งหลัง backfill เสร็จ
-- ต้องรันคู่กับโค้ดชุดใหม่ ถ้ารันแล้วหน้าเว็บยังเป็นโค้ดเก่าจะพัง
-- (dev server ให้รีสตาร์ตหลังรัน)
-- ============================================================================

-- ---------- ตารางคอลัมน์ ----------
create table if not exists public.project_task_columns (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,
  -- ชื่อสีแบบ token ไม่ใช่ค่าสีจริง เพื่อให้เปลี่ยนธีมทีเดียวได้ทั้งเว็บ
  color      text not null default 'slate'
             check (color in ('slate', 'amber', 'jade', 'sky', 'violet', 'coral')),
  -- คอลัมน์ที่ถือว่างานจบแล้ว ใช้ตัดสินว่าจะขีดฆ่าและไม่นับว่าเลยกำหนด
  -- เป็น boolean ไม่ใช่ "คอลัมน์สุดท้าย" เพราะบางบอร์ดมี 'ยกเลิก' ต่อท้าย
  is_done    boolean not null default false,
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists project_task_columns_project_idx
  on public.project_task_columns (project_id, sort);

-- ---------- คอลัมน์เริ่มต้นให้โปรเจกต์ที่มีอยู่แล้ว ----------
insert into public.project_task_columns (project_id, name, color, is_done, sort)
select p.id, c.name, c.color, c.is_done, c.sort
from public.projects p
cross join (values
  ('รอทำ',      'slate', false, 1),
  ('กำลังทำ',   'amber', false, 2),
  ('เสร็จแล้ว', 'jade',  true,  3)
) as c(name, color, is_done, sort)
on conflict (project_id, name) do nothing;

-- ---------- ผูกงานเข้ากับคอลัมน์ ----------
alter table public.project_tasks
  add column if not exists column_id uuid references public.project_task_columns (id) on delete restrict;

update public.project_tasks t
set column_id = c.id
from public.project_task_columns c
where c.project_id = t.project_id
  and t.column_id is null
  and c.name = case t.status
        when 'todo'  then 'รอทำ'
        when 'doing' then 'กำลังทำ'
        when 'done'  then 'เสร็จแล้ว'
      end;

-- ต้องมีคอลัมน์เสมอ ไม่งั้นงานจะหลุดออกจากบอร์ดโดยไม่มีใครเห็น
alter table public.project_tasks
  alter column column_id set not null;

create index if not exists project_tasks_column_idx
  on public.project_tasks (column_id, sort);

-- ---------- เลิกใช้ status ----------
-- ลบทิ้งเลยแทนที่จะเก็บไว้เฉย ๆ เพราะการมีสองแหล่งความจริงที่ไม่มีใคร sync
-- คือบั๊กที่รอเกิด วันหนึ่งจะมีคนอ่าน status แล้วได้ค่าที่ไม่ตรงกับบอร์ด
alter table public.project_tasks drop column if exists status;
drop type if exists public.task_status;

-- ---------- โปรเจกต์ใหม่ได้คอลัมน์เริ่มต้นอัตโนมัติ ----------
create or replace function public.seed_task_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_task_columns (project_id, name, color, is_done, sort)
  values
    (new.id, 'รอทำ',      'slate', false, 1),
    (new.id, 'กำลังทำ',   'amber', false, 2),
    (new.id, 'เสร็จแล้ว', 'jade',  true,  3)
  on conflict (project_id, name) do nothing;
  return new;
end $$;

drop trigger if exists projects_seed_columns on public.projects;
create trigger projects_seed_columns after insert on public.projects
  for each row execute function public.seed_task_columns();

-- ---------- RLS ----------
alter table public.project_task_columns enable row level security;

drop policy if exists task_columns_read on public.project_task_columns;
create policy task_columns_read on public.project_task_columns
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists task_columns_write on public.project_task_columns;
create policy task_columns_write on public.project_task_columns
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
select p.slug, c.name, c.color, c.is_done, c.sort,
       (select count(*) from public.project_tasks t where t.column_id = c.id) as จำนวนงาน
from public.project_task_columns c
join public.projects p on p.id = c.project_id
order by p.slug, c.sort;


-- ############################################################################
-- >>> 0006_profiles_assignee.sql
-- ############################################################################

-- ============================================================================
-- 0006_profiles_assignee — โปรไฟล์ผู้ใช้ + มอบหมายงานให้คนในโปรเจกต์
--
-- ปัญหาที่ต้องแก้ก่อน:
--   ตาราง auth.users ฝั่งเบราว์เซอร์อ่านไม่ได้ (Supabase ปิดไว้โดยตั้งใจ)
--   เรารู้แค่ user_id เป็นรหัสยาว ๆ เลยแสดงชื่อคนไม่ได้เลย
--   ต้องมีตาราง profiles ใน schema public ที่คัดลอกเฉพาะข้อมูลที่แสดงได้
-- ============================================================================

-- ---------- โปรไฟล์ ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ---------- สร้างโปรไฟล์อัตโนมัติตอนมีคนล็อกอินครั้งแรก ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Google ส่งชื่อมาใน full_name บางเคสใช้ name ถ้าไม่มีเลยใช้ชื่อหน้า @
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email      = excluded.email,
    -- ไม่ทับชื่อที่เจ้าตัวตั้งเอง ถ้าเคยตั้งไว้แล้ว
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- เติมโปรไฟล์ให้คนที่ล็อกอินไปแล้วก่อนหน้านี้
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ---------- ใครเห็นโปรไฟล์ใครได้ ----------
-- security definer เพื่อกัน recursion ตอน policy เรียก project_members
create or replace function public.shares_project_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on b.project_id = a.project_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

alter table public.profiles enable row level security;

-- เห็นได้เฉพาะตัวเองกับคนที่อยู่โปรเจกต์เดียวกัน
-- ไม่เปิดให้คนล็อกอินคนไหนก็ได้อ่าน เพราะในนี้มีอีเมลจริงของทุกคน
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_project_with(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- มอบหมายงาน ----------
alter table public.project_tasks
  add column if not exists assignee_id uuid references auth.users (id) on delete set null;

create index if not exists project_tasks_assignee_idx
  on public.project_tasks (project_id, assignee_id);

-- กันมอบหมายให้คนนอกโปรเจกต์
-- ใช้ trigger เพราะ CHECK constraint ของ Postgres ใส่ subquery ไม่ได้
create or replace function public.check_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.project_members m
    where m.project_id = new.project_id and m.user_id = new.assignee_id
  ) then
    raise exception 'มอบหมายงานให้คนที่ไม่ได้อยู่ในโปรเจกต์นี้ไม่ได้';
  end if;
  return new;
end $$;

drop trigger if exists project_tasks_check_assignee on public.project_tasks;
create trigger project_tasks_check_assignee
  before insert or update of assignee_id, project_id on public.project_tasks
  for each row execute function public.check_task_assignee();

-- ---------- ตรวจผล ----------
select p.display_name, p.email, p.avatar_url is not null as มีรูป
from public.profiles p;


-- ############################################################################
-- >>> 0007_profile_relations.sql
-- ############################################################################

-- ============================================================================
-- 0007_profile_relations — ผูก project_members กับ profiles ให้ join ได้
--
-- อาการ: PostgREST ตอบว่า
--   "Could not find a relationship between 'project_members' and 'profiles'"
--
-- สาเหตุ: ทั้งสองตารางชี้ไป auth.users คนละทาง
--   project_members.user_id -> auth.users.id
--   profiles.id             -> auth.users.id
-- ไม่มี foreign key ระหว่างกันเอง PostgREST จึงไม่รู้ว่าจะ join ด้วยคีย์ไหน
-- (มันอ่านความสัมพันธ์จาก foreign key เท่านั้น ไม่ได้เดาจากชื่อคอลัมน์)
--
-- วิธีแก้: ย้ายให้ชี้มาที่ profiles แทน auth.users
-- ห่วงโซ่จะกลายเป็น auth.users -> profiles -> project_members
-- ลบผู้ใช้แล้วยัง cascade ครบเหมือนเดิม แต่ join ได้ด้วย
-- ============================================================================

-- ---------- project_members ----------
alter table public.project_members
  drop constraint if exists project_members_user_id_fkey;

alter table public.project_members
  add constraint project_members_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------- project_tasks.assignee_id ----------
-- ผูกกับ profiles ด้วยเหตุผลเดียวกัน จะได้ดึงชื่อคนรับผิดชอบมาพร้อมงานได้
alter table public.project_tasks
  drop constraint if exists project_tasks_assignee_id_fkey;

alter table public.project_tasks
  add constraint project_tasks_assignee_id_fkey
  foreign key (assignee_id) references public.profiles (id) on delete set null;

-- ---------- project_invites.used_by ----------
alter table public.project_invites
  drop constraint if exists project_invites_used_by_fkey;

alter table public.project_invites
  add constraint project_invites_used_by_fkey
  foreign key (used_by) references public.profiles (id) on delete set null;

-- ---------- app_admins ----------
alter table public.app_admins
  drop constraint if exists app_admins_user_id_fkey;

alter table public.app_admins
  add constraint app_admins_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------- ตรวจผล ----------
-- ควรได้ 1 แถวต่อสมาชิก 1 คน พร้อมชื่อที่ไม่ใช่ null
select p.slug, pr.display_name, pr.email, m.role
from public.project_members m
join public.projects p  on p.id  = m.project_id
join public.profiles pr on pr.id = m.user_id
order by p.slug;


-- ############################################################################
-- >>> 0008_invites.sql
-- ############################################################################

-- ============================================================================
-- 0008_invites — ลิงก์เชิญเข้าโปรเจกต์
--
-- โจทย์: คนที่ถูกเชิญยังไม่ได้อยู่ในโปรเจกต์
--   - อ่านตาราง project_invites ไม่ได้ (0001 เปิด RLS แล้วไม่ใส่ policy เลย)
--   - เพิ่มตัวเองเข้า project_members ไม่ได้ (0003 ให้เฉพาะเจ้าของเขียน)
--   ซึ่งถูกต้องแล้ว ไม่ควรผ่อน
--
-- ทางออก: ทำเป็นฟังก์ชัน security definer สองตัว
--   peek_project_invite   ดูว่าลิงก์นี้เชิญเข้าโปรเจกต์อะไร (ยังไม่ล็อกอินก็เรียกได้)
--   redeem_project_invite แลกลิงก์เป็นสมาชิก (ต้องล็อกอินแล้ว)
-- ฟังก์ชันเป็นประตูแคบ ๆ ที่เราคุมเงื่อนไขได้เอง ต่างจากการเปิด policy ทั้งตาราง
-- ============================================================================

-- ---------- รองรับลิงก์ใช้ได้หลายครั้ง ----------
-- เชิญลูกค้ารายเดียวใช้ครั้งเดียวพอ แต่เชิญน้อง ๆ ทั้งทีมอยากส่งลิงก์เดียว
alter table public.project_invites
  add column if not exists max_uses int default 1 check (max_uses is null or max_uses > 0);

alter table public.project_invites
  add column if not exists use_count int not null default 0 check (use_count >= 0);

comment on column public.project_invites.max_uses is 'null = ใช้ได้ไม่จำกัด';
comment on column public.project_invites.used_at is 'ครั้งล่าสุดที่ถูกใช้';
comment on column public.project_invites.used_by is 'คนล่าสุดที่ใช้';

-- ---------- เจ้าของจัดการลิงก์ของโปรเจกต์ตัวเองได้ ----------
drop policy if exists invites_manage_owner on public.project_invites;
create policy invites_manage_owner on public.project_invites
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ดูว่าลิงก์นี้คืออะไร ----------
-- ต้องเรียกได้ตั้งแต่ยังไม่ล็อกอิน เพราะคนกดลิงก์มาต้องเห็นก่อนว่าจะเข้าอะไร
-- ก่อนตัดสินใจล็อกอิน — คืนแค่ชื่อโปรเจกต์กับสถานะ ไม่คืนอะไรที่เป็นความลับ
create or replace function public.peek_project_invite(p_token text)
returns table (project_name text, member_role public.project_role, valid boolean, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inv public.project_invites;
  v_name text;
begin
  select * into v_inv from public.project_invites where token = p_token;

  if not found then
    return query select null::text, null::public.project_role, false, 'ลิงก์เชิญไม่ถูกต้อง'::text;
    return;
  end if;

  select p.name into v_name from public.projects p where p.id = v_inv.project_id;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return query select v_name, v_inv.role, false, 'ลิงก์เชิญหมดอายุแล้ว'::text;
    return;
  end if;

  if v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then
    return query select v_name, v_inv.role, false, 'ลิงก์เชิญนี้ถูกใช้ครบจำนวนแล้ว'::text;
    return;
  end if;

  return query select v_name, v_inv.role, true, null::text;
end $$;

grant execute on function public.peek_project_invite(text) to anon, authenticated;

-- ---------- แลกลิงก์เป็นสมาชิก ----------
create or replace function public.redeem_project_invite(p_token text)
returns table (slug text, project_name text, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.project_invites;
  v_uid uuid := auth.uid();
  v_already boolean;
begin
  if v_uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนถึงจะเข้าร่วมโปรเจกต์ได้';
  end if;

  select * into v_inv from public.project_invites where token = p_token;
  if not found then
    raise exception 'ลิงก์เชิญไม่ถูกต้อง';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    raise exception 'ลิงก์เชิญหมดอายุแล้ว';
  end if;

  select exists (
    select 1 from public.project_members m
    where m.project_id = v_inv.project_id and m.user_id = v_uid
  ) into v_already;

  -- กดลิงก์ซ้ำไม่ควรพัง และไม่ควรกินโควตาการใช้งานเพิ่ม
  if not v_already then
    if v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then
      raise exception 'ลิงก์เชิญนี้ถูกใช้ครบจำนวนแล้ว';
    end if;

    insert into public.project_members (project_id, user_id, role)
    values (v_inv.project_id, v_uid, v_inv.role);

    update public.project_invites
    set use_count = use_count + 1, used_at = now(), used_by = v_uid
    where token = p_token;
  end if;

  return query
    select p.slug, p.name, v_already
    from public.projects p
    where p.id = v_inv.project_id;
end $$;

grant execute on function public.redeem_project_invite(text) to authenticated;

-- ---------- ตรวจผล ----------
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('peek_project_invite', 'redeem_project_invite');


