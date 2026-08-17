-- ============================================================================
-- 0009_file_storage — อัปโหลดไฟล์ส่งมอบจริงผ่าน Supabase Storage
--
-- 0002 สร้างคอลัมน์ storage_path ทิ้งไว้แล้วแต่ยังไม่มี bucket
-- แถวไฟล์ที่มีอยู่ตอนนี้จึงเป็นแค่ชื่อเปล่า ๆ กดโหลดไม่ได้
--
-- รอบนี้ต่อของจริง: bucket + policy + คอลัมน์ที่ขาด
--
-- ---------------------------------------------------------------------------
-- เรื่องสำคัญที่สุดของไฟล์นี้: bucket ต้องเป็น private
--
-- ไฟล์ในนี้คือของส่งมอบของลูกค้าแต่ละราย ไม่ใช่รูปประกอบเว็บ
-- bucket แบบ public = ใครรู้ URL ก็โหลดได้ ไม่มี RLS มาเกี่ยวเลย
-- และ URL ของ Storage เดาได้ตรง ๆ จาก path ไม่ได้สุ่ม
-- จึงต้องเป็น private แล้วให้หน้าเว็บขอ signed URL อายุสั้น ๆ ตอนกดโหลด
-- ซึ่งตัวออก signed URL จะไปเช็ค policy ข้างล่างนี้ให้อีกที
-- ---------------------------------------------------------------------------
-- ============================================================================

-- ---------- คอลัมน์ที่ขาดของ project_files ----------
alter table public.project_files
  add column if not exists mime_type text;

-- เก็บว่าใครอัป ไว้ตอบตัวเองทีหลังว่าไฟล์นี้มาจากไหน
-- on delete set null เพราะไฟล์ต้องไม่หายตามคนที่ลบบัญชีไป
--
-- default auth.uid() = หน้าเว็บไม่ต้องส่งค่านี้มาเอง ฐานข้อมูลรู้อยู่แล้วว่าใครยิงมา
-- ค่าที่หน้าเว็บส่งมาเชื่อไม่ได้อยู่ดี ให้ Postgres เป็นคนตอบดีกว่า
-- (รันจาก SQL editor จะได้ null ซึ่งถูกแล้ว เพราะไม่ได้มาจากผู้ใช้คนไหน)
alter table public.project_files
  add column if not exists uploaded_by uuid default auth.uid() references auth.users (id) on delete set null;

-- กันแถวสองแถวชี้ไฟล์เดียวกัน — ลบแถวหนึ่งแล้วอีกแถวจะชี้ของที่หายไปแล้ว
-- ใช้ partial index เพราะแถวเก่าที่ยังไม่มีไฟล์จริงเป็น null และ null ซ้ำกันได้
create unique index if not exists project_files_storage_path_key
  on public.project_files (storage_path)
  where storage_path is not null;

-- ---------- bucket ----------
-- ตั้งผ่าน SQL เพื่อให้ dev กับ prod ได้ค่าเดียวกันโดยไม่ต้องไปกดใน dashboard ทีละตัว
--
-- file_size_limit 50 MB — ใหญ่พอสำหรับ PDF/ZIP ที่ส่งมอบกันจริง
-- ถ้าไฟล์ใหญ่กว่านี้ Storage จะปฏิเสธเองตั้งแต่ฝั่งเซิร์ฟเวอร์
-- (หน้าเว็บเช็คขนาดก่อนอัปด้วย แต่นั่นเป็นแค่ความสุภาพ ของจริงกันตรงนี้)
--
-- allowed_mime_types เป็น null = รับทุกชนิด ตั้งใจ
-- ไฟล์ส่งมอบมีตั้งแต่ pdf, xlsx, dwg, zip, ไฟล์โปรเจกต์ PLC — ตั้งรายการไว้มีแต่จะตกหล่น
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-files', 'project-files', false, 52428800)
on conflict (id) do update set
  public          = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- ---------- แปลง path เป็น project_id ----------
-- ข้อตกลงเรื่อง path: {project_id}/{uuid}-{ชื่อไฟล์แบบ ascii}
-- โฟลเดอร์แรกคือ project_id เสมอ สิทธิ์ทั้งหมดอ่านจากตรงนั้น
--
-- ⚠️ ต้องไม่ throw เด็ดขาด เพราะฟังก์ชันนี้ถูกเรียกจาก policy
-- ถ้ามีไฟล์ path แปลก ๆ หลุดเข้ามาแล้วฟังก์ชัน cast พัง
-- policy จะ error ทั้งตาราง = คนอื่นพลอยใช้ Storage ไม่ได้ไปด้วย
-- จึงเช็ครูปแบบ uuid ก่อนแล้วคืน null ถ้าไม่ตรง (null → is_project_member ได้ false)
create or replace function public.storage_project_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(object_name, '/', 1)
         ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(object_name, '/', 1)::uuid
  end;
$$;

-- ---------- ใครทำอะไรกับไฟล์ได้ ----------
-- อ่าน = คนในโปรเจกต์ (ลูกค้าต้องโหลดของที่ส่งมอบให้ตัวเองได้)
-- เขียน/ลบ = เจ้าของโปรเจกต์ เท่านั้น
--
-- ตรงกับ policy ของตาราง project_files ใน 0002 เป๊ะ ๆ ตั้งใจให้ตรงกัน
-- ถ้าสองที่นี้ไม่ตรงกันจะเกิดอาการงง ๆ แบบ "เห็นชื่อไฟล์แต่โหลดไม่ได้"
drop policy if exists project_files_storage_read on storage.objects;
create policy project_files_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_project_member(public.storage_project_id(name))
  );

drop policy if exists project_files_storage_insert on storage.objects;
create policy project_files_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'project-files'
    and public.is_project_owner(public.storage_project_id(name))
  );

drop policy if exists project_files_storage_update on storage.objects;
create policy project_files_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_project_owner(public.storage_project_id(name))
  )
  with check (
    bucket_id = 'project-files'
    and public.is_project_owner(public.storage_project_id(name))
  );

drop policy if exists project_files_storage_delete on storage.objects;
create policy project_files_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and public.is_project_owner(public.storage_project_id(name))
  );

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น:
--   1) bucket project-files · เป็น private (public = false) · จำกัด 50 MB
--   2) policy 4 บรรทัด (read / insert / update / delete)
--   3) แปลง path ถูก 4 เคส: ปกติ · ไม่ใช่ uuid · ไม่มีโฟลเดอร์ · ว่าง
select id, public as เปิดสาธารณะ, file_size_limit as จำกัดขนาด
from storage.buckets
where id = 'project-files';

select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'project_files_storage%'
order by policyname;

select
  public.storage_project_id('123e4567-e89b-12d3-a456-426614174000/abc-doc.pdf') as ปกติ,
  public.storage_project_id('ไม่ใช่ยูยูไอดี/doc.pdf')                            as ไม่ใช่uuid,
  public.storage_project_id('doc.pdf')                                          as ไม่มีโฟลเดอร์,
  public.storage_project_id('')                                                 as ว่าง;
