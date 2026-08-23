-- ============================================================================
-- 0022_clients — ลูกค้า: จัดกลุ่มโปรเจกต์ตามคนที่จ้าง
--
-- จนถึงตอนนี้ระบบไม่มีแนวคิด "ลูกค้า" อยู่เลย โปรเจกต์เป็นรายการแบน
-- และคนถูกผูกเข้าโปรเจกต์ทีละคู่ผ่าน project_members
--
-- ซึ่งพอใช้ได้ตอนรับงานเจ้าละครั้ง แต่พอเจ้าเดิมกลับมาจ้างงานที่สอง
-- ก็ไม่มีที่ไหนบอกได้ว่าสามโปรเจกต์นี้เป็นของเจ้าเดียวกัน ดูยอดรวมต่อเจ้าไม่ได้
-- และไม่มีที่เก็บเลขผู้เสียภาษีกับที่อยู่ ซึ่งต้องใช้ทุกครั้งที่ออกใบเสนอราคา
--
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ ข้อที่สำคัญที่สุดของไฟล์นี้: ข้อมูลลูกค้าเป็นของภายใน
--
-- ชื่อบริษัท ผู้ติดต่อ เบอร์ เลขผู้เสียภาษี — ห้ามหลุดออกไปไหนทั้งสิ้น
-- ทั้งคลังโปรเจกต์สาธารณะและตัวลูกค้าเองก็ไม่ต้องเห็น (เจ้าของสั่งไว้ชัด)
-- policy ของสองตารางนี้จึงเป็น is_app_admin() **ไม่ใช่** is_project_member
-- หรือ is_project_owner แบบตารางอื่นเกือบทั้งหมดในระบบ
--
-- ถ้าเผลอลอก policy จากตารางอื่นมาแล้วไม่แก้ ข้อมูลลูกค้าทั้งฐานจะเปิดทันที
-- ---------------------------------------------------------------------------
--
-- ---------------------------------------------------------------------------
-- ทำไมความเชื่อมโยง project -> client เป็นตารางแยก ไม่ใช่คอลัมน์บน projects
--
-- นี่คือเหตุผลเดียวกับที่ 0002 เตือนไว้ และ 0018 ลงมือทำจริง:
--   **Postgres คุมสิทธิ์ระดับแถวได้ แต่คุมระดับคอลัมน์ได้ลำบาก**
--
-- ตาราง projects ถูกอ่านโดยทุกคน รวมถึงคนที่ไม่ได้ล็อกอินเลย (คลังสาธารณะ)
-- ถ้าเติม client_id ลงไปตรง ๆ ค่านั้นจะติดไปกับทุกแถวที่ใครก็ดึงได้
-- ต่อให้เป็น uuid ที่อ่านไม่ออก คนนอกก็ยัง **จับคู่ได้ว่าโปรเจกต์ไหนเจ้าเดียวกัน**
-- ซึ่งสำหรับงานที่ปรึกษาถือว่าบอกมากเกินไปแล้ว
--
-- แยกเป็นตารางที่เปิดให้แอดมินอ่านคนเดียว ปัญหานี้หายไปทั้งข้อ
-- (แลกกับการต้อง join เพิ่มหนึ่งครั้งในหน้าแอดมิน ซึ่งคุ้มมาก)
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),

  -- ชื่อที่ใช้เรียกภายใน เช่น 'เคมีแมน (แก่งคอย)'
  name          text not null check (length(btrim(name)) > 0),

  contact_name  text,
  contact_email text,
  contact_phone text,

  -- ของที่ต้องกรอกทุกครั้งตอนออกใบเสนอราคา — เก็บไว้ที่เดียวจะได้ไม่ต้องตามหา
  tax_id        text,
  address       text,

  note          text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,

  -- กันเผลอสร้างเจ้าเดิมซ้ำจนยอดรวมแยกกันเป็นสองก้อนโดยไม่รู้ตัว
  unique (name)
);

-- ---------- โปรเจกต์นี้ของลูกค้าเจ้าไหน ----------
-- หนึ่งโปรเจกต์มีลูกค้าได้เจ้าเดียว (project_id เป็น primary key)
-- แต่ลูกค้าหนึ่งเจ้ามีได้หลายโปรเจกต์ — ซึ่งคือทั้งหมดที่โจทย์ต้องการ
create table if not exists public.project_clients (
  project_id uuid primary key references public.projects (id) on delete cascade,

  -- ลบลูกค้าทิ้ง = เลิกจัดกลุ่ม ไม่ใช่ลบโปรเจกต์
  -- (เหตุผลเดียวกับ group_id ของงานใน 0014 และของผังใน 0021)
  client_id  uuid not null references public.clients (id) on delete cascade,

  created_at timestamptz not null default now()
);

create index if not exists project_clients_client_idx
  on public.project_clients (client_id);

-- ---------- RLS ----------
-- ⚠️ is_app_admin() เท่านั้น — อ่านคอมเมนต์หัวไฟล์ก่อนแก้บรรทัดพวกนี้
alter table public.clients         enable row level security;
alter table public.project_clients enable row level security;

drop policy if exists clients_admin_all on public.clients;
create policy clients_admin_all on public.clients
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists project_clients_admin_all on public.project_clients;
create policy project_clients_admin_all on public.project_clients
  for all to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop trigger if exists clients_touch on public.clients;
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

-- ---------- ไม่แตะ project_members ----------
-- ตั้งใจไม่ผูกสิทธิ์เข้ากับลูกค้า — คนของบริษัทเดียวกันยังต้องถูกเชิญรายโปรเจกต์เหมือนเดิม
-- เพราะลูกค้าเจ้าหนึ่งมักส่งคนละคนมาคนละงาน (วิศวกรหน้างาน / ฝ่ายจัดซื้อ)
-- และการเปิดให้เห็นทุกโปรเจกต์ของบริษัทตัวเองอัตโนมัติ แปลว่าคนที่คุยงานเก่า
-- จะเห็นงานใหม่ทันทีรวมถึงยอดที่เรียกเก็บ ซึ่งไม่ใช่สิ่งที่ทุกเจ้าต้องการ
-- การจัดกลุ่มรอบนี้จึงเป็นเรื่องของฝั่งเราล้วน ไม่กระทบสิทธิ์ที่มีอยู่แม้แต่นิดเดียว

-- ---------- ตรวจผล ----------
-- ⚠️ ช่องที่ต้องดูให้ดีที่สุดคือ policyทั้งสองตาราง ต้องขึ้น is_app_admin
--    ถ้าขึ้น is_project_member หรือ is_project_owner = ข้อมูลลูกค้าหลุด
select
  t.tablename                                                                    as ตาราง,
  (select relrowsecurity from pg_class where oid = ('public.' || t.tablename)::regclass) as เปิดRLS,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename)                 as จำนวนpolicy,
  (select case
      when string_agg(p.qual, ' ') like '%is_app_admin%' then 'is_app_admin ✓'
      else coalesce(string_agg(p.qual, ' '), '(ไม่มี policy)') || ' ✗ ข้อมูลลูกค้าหลุด!'
    end
     from pg_policies p
    where p.schemaname = 'public' and p.tablename = t.tablename)                 as policyใช้ฟังก์ชัน
from (values ('clients'), ('project_clients')) as t(tablename);

-- projects ต้องไม่มีคอลัมน์ client_id (ตั้งใจแยกออกไป — อ่านหัวไฟล์)
select not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'projects' and column_name = 'client_id'
) as projectsไม่มีclient_id;
