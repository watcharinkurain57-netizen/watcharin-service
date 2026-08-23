-- ============================================================================
-- 0021_diagram_groups — หมวดของไดอะแกรม
--
-- 0020 เก็บผังเป็นรายการแบนราบ ซึ่งพอสำหรับสามสี่ผัง
-- แต่โปรเจกต์โรงงานหนึ่งงานมีผังคนละชั้นกันหลายกอง:
--   ฝั่งหน้างาน (PLC / เครือข่าย / ตู้คอนโทรล) · ฝั่งซอฟต์แวร์ (API / ตาราง / สถานะ)
--   ฝั่งกระบวนการ (ขั้นตอนการทำงานของคน)
-- พอกองรวมกันเป็นแถวเดียว การหาผังที่ต้องการกลายเป็นการไล่อ่านชื่อทีละอัน
--
-- ---------------------------------------------------------------------------
-- ทำไมเป็นตารางแยก ไม่ใช่คอลัมน์ category เก็บชื่อหมวดเป็นข้อความ
--
-- เหตุผลเดียวกับที่ 0010 เลือกทำโฟลเดอร์เป็นตาราง:
--   - หมวดว่างไม่มีตัวตน ตั้งไว้ล่วงหน้าไม่ได้ ต้องมีผังก่อนหมวดถึงจะเกิด
--   - เปลี่ยนชื่อหมวด = ไล่ UPDATE ทุกแถวที่เขียนชื่อนั้นไว้
--   - พิมพ์ชื่อหมวดผิดตัวเดียวได้หมวดใหม่ทันทีโดยไม่มีอะไรเตือน
--
-- ---------------------------------------------------------------------------
-- ทำไมเป็นหมวดแบน ไม่ใช่โฟลเดอร์ซ้อนชั้นแบบ 0010
--
-- ไฟล์ส่งมอบมีเป็นร้อย และมีลำดับชั้นตามธรรมชาติ (งวด 3 / คู่มือ / ภาพ)
-- ส่วนผังต่อโปรเจกต์อยู่ในหลักสิบ ซึ่งชั้นเดียวพอและอ่านง่ายกว่า
-- ลำดับชั้นที่ลึกเกินความจำเป็นทำให้ต้องกดเข้าออกเพื่อหาของที่มองเห็นอยู่แล้ว
-- (ถ้าวันหนึ่งผังเกินหลักร้อยค่อยว่ากันใหม่ — ตอนนั้นเพิ่ม parent_id ก็ยังทัน)
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_diagram_groups (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),

  -- ใช้ชุดสีเดียวกับคอลัมน์งาน (0005) และหมวดงาน (0014)
  -- เพื่อให้ทั้งแอปพูดภาษาสีเดียวกัน ไม่ใช่แต่ละแท็บมีจานสีของตัวเอง
  color      text not null default 'slate'
             check (color in ('slate', 'amber', 'jade', 'sky', 'violet', 'coral')),

  sort       int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists project_diagram_groups_project_idx
  on public.project_diagram_groups (project_id, sort);

-- ---------- ผูกผังเข้าหมวด ----------
-- ⚠️ `on delete set null` ไม่ใช่ cascade — ลบหมวดต้องไม่ลบผังข้างในทิ้ง
--
-- เหตุผลเดียวกับ group_id ของงานใน 0014: หมวดเป็นของเสริม
-- ผังที่ยังไม่จัดหมวดต้องมีอยู่ได้ตามปกติ (โผล่ใต้ "ไม่มีหมวด")
-- และการลบหมวดคือการเลิกใช้ป้าย ไม่ใช่การทิ้งงานที่วาดไว้
alter table public.project_diagrams
  add column if not exists group_id uuid references public.project_diagram_groups (id) on delete set null;

create index if not exists project_diagrams_group_idx
  on public.project_diagrams (project_id, group_id, sort);

-- ---------- กันผูกข้ามโปรเจกต์ ----------
-- RLS กันคนนอกได้ แต่ไม่ได้กันเจ้าของโปรเจกต์ A ที่ส่ง group_id ของโปรเจกต์ B มา
-- CHECK ใส่ subquery ไม่ได้ จึงใช้ trigger แบบเดียวกับ 0006 / 0010 / 0014 / 0019
create or replace function public.check_diagram_group_same_project()
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

  select project_id into v_project from public.project_diagram_groups where id = new.group_id;

  if v_project is distinct from new.project_id then
    raise exception 'ย้ายผังเข้าหมวดของโปรเจกต์อื่นไม่ได้';
  end if;

  return new;
end $$;

drop trigger if exists project_diagrams_check_group on public.project_diagrams;
create trigger project_diagrams_check_group
  before insert or update of group_id, project_id on public.project_diagrams
  for each row execute function public.check_diagram_group_same_project();

-- ---------- RLS ----------
-- ตรงกับ project_diagrams ใน 0020 — อ่าน = คนในโปรเจกต์ · เขียน = เจ้าของ
-- ถ้าสองที่ไม่ตรงกันจะได้อาการงง ๆ แบบ "เห็นผังแต่ไม่รู้ว่าอยู่หมวดอะไร"
alter table public.project_diagram_groups enable row level security;

drop policy if exists diagram_groups_read on public.project_diagram_groups;
create policy diagram_groups_read on public.project_diagram_groups
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists diagram_groups_write on public.project_diagram_groups;
create policy diagram_groups_write on public.project_diagram_groups
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ไม่ seed หมวดเริ่มต้นให้ ----------
-- เหตุผลเดียวกับ 0014: หมวดของผังเป็นเรื่องเฉพาะโปรเจกต์
-- เดาแทนเจ้าของแล้วผิดแน่ ปล่อยว่างไว้ให้ตั้งเองตอนที่รู้ว่าจะแบ่งยังไง

-- ---------- ตรวจผล ----------
-- ⚠️ ช่องที่ต้องดูให้ดีที่สุดคือ ลบหมวดแล้วผัง ต้องเป็น SET NULL
--    ถ้าขึ้น CASCADE คือผิด ลบหมวดทีเดียวผังที่วาดไว้หายหมด
select
  (select rc.delete_rule
     from information_schema.referential_constraints rc
     join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
    where k.table_name = 'project_diagrams' and k.column_name = 'group_id')                    as ลบหมวดแล้วผัง,
  (select relrowsecurity from pg_class
    where oid = 'public.project_diagram_groups'::regclass)                                     as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_diagram_groups')                      as จำนวนpolicy,
  (select count(*) from pg_trigger where tgname = 'project_diagrams_check_group')              as จำนวนtrigger,
  (select count(*) from public.project_diagram_groups)                                         as จำนวนหมวดตอนนี้;
