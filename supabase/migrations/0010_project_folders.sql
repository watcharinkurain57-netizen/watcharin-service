-- ============================================================================
-- 0010_project_folders — โฟลเดอร์จริงในโปรเจกต์
--
-- 0009 เก็บไฟล์เป็นรายการแบนราบ พอไฟล์เกิน 20 ตัวก็หาไม่เจอแล้ว
-- งานจริงต้องแยก Flow / Diagram / คู่มือ ออกจากกันเป็นสัดส่วน
--
-- ---------------------------------------------------------------------------
-- ทำไมเป็นตารางแยก ไม่ใช่คอลัมน์ text เก็บเส้นทาง
--
-- เก็บเป็น 'Flow/ย่อย' ในคอลัมน์เดียวดูง่ายกว่าตอนเริ่ม แต่:
--   - โฟลเดอร์ว่างไม่มีตัวตน สร้างไว้ล่วงหน้าไม่ได้ ต้องอัปไฟล์ก่อนถึงจะมี
--   - เปลี่ยนชื่อโฟลเดอร์ = ไล่ UPDATE ทุกแถวที่ขึ้นต้นด้วยเส้นทางนั้น
--   - ชื่อโฟลเดอร์ที่มี / อยู่ข้างในทำให้เส้นทางกำกวมทันที
-- ตารางแยกแก้ทั้งสามข้อ และ RLS ก็ลอกแบบเดิมมาได้ตรง ๆ
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_folders (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,

  -- ซ้อนชั้นได้ · null = อยู่ชั้นบนสุดของโปรเจกต์
  -- cascade เพราะลบโฟลเดอร์แม่แล้วโฟลเดอร์ลูกต้องหายตาม
  -- (ไฟล์ข้างในไม่หาย ดูเหตุผลที่ folder_id ข้างล่าง)
  parent_id  uuid references public.project_folders (id) on delete cascade,

  -- ห้ามมี / ในชื่อ ไม่งั้นเส้นทางที่ประกอบขึ้นมาจะกำกวม
  -- ว่าโฟลเดอร์ชื่อ "a/b" หรือ a ที่มีลูกชื่อ b
  name       text not null check (length(btrim(name)) > 0 and name !~ '/'),

  sort       int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

-- ชื่อซ้ำในชั้นเดียวกันไม่ได้ — ต้องแยกสอง index เพราะ null ใน unique index
-- ไม่ถือว่าซ้ำกัน โฟลเดอร์ชั้นบนสุดจึงหลุดกฎถ้าเขียนรวมเป็นอันเดียว
create unique index if not exists project_folders_root_name_key
  on public.project_folders (project_id, lower(name)) where parent_id is null;

create unique index if not exists project_folders_child_name_key
  on public.project_folders (parent_id, lower(name)) where parent_id is not null;

create index if not exists project_folders_project_idx
  on public.project_folders (project_id, parent_id, sort);

-- ---------- ผูกไฟล์เข้าโฟลเดอร์ ----------
-- ⚠️⚠️ ต้องเป็น `on delete set null` ห้ามเป็น cascade เด็ดขาด
--
-- ตั้งใจให้ "ลบโฟลเดอร์ = ลบไฟล์ข้างในถาวร" ตามที่เจ้าของสั่ง
-- แต่ **คนที่ลบต้องเป็นหน้าเว็บ ไม่ใช่ FK** เพราะ Postgres ไม่รู้จัก Storage
-- ถ้าให้ cascade ลบแถวใน project_files ให้เอง ไฟล์จริงจะไม่หายตาม
-- และหน้าเว็บรู้จักไฟล์ผ่านตารางนี้ทางเดียว พอแถวหาย = ไฟล์ค้างกินโควตา
-- ตลอดกาลโดยไม่มีใครมองเห็นและตามลบไม่ได้
--
-- ลำดับที่ถูกอยู่ใน FilesTab.removeFolder: ลบใน Storage ก่อน → ลบแถวไฟล์ → ลบโฟลเดอร์
--
-- set null ที่นี่จึงเป็น **ตาข่ายกันพลาด** ไม่ใช่พฤติกรรมที่ตั้งใจให้ผู้ใช้เห็น
-- ถ้าวันหนึ่งมีทางลบโฟลเดอร์ที่ไม่ผ่านฟังก์ชันนั้น (เช่นลบจาก SQL editor)
-- ไฟล์จะเด้งออกมาอยู่ชั้นบนสุดให้เห็น ดีกว่าหายเงียบพร้อมทิ้งขยะไว้ใน Storage
alter table public.project_files
  add column if not exists folder_id uuid references public.project_folders (id) on delete set null;

create index if not exists project_files_folder_idx
  on public.project_files (project_id, folder_id, sort);

-- ---------- กันข้ามโปรเจกต์ ----------
-- RLS กันคนนอกได้ แต่ไม่ได้กันเจ้าของโปรเจกต์ A ที่ (เผลอหรือจงใจ)
-- ส่งค่า folder_id ของโปรเจกต์ B มา ซึ่งจะทำให้ไฟล์ไปโผล่ผิดที่
-- CHECK ใส่ subquery ไม่ได้ จึงต้องใช้ trigger เหมือนที่ 0006 ทำกับผู้รับผิดชอบงาน
create or replace function public.check_folder_same_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  if new.folder_id is null then
    return new;
  end if;

  select project_id into v_project from public.project_folders where id = new.folder_id;

  if v_project is distinct from new.project_id then
    raise exception 'ย้ายไฟล์เข้าโฟลเดอร์ของโปรเจกต์อื่นไม่ได้';
  end if;

  return new;
end $$;

drop trigger if exists project_files_check_folder on public.project_files;
create trigger project_files_check_folder
  before insert or update of folder_id, project_id on public.project_files
  for each row execute function public.check_folder_same_project();

-- โฟลเดอร์แม่ต้องอยู่โปรเจกต์เดียวกัน ด้วยเหตุผลเดียวกัน
create or replace function public.check_parent_same_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'โฟลเดอร์เป็นแม่ของตัวเองไม่ได้';
  end if;

  select project_id into v_project from public.project_folders where id = new.parent_id;

  if v_project is distinct from new.project_id then
    raise exception 'ย้ายโฟลเดอร์ไปอยู่ใต้โปรเจกต์อื่นไม่ได้';
  end if;

  return new;
end $$;

drop trigger if exists project_folders_check_parent on public.project_folders;
create trigger project_folders_check_parent
  before insert or update of parent_id, project_id on public.project_folders
  for each row execute function public.check_parent_same_project();

-- ---------- RLS ----------
-- ลอกแบบเดียวกับ project_files ใน 0002 เป๊ะ ๆ
-- คนในโปรเจกต์เห็นโครงสร้าง เจ้าของเป็นคนจัด
alter table public.project_folders enable row level security;

drop policy if exists project_folders_read on public.project_folders;
create policy project_folders_read on public.project_folders
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_folders_write on public.project_folders;
create policy project_folders_write on public.project_folders
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: RLS เปิด · policy 2 บรรทัด · trigger 2 ตัว
--            และ folder_id ต้องเป็น SET NULL ไม่ใช่ CASCADE
select
  (select relrowsecurity from pg_class where oid = 'public.project_folders'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_folders')                     as จำนวนpolicy,
  (select count(*) from pg_trigger
    where tgname in ('project_files_check_folder', 'project_folders_check_parent'))    as จำนวนtrigger,
  (select rc.delete_rule
     from information_schema.referential_constraints rc
     join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
    where k.table_name = 'project_files' and k.column_name = 'folder_id')              as ลบโฟลเดอร์แล้วไฟล์;
