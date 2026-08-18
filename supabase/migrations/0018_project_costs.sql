-- ============================================================================
-- 0018_project_costs — ต้นทุนฝั่งเรา (เจ้าของโปรเจกต์เห็นคนเดียว)
--
-- 0002 เขียนเตือนไว้ตั้งแต่แรกว่า project_payments ห้ามมีต้นทุน/กำไร
-- และ 0011 (project_charges) ก็ย้ำอีกครั้ง เพราะทั้งสองตารางลูกค้าเห็น
-- ตารางนี้คือที่ที่ตัวเลขพวกนั้นควรอยู่ และ capability project.finance.view
-- ที่ archive-access.ts เตรียมไว้ตั้งแต่ต้นก็รอตารางนี้อยู่
--
-- ---------------------------------------------------------------------------
-- ⚠️⚠️ ข้อเดียวที่สำคัญที่สุดของไฟล์นี้: policy อ่านต้องเป็น is_project_OWNER
--
-- ไม่ใช่ is_project_member เหมือนตารางอื่นเกือบทั้งหมดในระบบ
-- ถ้าเผลอลอก policy จากตารางอื่นมาแล้วไม่แก้คำนี้
-- ลูกค้าที่อยู่ในโปรเจกต์จะอ่านต้นทุนและกำไรของเราได้ทันที
-- โดยที่หน้าเว็บดูปกติทุกอย่าง เพราะ UI ไม่ได้เป็นตัวกัน
--
-- นี่เป็นเหตุผลที่ต้องแยกตาราง ไม่ใช่เพิ่มคอลัมน์ใน project_charges:
-- Postgres คุมสิทธิ์ระดับแถวได้ แต่คุมระดับคอลัมน์ได้ลำบาก
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_costs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,

  -- หมวดฝั่งต้นทุนต่างจากฝั่งเรียกเก็บ มี outsource กับ labor เพิ่มมา
  -- เพราะจ้างช่วงกับค่าแรงเป็นต้นทุน แต่ไม่ใช่รายการที่แจกแจงให้ลูกค้าดู
  category    text not null default 'other'
              check (category in ('hardware', 'software', 'subscription', 'outsource', 'labor', 'other')),

  label       text not null check (length(btrim(label)) > 0),
  qty         numeric(10, 2) not null default 1 check (qty > 0),
  unit_amount numeric(12, 2) not null check (unit_amount >= 0),
  -- จำนวนเดือนสำหรับของที่จ่ายรายเดือน · null = จ่ายครั้งเดียว
  months      int check (months is null or months > 0),

  -- ซื้อจากใคร — ไว้ตามหาใบเสร็จทีหลัง
  vendor      text,
  -- จ่ายจริงไปแล้วเมื่อไหร่ · null = ยังไม่จ่าย (ยังเป็นตัวเลขประมาณการ)
  -- ใช้แยก "ต้นทุนที่ตั้งไว้" ออกจาก "เงินที่ออกจากกระเป๋าไปแล้วจริง"
  paid_on     date,

  note        text,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

-- คิดสูตรเดียวกับ project_charges เพื่อให้สองฝั่งเทียบกันได้ตรง ๆ
-- และให้ DB คำนวณที่เดียว หน้าเว็บกับ query จะได้ไม่ต่างกัน
alter table public.project_costs
  add column if not exists total numeric(14, 2)
    generated always as (unit_amount * qty * coalesce(months, 1)) stored;

create index if not exists project_costs_project_idx
  on public.project_costs (project_id, sort);

-- ---------- RLS ----------
alter table public.project_costs enable row level security;

-- ⚠️ is_project_owner ไม่ใช่ is_project_member — อ่านคอมเมนต์หัวไฟล์
drop policy if exists project_costs_read on public.project_costs;
create policy project_costs_read on public.project_costs
  for select to authenticated
  using (public.is_project_owner(project_id));

drop policy if exists project_costs_write on public.project_costs;
create policy project_costs_write on public.project_costs
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
-- ⚠️ ช่องที่ต้องดูให้ดีที่สุดคือ policyอ่านใช้ฟังก์ชัน
--    ต้องเป็น is_project_owner ถ้าขึ้น is_project_member = ลูกค้าเห็นต้นทุนได้
select
  (select relrowsecurity from pg_class where oid = 'public.project_costs'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_costs')                     as จำนวนpolicy,
  (select case
      when qual like '%is_project_owner%' then 'is_project_owner ✓'
      when qual like '%is_project_member%' then 'is_project_member ✗ ลูกค้าเห็นได้!'
      else qual
    end
     from pg_policies
    where schemaname = 'public' and tablename = 'project_costs' and cmd = 'SELECT') as policyอ่านใช้ฟังก์ชัน,
  (900::numeric * 1 * coalesce(12, 1))                                              as ทดสอบสูตรรายเดือน;
