-- ============================================================================
-- 0019_task_details — รายละเอียดของงาน (มี snippet โค้ดได้) + ไฟล์แนบรายงาน
--
-- จนถึงตอนนี้ "งาน" มีแค่ชื่อบรรทัดเดียว ซึ่งพอสำหรับ to-do แต่ไม่พอสำหรับงานจริง
-- งานอย่าง "จำลองการดึงข้อมูลของ SCADA ผ่าน OPC UA" ต้องพกของมาด้วยเสมอ:
-- endpoint ที่ใช้ · ตัวอย่าง payload · สเปกจากลูกค้า · ภาพหน้าจอตอนพัง
--
-- รอบนี้เติมสองอย่างให้งาน
--   1) description — ข้อความยาว ใส่ snippet โค้ดคั่นเป็นช่วง ๆ ได้
--   2) project_task_files — ไฟล์แนบของ *งานนั้น* คนละกองกับไฟล์ส่งมอบ
--
-- ---------------------------------------------------------------------------
-- ทำไมไฟล์แนบเป็นตารางแยก ไม่ใช่เติม task_id ลงใน project_files
--
-- project_files คือ **ไฟล์ส่งมอบ** ของที่ลูกค้าเปิดแท็บไฟล์มาแล้วเห็นเป็นสารบัญ
-- มีสถานะ delivered/pending และจัดโฟลเดอร์ไว้ให้ดูรู้เรื่อง
-- ส่วนไฟล์แนบในงานเป็น **ของใช้ระหว่างทาง** ภาพหน้าจอตอนบั๊ก ล็อกที่ก๊อปมาแปะ
-- ถ้าเอาสองอย่างมากองรวมกัน สารบัญของส่งมอบจะเละทันทีตั้งแต่งานที่สาม
-- และ "ภาพจอฟ้า.png" จะไปนั่งอยู่ในรายการของที่เราส่งมอบให้ลูกค้า
--
-- ใช้ bucket เดียวกัน (project-files) เพราะ policy ใน 0009 อ่านสิทธิ์จาก
-- โฟลเดอร์แรกของ path ซึ่งเป็น project_id — path ของไฟล์แนบขึ้นต้นเหมือนกัน
-- จึงได้สิทธิ์ที่ถูกต้องมาฟรีโดยไม่ต้องเพิ่ม policy ใหม่ให้มีอะไรต้องดูแลสองที่
-- (ต่างกันแค่ segment ที่สอง: {project_id}/tasks/... ไว้ให้แยกออกตอนเปิดดูใน dashboard)
-- ---------------------------------------------------------------------------
-- ============================================================================

-- ---------- รายละเอียดของงาน ----------
-- เก็บเป็น text ดิบ ไม่ใช่ HTML และไม่ใช่ JSON ของ rich text editor
--
-- หน้าเว็บตีความเองด้วยกฎแคบ ๆ ชุดเดียว (``` = โค้ด, ` = โค้ดในบรรทัด, ** = ตัวหนา)
-- แล้ว render เป็น element ของ React ตรง ๆ ไม่มี dangerouslySetInnerHTML สักที่
-- ข้อความที่ผู้ใช้พิมพ์จึงไม่มีทางกลายเป็น markup ที่รันได้ ไม่ว่าจะพิมพ์อะไรมา
--
-- เก็บดิบยังได้ผลพลอยได้คือ grep หาใน DB ได้ และย้ายไป editor ตัวอื่นวันหลังก็ยังอ่านออก
alter table public.project_tasks
  add column if not exists description text;

-- 20,000 ตัวอักษร ≈ 500 บรรทัดโค้ด — เกินกว่านั้นแปลว่าควรเป็นไฟล์แนบ ไม่ใช่คำอธิบาย
-- กันแถวบวมจากการ paste พลาดทั้งไฟล์ลงช่องคำอธิบาย ซึ่งจะลากให้ทุกมุมมองช้าตามไปด้วย
-- (หน้าเว็บนับให้เห็นตั้งแต่ก่อนกดบันทึก ตรงนี้เป็นด่านสุดท้าย)
do $$ begin
  alter table public.project_tasks
    add constraint project_tasks_description_len check (length(description) <= 20000);
exception when duplicate_object then null; end $$;

-- ---------- ไฟล์แนบของงาน ----------
create table if not exists public.project_task_files (
  id           uuid primary key default gen_random_uuid(),

  -- project_id ซ้ำกับที่ได้จาก task_id อยู่แล้ว แต่ต้องมีของตัวเอง เพราะ
  --   1) policy ต้องตอบให้ได้ว่าไฟล์นี้ของโปรเจกต์ไหน โดยไม่ต้อง join ไปตารางงาน
  --   2) task_id เป็น null ได้ (ดูเหตุผลข้างล่าง) ตอนนั้นยังต้องรู้ว่าไฟล์ของใคร
  project_id   uuid not null references public.projects (id) on delete cascade,

  -- ⚠️⚠️ ต้องเป็น `on delete set null` ห้ามเป็น cascade เด็ดขาด
  --
  -- เหตุผลเดียวกับ folder_id ใน 0010 เป๊ะ ๆ: Postgres ไม่รู้จัก Storage
  -- ถ้าให้ FK ลบแถวให้เอง ไฟล์จริงไม่หายตาม = ค้างกินโควตาตลอดกาล
  -- และหน้าเว็บรู้จักไฟล์ผ่านตารางนี้ทางเดียว พอแถวหายก็ตามลบไม่ได้อีกเลย
  --
  -- ลำดับที่ถูกอยู่ใน TasksTab.removeTask: ลบใน Storage ก่อน → ลบแถวไฟล์ → ลบงาน
  --
  -- set null เป็น **ตาข่ายกันพลาด** ไม่ใช่ทางที่ตั้งใจให้เดิน
  -- ถ้าวันหนึ่งมีใครลบงานโดยไม่ผ่านฟังก์ชันนั้น (เช่นลบจาก SQL editor)
  -- ไฟล์จะเด้งไปโผล่ในแถบ "ไฟล์แนบที่งานถูกลบไปแล้ว" ของแท็บงานให้เจ้าของเห็น
  -- ดีกว่าหายเงียบพร้อมทิ้งขยะไว้ใน Storage
  task_id      uuid references public.project_tasks (id) on delete set null,

  -- ชื่อที่คนอ่าน — ภาษาไทยได้เต็มที่ ส่วน storage_path เป็น ascii ล้วน
  -- (เหตุผลอยู่ใน lib/project-files.ts — ตัวตรวจ key ของ storage-api ไม่รับอักขระไทย)
  name         text not null check (length(btrim(name)) > 0),
  storage_path text not null,
  size_bytes   bigint check (size_bytes >= 0),
  mime_type    text,

  -- default auth.uid() = หน้าเว็บไม่ต้องส่งมาเอง ค่าที่หน้าเว็บส่งมาเชื่อไม่ได้อยู่ดี
  uploaded_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- กันสองแถวชี้ไฟล์เดียวกัน — ลบแถวหนึ่งแล้วอีกแถวจะชี้ของที่หายไปแล้ว
create unique index if not exists project_task_files_storage_path_key
  on public.project_task_files (storage_path);

create index if not exists project_task_files_task_idx
  on public.project_task_files (project_id, task_id, created_at);

-- ---------- กันผูกไฟล์ข้ามโปรเจกต์ ----------
-- RLS กันคนนอกได้ แต่ไม่ได้กันเจ้าของโปรเจกต์ A ที่ส่ง task_id ของโปรเจกต์ B มา
-- ซึ่งจะทำให้ไฟล์ไปโผล่ในงานของโปรเจกต์อื่นทั้งที่ policy ผ่านหมด
-- CHECK ใส่ subquery ไม่ได้ จึงใช้ trigger แบบเดียวกับ 0006 / 0010 / 0014
create or replace function public.check_task_file_same_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project uuid;
begin
  if new.task_id is null then
    return new;
  end if;

  select project_id into v_project from public.project_tasks where id = new.task_id;

  if v_project is distinct from new.project_id then
    raise exception 'แนบไฟล์เข้างานของโปรเจกต์อื่นไม่ได้';
  end if;

  return new;
end $$;

drop trigger if exists project_task_files_check_project on public.project_task_files;
create trigger project_task_files_check_project
  before insert or update of task_id, project_id on public.project_task_files
  for each row execute function public.check_task_file_same_project();

-- ---------- RLS ----------
-- ⚠️ ต้องตรงกับ policy ของ storage.objects ใน 0009 เป๊ะ ๆ
--    อ่าน = คนในโปรเจกต์ · เขียน/ลบ = เจ้าของ
--    ถ้าสองที่ไม่ตรงกันจะได้อาการงง ๆ แบบ "เห็นชื่อไฟล์แต่กดโหลดแล้วไม่มีอะไรเกิดขึ้น"
--
-- และตรงกับ project_tasks ใน 0002 ด้วย เพราะไฟล์แนบเป็นส่วนหนึ่งของงาน
-- ลูกค้าอ่านรายละเอียดงานได้ก็ต้องเปิดไฟล์ที่แนบมากับงานนั้นได้
alter table public.project_task_files enable row level security;

drop policy if exists task_files_read on public.project_task_files;
create policy task_files_read on public.project_task_files
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists task_files_write on public.project_task_files;
create policy task_files_write on public.project_task_files
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น:
--   ช่องลบงานแล้วไฟล์ = SET NULL  ← ถ้าขึ้น CASCADE คือผิด ไฟล์จะค้างใน Storage
--   เปิดRLS = true · จำนวนpolicy = 2 · จำนวนtrigger = 1
--   จำกัดความยาว = true (มี constraint คุมความยาว description แล้ว)
select
  (select rc.delete_rule
     from information_schema.referential_constraints rc
     join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
    where k.table_name = 'project_task_files' and k.column_name = 'task_id')             as ลบงานแล้วไฟล์,
  (select relrowsecurity from pg_class where oid = 'public.project_task_files'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_task_files')                     as จำนวนpolicy,
  (select count(*) from pg_trigger where tgname = 'project_task_files_check_project')     as จำนวนtrigger,
  (select exists (select 1 from pg_constraint where conname = 'project_tasks_description_len')) as จำกัดความยาว;
