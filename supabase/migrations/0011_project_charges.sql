-- ============================================================================
-- 0011_project_charges — แจกแจงว่าเรียกเก็บค่าอะไรบ้าง
--
-- `project_payments` ตอบว่า **แบ่งจ่ายยังไง** (มัดจำ 30% · งวดที่ 2 · งวดที่ 3)
-- ตารางนี้ตอบว่า **เก็บค่าอะไร** (ฮาร์ดแวร์ · ไลเซนส์ · ค่าบริการรายเดือน)
-- สองคำถามคนละเรื่องกัน จึงแยกตาราง ไม่ยัดรวมเป็นคอลัมน์เพิ่มใน payments
--
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ ตารางนี้ **ลูกค้าในโปรเจกต์เห็นด้วย** (คู่กับ project.invoice.view)
--
-- นี่คือ "ราคาที่เรียกเก็บลูกค้า" ไม่ใช่ "ต้นทุนที่เราจ่าย"
-- ห้ามใส่ราคาทุน ส่วนต่าง กำไร หรือเรทค่าแรงจริงลงตารางนี้เด็ดขาด
-- ถ้าวันหนึ่งต้องเก็บตัวเลขพวกนั้น ให้สร้างตารางแยกที่เปิดเฉพาะเจ้าของ
-- คู่กับ capability `project.finance.view` ที่แยกไว้ให้แล้วใน archive-access.ts
-- (Postgres คุมสิทธิ์ระดับแถวได้ แต่คุมระดับคอลัมน์ได้ลำบาก
--  แยกตารางตั้งแต่แรกถูกกว่ามาแยกทีหลังตอนมีข้อมูลจริงแล้ว)
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_charges (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,

  -- ใช้ text + CHECK แทน enum เพราะรายการหมวดน่าจะงอกอีกเรื่อย ๆ
  -- (งานโรงงานกับงานเว็บคิดค่าคนละแบบ) แก้ CHECK ง่ายกว่าทำ ALTER TYPE
  category    text not null default 'other'
                check (category in ('hardware', 'software', 'subscription', 'service', 'other')),

  label       text not null check (length(btrim(label)) > 0),

  -- จำนวนเป็นทศนิยมได้ เพราะค่าแรงคิดเป็น 1.5 วัน หรือ 0.5 เดือนก็มี
  qty         numeric(10, 2) not null default 1 check (qty > 0),

  -- ราคาต่อหน่วย · ถ้าเป็นของรายเดือนคือราคาต่อเดือน
  unit_amount numeric(12, 2) not null check (unit_amount >= 0),

  -- จำนวนเดือนที่คิด · null = จ่ายครั้งเดียว ไม่ใช่ของรายเดือน
  -- เก็บเป็นแถวเดียวแล้วคูณ ไม่แตกเป็นรายเดือนละแถว
  -- เพราะ 12 เดือนจะได้ 12 แถวที่หน้าตาเหมือนกันหมด อ่านแล้วรก
  months      int check (months is null or months > 0),

  note        text,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists project_charges_project_idx
  on public.project_charges (project_id, sort);

-- ยอดรวมของแถว = ราคาต่อหน่วย × จำนวน × เดือน
-- เก็บเป็นคอลัมน์คำนวณ (generated) แทนที่จะคูณเอาเองที่หน้าเว็บ
-- เพื่อให้ยอดรวมที่หน้าเว็บกับที่ query ตรง ๆ จาก DB ตรงกันเสมอ
-- ไม่ใช่ต่างคนต่างคูณแล้วมีโอกาสไม่ตรงกัน
alter table public.project_charges
  add column if not exists total numeric(14, 2)
    generated always as (unit_amount * qty * coalesce(months, 1)) stored;

-- ---------- RLS ----------
-- ลอกแบบเดียวกับ project_payments ใน 0002 เป๊ะ ๆ
-- คนในโปรเจกต์เห็น (ลูกค้าต้องรู้ว่าจ่ายค่าอะไร) · เจ้าของเป็นคนแก้
alter table public.project_charges enable row level security;

drop policy if exists project_charges_read on public.project_charges;
create policy project_charges_read on public.project_charges
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_charges_write on public.project_charges;
create policy project_charges_write on public.project_charges
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: RLS เปิด · policy 2 บรรทัด · และคอลัมน์ total คำนวณถูก
--            900 × 1 × 12 = 10,800 (ของรายเดือน)
--            2,500 × 4 × null → coalesce เป็น 1 = 10,000 (ของจ่ายครั้งเดียว)
select
  (select relrowsecurity from pg_class where oid = 'public.project_charges'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_charges')                     as จำนวนpolicy,
  (900::numeric * 1 * coalesce(12, 1))                                                as รายเดือน12เดือน,
  (2500::numeric * 4 * coalesce(null, 1))                                             as ของ4ชิ้น;
