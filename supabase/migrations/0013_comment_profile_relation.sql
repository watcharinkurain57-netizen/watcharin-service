-- ============================================================================
-- 0013_comment_profile_relation — ผูก project_comments กับ profiles ให้ join ได้
--
-- อาการ (เจอตอนเปิดแท็บคุยงานครั้งแรกหลังรัน 0012):
--   "Could not find a relationship between 'project_comments' and 'profiles'
--    in the schema cache"
--
-- สาเหตุ: เป็นกับดักตัวเดียวกับที่ 0007 เคยแก้ให้ project_members มาแล้ว
--   project_comments.author_id -> auth.users.id
--   profiles.id                -> auth.users.id
-- ทั้งคู่ชี้ไป auth.users คนละทาง ไม่มี foreign key ระหว่างกันเอง
-- PostgREST จึงไม่รู้ว่าจะ join ด้วยคีย์ไหน (มันอ่านจาก foreign key เท่านั้น
-- ไม่ได้เดาจากชื่อคอลัมน์) แล้วปฏิเสธ select ที่มี profiles(...) ฝังอยู่
--
-- 0012 เป็นตารางใหม่ที่ลืมทำตามแพตเทิร์นของ 0007 — ไฟล์นี้คือการตามเก็บ
--
-- ⚠️ กฎที่ควรจำ: **ตารางใหม่ทุกตารางที่มีคอลัมน์อ้างถึงผู้ใช้
-- และวันหนึ่งจะต้องดึงชื่อ/รูปมาแสดง ต้องชี้ไป public.profiles ตั้งแต่แรก**
-- ห่วงโซ่จะเป็น auth.users -> profiles -> ตารางนั้น
-- ลบผู้ใช้แล้วยัง cascade ครบเหมือนเดิม แต่ join ได้ด้วย
-- ============================================================================

-- ---------- ตัวที่พังอยู่จริง ----------
alter table public.project_comments
  drop constraint if exists project_comments_author_id_fkey;

-- คง on delete set null ไว้เหมือนเดิม — ลบบัญชีแล้ว profiles หายตาม (cascade)
-- แล้ว author_id กลายเป็น null ข้อความยังอยู่ครบ ตรงตามเจตนาเดิมของ 0012
alter table public.project_comments
  add constraint project_comments_author_id_fkey
  foreign key (author_id) references public.profiles (id) on delete set null;

-- ---------- ตามเก็บให้ตารางที่เพิ่งเพิ่มไปด้วย ----------
-- สองอันนี้ยังไม่มีหน้าจอไหนดึงชื่อคนมาแสดง จึงยังไม่เคยพัง
-- แต่เป็นบั๊กแบบเดียวกันรออยู่ แก้ตอนนี้ถูกกว่ามาไล่หาทีหลัง
alter table public.project_files
  drop constraint if exists project_files_uploaded_by_fkey;

alter table public.project_files
  add constraint project_files_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles (id) on delete set null;

alter table public.project_folders
  drop constraint if exists project_folders_created_by_fkey;

alter table public.project_folders
  add constraint project_folders_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

-- ---------- ตรวจผล ----------
-- ทั้ง 3 แถวต้องขึ้น ตารางอ้างอิง = profiles ไม่ใช่ users
-- ถ้ายังเห็น users แปลว่า constraint เดิมไม่ได้ถูกแทนที่
select
  tc.table_name    as ตาราง,
  kcu.column_name  as คอลัมน์,
  ccu.table_name   as ตารางอ้างอิง,
  rc.delete_rule   as ลบผู้ใช้แล้ว
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
where tc.constraint_type = 'FOREIGN KEY'
  and tc.constraint_name in (
    'project_comments_author_id_fkey',
    'project_files_uploaded_by_fkey',
    'project_folders_created_by_fkey'
  )
order by tc.table_name;
