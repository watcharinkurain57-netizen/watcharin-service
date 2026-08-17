-- ============================================================================
-- 0016_comment_reads — จำว่าแต่ละคนอ่านห้องแชทถึงไหนแล้ว
--
-- ตั้งแต่ #24 ห้องแชทเป็นแท็บย่อย พอไปอยู่แท็บปฏิทินมันจะถูก unmount
-- ตัวดึงข้อความจึงหยุด และไม่มีอะไรบอกว่ามีคนพิมพ์เข้ามา
--
-- ---------------------------------------------------------------------------
-- ทำไมเก็บลงตาราง ไม่ใช่จำไว้ในหน่วยความจำของหน้าเว็บ
--
-- จำในหน้าเว็บก็ตอบโจทย์ "สลับแท็บแล้วรู้ว่ามีใหม่" ได้เหมือนกัน
-- แต่พอรีเฟรชหรือเปิดจากอีกเครื่อง ตัวนับจะรีเซ็ตเป็นศูนย์ทันที
-- ซึ่งแปลว่า "เปิดมาพรุ่งนี้แล้วรู้ว่าเมื่อวานมีคนทักไว้" ทำไม่ได้เลย
-- ซึ่งเป็นเคสที่มีค่าที่สุดสำหรับพื้นที่ทำงานกับลูกค้า
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_comment_reads (
  project_id   uuid not null references public.projects (id) on delete cascade,

  -- ชี้ public.profiles ไม่ใช่ auth.users ตามบทเรียนจาก 0013
  user_id      uuid not null references public.profiles (id) on delete cascade,

  last_read_at timestamptz not null default now(),

  -- หนึ่งคนต่อหนึ่งโปรเจกต์มีได้แถวเดียว — ใช้เป็นเป้าของ upsert ด้วย
  primary key (project_id, user_id)
);

-- ---------- RLS ----------
-- ต่างจากทุกตารางที่ผ่านมา: นี่เป็นข้อมูล **ส่วนตัวของแต่ละคน**
-- ไม่ใช่ข้อมูลของโปรเจกต์ที่คนในโปรเจกต์เห็นร่วมกัน
-- เจ้าของโปรเจกต์ก็ไม่ควรรู้ว่าลูกค้าเปิดอ่านล่าสุดเมื่อไหร่ (เป็นเรื่องน่าอึดอัด)
-- policy จึงล็อกที่ user_id = auth.uid() ทุกคำสั่ง ไม่มีข้อยกเว้นให้ owner
alter table public.project_comment_reads enable row level security;

drop policy if exists comment_reads_read_own on public.project_comment_reads;
create policy comment_reads_read_own on public.project_comment_reads
  for select to authenticated
  using (user_id = auth.uid());

-- ต้องเป็นคนในโปรเจกต์ด้วย ไม่งั้นคนนอกจะสร้างแถวทิ้งไว้ในโปรเจกต์ที่ไม่เกี่ยวได้
drop policy if exists comment_reads_write_own on public.project_comment_reads;
create policy comment_reads_write_own on public.project_comment_reads
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_project_member(project_id));

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: RLS เปิด · policy 2 บรรทัด · primary key 2 คอลัมน์
--            · user_id ชี้ profiles (ไม่ใช่ users)
select
  (select relrowsecurity from pg_class where oid = 'public.project_comment_reads'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_comment_reads')                     as จำนวนpolicy,
  (select string_agg(a.attname, ', ' order by a.attnum)
     from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = 'public.project_comment_reads'::regclass and i.indisprimary)          as คีย์หลัก,
  (select ccu.table_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name
     join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY' and k.table_name = 'project_comment_reads'
      and k.column_name = 'user_id')                                                        as userIdชี้ไปตาราง;
