-- ============================================================================
-- 0023_project_requests — คำขอเริ่มโปรเจกต์ จากคนที่เพิ่งเข้ามา
--
-- เดิมปุ่ม "เล่าโปรเจกต์ให้ฟัง" พาไปฟอร์มติดต่อที่ส่งอีเมลออกไป
-- รอบนี้เปลี่ยนเป็น: ล็อกอิน → กรอกสองช่อง (ชื่อโปรเจกต์ + เล่าว่าอยากทำอะไร)
-- แล้วเจ้าของเว็บเข้าไปอ่านทีหลัง ค่อยเติมรายละเอียดตอนได้คุยกันจริง
--
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ ทำไมคำขอ **ไม่ใช่** แถวใน projects
--
-- สามข้อ ข้อไหนข้อเดียวก็พอจะเป็นเหตุผลแล้ว:
--
--   1) projects คือคลัง **สาธารณะ** และ is_public มีค่าเริ่มต้นเป็น true
--      คนแปลกหน้ากดส่งคำขอ = โปรเจกต์โผล่ในคลังให้คนทั้งโลกเห็นทันที
--
--   2) trigger claim_new_project (0003) ใส่คนสร้างเป็น **owner** ให้อัตโนมัติ
--      ซึ่งแปลว่าคนที่เพิ่งสมัครได้สิทธิ์เจ้าของโปรเจกต์เต็มใบ — จัดการงาน
--      ไฟล์ งวดจ่าย และเห็นต้นทุน/กำไรที่ 0018 ตั้งใจกันไว้ให้เจ้าของคนเดียว
--
--   3) projects บังคับหลายคอลัมน์ (tagline, status, kind, started_label)
--      ฟอร์มสองช่องเติมให้ไม่ได้ และไม่ควรต้องเติม — คนขอยังไม่รู้ด้วยซ้ำ
--
-- คำขอกับโปรเจกต์จึงเป็นคนละสิ่ง: คำขอคือ "อยากคุย" โปรเจกต์คือ "ตกลงทำแล้ว"
-- การแปลงจากอันแรกเป็นอันหลังเป็นการตัดสินใจของเจ้าของ ไม่ใช่ผลข้างเคียงของปุ่มส่ง
-- ---------------------------------------------------------------------------
--
-- ---------------------------------------------------------------------------
-- ⚠️ ไม่มีคอลัมน์โน้ตภายในในตารางนี้ โดยตั้งใจ
--
-- คนขออ่านแถวของตัวเองได้ (ต้องได้ ไม่งั้นส่งไปแล้วเงียบหาย)
-- ซึ่งแปลว่าอะไรก็ตามที่อยู่ในแถวนี้ คนขอเห็นหมด
-- โน้ตแบบ "เจ้านี้เคยต่อราคาหนัก" จึงห้ามอยู่ที่นี่เด็ดขาด
-- ถ้าวันหนึ่งอยากได้ ให้ทำตารางแยกที่เปิดให้แอดมินคนเดียว
-- (หลักเดียวกับที่ 0002 เตือน · 0018 ทำจริง · 0022 ทำซ้ำ)
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_requests (
  id         uuid primary key default gen_random_uuid(),

  title      text not null check (length(btrim(title)) > 0 and length(title) <= 200),
  -- เล่าว่าอยากทำอะไร · 5,000 ตัวอักษรพอสำหรับการเล่าครั้งแรก
  -- รายละเอียดจริงไปอยู่ในโปรเจกต์ตอนตกลงกันแล้ว
  detail     text not null default '' check (length(detail) <= 5000),

  status     text not null default 'new'
             check (status in ('new', 'talking', 'accepted', 'declined')),

  -- ⚠️ ชี้ไป public.profiles ไม่ใช่ auth.users
  -- ไม่งั้น PostgREST embed profiles ไม่ได้ แล้วหน้าแอดมินจะไม่รู้ว่าใครส่งมา
  -- (บทเรียนจาก 0019 — เจอมาแล้วรอบหนึ่ง)
  created_by uuid not null default auth.uid()
             references public.profiles (id) on delete cascade,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_requests_owner_idx
  on public.project_requests (created_by, created_at desc);

create index if not exists project_requests_status_idx
  on public.project_requests (status, created_at desc);

-- ---------- RLS ----------
alter table public.project_requests enable row level security;

-- ส่งได้ทุกคนที่ล็อกอิน — นี่คือทั้งหมดของฟีเจอร์นี้
-- with check บังคับว่าส่งในนามตัวเองเท่านั้น ปลอมเป็นคนอื่นไม่ได้
drop policy if exists project_requests_insert on public.project_requests;
create policy project_requests_insert on public.project_requests
  for insert to authenticated
  with check (created_by = auth.uid());

-- อ่านได้: คำขอของตัวเอง หรือแอดมินอ่านได้ทุกใบ
-- คนขอต้องเห็นของตัวเอง ไม่งั้นกดส่งแล้วเงียบหายเหมือนตะโกนใส่กำแพง
drop policy if exists project_requests_read on public.project_requests;
create policy project_requests_read on public.project_requests
  for select to authenticated
  using (created_by = auth.uid() or public.is_app_admin());

-- เปลี่ยนสถานะได้เฉพาะแอดมิน — สถานะคือคำตอบของเรา ไม่ใช่ของคนขอ
drop policy if exists project_requests_update on public.project_requests;
create policy project_requests_update on public.project_requests
  for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- ถอนคำขอของตัวเองได้ · แอดมินลบได้ทุกใบ (ไว้เก็บกวาดของที่ยิงมั่ว)
drop policy if exists project_requests_delete on public.project_requests;
create policy project_requests_delete on public.project_requests
  for delete to authenticated
  using (created_by = auth.uid() or public.is_app_admin());

drop trigger if exists project_requests_touch on public.project_requests;
create trigger project_requests_touch before update on public.project_requests
  for each row execute function public.touch_updated_at();

-- ---------- ที่ยังไม่ได้ทำ ----------
-- ยังไม่มีตัวกันยิงรัว — คนหนึ่งคนส่งคำขอร้อยใบได้ถ้าตั้งใจ
-- ยอมรับไว้ก่อนเพราะต้องล็อกอินด้วย Google ถึงจะส่งได้ ซึ่งกันคนกดเล่นไปได้มาก
-- และแอดมินลบทิ้งได้ ถ้าวันหนึ่งเจอของจริงค่อยเติมเพดานต่อคนต่อวัน

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: เปิดRLS = true · จำนวนpolicy = 4 · จำนวนtrigger = 1
--            · policyอ่าน ต้องมีทั้ง auth.uid() และ is_app_admin
--            · ไม่มีคอลัมน์ที่ชื่อคล้ายโน้ตภายใน
select
  (select relrowsecurity from pg_class where oid = 'public.project_requests'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_requests')                     as จำนวนpolicy,
  (select count(*) from pg_trigger where tgname = 'project_requests_touch')             as จำนวนtrigger,
  (select case when qual like '%auth.uid()%' and qual like '%is_app_admin%'
            then 'เจ้าของคำขอ + แอดมิน ✓' else qual end
     from pg_policies
    where schemaname = 'public' and tablename = 'project_requests' and cmd = 'SELECT')  as policyอ่าน,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'project_requests'
      and column_name in ('admin_note', 'internal_note', 'note'))                       as คอลัมน์โน้ตภายใน;
