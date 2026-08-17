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
