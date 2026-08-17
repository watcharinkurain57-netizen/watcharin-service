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
