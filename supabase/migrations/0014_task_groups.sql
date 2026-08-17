-- ============================================================================
-- 0014_task_groups — หมวดหมู่งานตามเนื้องาน
--
-- 0005 ทำ project_task_columns ไว้แล้ว แต่นั่นคือ **สถานะ** (รอทำ/กำลังทำ/เสร็จ)
-- สิ่งที่ยังขาดคือแกนที่สอง: **เนื้องาน** (การทำงานร่วมกัน / ออกแบบ / ติดตั้ง)
--
-- สองแกนนี้ตัดกัน ไม่ใช่แทนกัน:
--   งาน "Dashboard" อยู่หมวด 'ออกแบบ' และอยู่คอลัมน์ 'กำลังทำ' พร้อมกัน
-- จึงต้องเป็นคนละคอลัมน์ในตาราง ไม่ใช่เอาหมวดไปยัดเป็นคอลัมน์บอร์ดเพิ่ม
-- (ถ้ายัดรวม บอร์ดจะมี 12 คอลัมน์แล้วดูไม่รู้เรื่อง และงานหนึ่งอยู่ได้ที่เดียว)
-- ============================================================================

create table if not exists public.project_task_groups (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),

  -- ใช้ชุดสีเดียวกับคอลัมน์ เพื่อให้ทั้งแท็บงานพูดภาษาสีเดียวกัน
  color      text not null default 'slate'
             check (color in ('slate', 'amber', 'jade', 'sky', 'violet', 'coral')),

  sort       int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists project_task_groups_project_idx
  on public.project_task_groups (project_id, sort);

-- ---------- ผูกงานเข้าหมวด ----------
-- ⚠️ ต่างจาก column_id ตรงที่ **ยอมให้เป็น null** และใช้ on delete set null
--
-- column_id เป็น not null + on delete restrict เพราะงานต้องอยู่บนบอร์ดเสมอ
-- ถ้าไม่มีคอลัมน์ = งานหายไปจากทุกมุมมองโดยไม่มีใครเห็น
--
-- แต่หมวดเป็นของเสริม งานที่ยังไม่จัดหมวดต้องมีอยู่ได้ตามปกติ (โผล่ใต้ "ไม่มีหมวด")
-- และลบหมวดทิ้งไม่ควรถูกบล็อก แค่ให้งานข้างในกลับไปเป็นไม่มีหมวด ไม่มีอะไรหาย
alter table public.project_tasks
  add column if not exists group_id uuid references public.project_task_groups (id) on delete set null;

create index if not exists project_tasks_group_idx
  on public.project_tasks (project_id, group_id, sort);

-- ---------- กันผูกข้ามโปรเจกต์ ----------
-- RLS กันคนนอกได้ แต่ไม่ได้กันเจ้าของโปรเจกต์ A ที่ส่ง group_id ของโปรเจกต์ B มา
-- CHECK ใส่ subquery ไม่ได้ จึงใช้ trigger แบบเดียวกับ 0006 (ผู้รับผิดชอบ) และ 0010 (โฟลเดอร์)
create or replace function public.check_task_group_same_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  if new.group_id is null then
    return new;
  end if;

  select project_id into v_project from public.project_task_groups where id = new.group_id;

  if v_project is distinct from new.project_id then
    raise exception 'ย้ายงานเข้าหมวดของโปรเจกต์อื่นไม่ได้';
  end if;

  return new;
end $$;

drop trigger if exists project_tasks_check_group on public.project_tasks;
create trigger project_tasks_check_group
  before insert or update of group_id, project_id on public.project_tasks
  for each row execute function public.check_task_group_same_project();

-- ---------- RLS ----------
-- ลอกแบบเดียวกับ project_task_columns ใน 0005 เป๊ะ ๆ
alter table public.project_task_groups enable row level security;

drop policy if exists task_groups_read on public.project_task_groups;
create policy task_groups_read on public.project_task_groups
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists task_groups_write on public.project_task_groups;
create policy task_groups_write on public.project_task_groups
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ไม่ seed หมวดเริ่มต้นให้ ----------
-- ต่างจาก 0005 ที่ seed คอลัมน์ 'รอทำ/กำลังทำ/เสร็จแล้ว' ให้ทุกโปรเจกต์
-- เพราะสถานะเป็นเรื่องสากล ทุกโปรเจกต์ใช้ชุดเดียวกันได้
-- แต่หมวดเนื้องานเป็นเรื่องเฉพาะโปรเจกต์ เดาแทนเจ้าของแล้วผิดแน่
-- ปล่อยว่างไว้ ให้เจ้าของตั้งเองตอนที่รู้ว่าจะแบ่งยังไง

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: RLS เปิด · policy 2 บรรทัด · trigger 1 ตัว
--            · group_id เป็น SET NULL (ไม่ใช่ RESTRICT แบบ column_id)
--            · และยังไม่มีหมวดใด ๆ (0 แถว) ซึ่งถูกแล้ว
select
  (select relrowsecurity from pg_class where oid = 'public.project_task_groups'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_task_groups')                     as จำนวนpolicy,
  (select count(*) from pg_trigger where tgname = 'project_tasks_check_group')             as จำนวนtrigger,
  (select rc.delete_rule
     from information_schema.referential_constraints rc
     join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
    where k.table_name = 'project_tasks' and k.column_name = 'group_id')                   as ลบหมวดแล้วงาน,
  (select count(*) from public.project_task_groups)                                        as จำนวนหมวดตอนนี้;
