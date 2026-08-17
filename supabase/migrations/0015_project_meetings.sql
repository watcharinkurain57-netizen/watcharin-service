-- ============================================================================
-- 0015_project_meetings — ตารางประชุมของโปรเจกต์
--
-- เจ้าของบอกว่างานจริงคุยกันผ่าน Meet มากกว่าพิมพ์แชท (5 คน แชร์จอ โน้ตบุ๊กทั้งหมด)
-- แท็บคุยงานจึงต้องมีที่นัดประชุมและเก็บลิงก์ห้อง ไม่ใช่มีแต่ข้อความ
--
-- ---------------------------------------------------------------------------
-- ทำไมเก็บแค่ลิงก์ ไม่ต่อ Google Calendar API
--
-- การให้ระบบสร้างลิงก์ Meet เองต้องใช้ scope calendar.events ซึ่ง Google
-- จัดเป็น sensitive — ต้องตั้ง OAuth consent screen เพิ่มและอาจต้องยื่นให้ตรวจสอบแอป
-- แลกกับการประหยัดการกดสองครั้ง ยังไม่คุ้มตอนนี้
--
-- meet_url จึงเป็น text ธรรมดา ไม่ผูกกับ Google โดยเฉพาะ
-- วันหน้าจะเปลี่ยนไปใช้ Zoom / Teams / Jitsi ก็แค่วางลิงก์อื่น ไม่ต้องแก้อะไร
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_meetings (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,

  title      text not null check (length(btrim(title)) > 0 and length(title) <= 200),

  -- timestamptz ไม่ใช่ date เพราะประชุมมีเวลา และคนอาจอยู่คนละโซนเวลา
  -- (ต่างจาก due_on ของงานที่เป็น date เพราะกำหนดส่งไม่มีเวลาแน่นอน)
  starts_at  timestamptz not null,
  minutes    int not null default 60 check (minutes > 0 and minutes <= 1440),

  -- ยอมให้ว่างได้ เพราะบางทีนัดเวลาไว้ก่อนแล้วค่อยเปิดห้องตอนใกล้ถึง
  -- บังคับ https เพื่อกันคนวางข้อความมั่ว ๆ แล้วปุ่มพาไปที่แปลก ๆ
  meet_url   text check (meet_url is null or meet_url ~ '^https://'),

  note       text,

  -- ⚠️ ชี้ public.profiles ไม่ใช่ auth.users — บทเรียนจาก 0013
  -- ถ้าชี้ auth.users แล้ว PostgREST จะ embed profiles(...) ไม่ได้
  -- และหน้าเว็บต้องโชว์ว่าใครเป็นคนนัด
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- เรียงตามเวลาเสมอ ทำ index ให้ตรงกับที่ query จริง
create index if not exists project_meetings_project_idx
  on public.project_meetings (project_id, starts_at);

-- ---------- RLS ----------
-- ลอกแบบ project_comments ใน 0012 ไม่ใช่แบบ project_payments
-- เพราะการนัดประชุมเป็นเรื่องที่ทั้งสองฝ่ายทำได้ เหมือนการพิมพ์คุย
-- ลูกค้าที่อยากนัดคุยงานต้องนัดเองได้ ไม่ต้องรอเจ้าของว่าง
alter table public.project_meetings enable row level security;

drop policy if exists project_meetings_read on public.project_meetings;
create policy project_meetings_read on public.project_meetings
  for select to authenticated
  using (public.is_project_member(project_id));

-- เขียนได้ทุกคนในโปรเจกต์ แต่ต้องเขียนในนามตัวเอง (กันสวมชื่อคนอื่น)
drop policy if exists project_meetings_insert on public.project_meetings;
create policy project_meetings_insert on public.project_meetings
  for insert to authenticated
  with check (public.is_project_member(project_id) and created_by = auth.uid());

-- แก้ได้เฉพาะนัดที่ตัวเองตั้ง หรือเจ้าของโปรเจกต์
-- (เจ้าของต้องเลื่อนนัดที่ลูกค้าตั้งไว้ได้ ไม่งั้นต้องไล่ขอให้เขาแก้)
drop policy if exists project_meetings_update on public.project_meetings;
create policy project_meetings_update on public.project_meetings
  for update to authenticated
  using (created_by = auth.uid() or public.is_project_owner(project_id))
  with check (public.is_project_member(project_id));

drop policy if exists project_meetings_delete on public.project_meetings;
create policy project_meetings_delete on public.project_meetings
  for delete to authenticated
  using (created_by = auth.uid() or public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: RLS เปิด · policy 4 บรรทัด · created_by ชี้ profiles (ไม่ใช่ users)
--            · และ CHECK ของ meet_url ทำงาน (https ผ่าน / http ไม่ผ่าน)
select
  (select relrowsecurity from pg_class where oid = 'public.project_meetings'::regclass) as เปิดRLS,
  (select string_agg(cmd, ' ' order by cmd) from pg_policies
    where schemaname = 'public' and tablename = 'project_meetings')                     as policyที่มี,
  (select ccu.table_name
     from information_schema.table_constraints tc
     join information_schema.key_column_usage k on k.constraint_name = tc.constraint_name
     join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
    where tc.constraint_type = 'FOREIGN KEY' and k.table_name = 'project_meetings'
      and k.column_name = 'created_by')                                                 as createdByชี้ไปตาราง,
  ('https://meet.google.com/abc-defg-hij' ~ '^https://')                                as httpsผ่าน,
  ('http://meet.google.com/abc' ~ '^https://')                                          as httpไม่ผ่าน;
