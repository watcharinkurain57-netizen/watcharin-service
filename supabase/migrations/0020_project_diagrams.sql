-- ============================================================================
-- 0020_project_diagrams — ไดอะแกรมของโปรเจกต์ เก็บเป็นข้อความ
--
-- งานที่รับส่วนใหญ่เป็นงานที่ต้องอธิบาย "ของวิ่งจากไหนไปไหน" —
-- PLC → adapter → cloud → แท็บเล็ตหน้างาน · ลำดับการคุยกันของสองระบบ ·
-- ตารางไหนอ้างตารางไหน ทุกวันนี้ภาพพวกนี้อยู่ในไฟล์ .drawio ที่แนบไว้เฉย ๆ
-- ซึ่งเปิดดูในเว็บไม่ได้ แก้ทีต้องโหลดลงมาแก้แล้วอัปกลับ และไม่มีใครรู้ว่า
-- ไฟล์ที่แนบไว้เมื่อสองเดือนก่อนยังตรงกับระบบจริงอยู่หรือเปล่า
--
-- ---------------------------------------------------------------------------
-- ทำไมเก็บเป็นข้อความ ไม่ใช่ผืนผ้าใบแบบลากวาง
--
-- เหตุผลเดียวกับ description ใน 0019 และแรงกว่าด้วยซ้ำ:
--   - ข้อความ diff ได้ เห็นว่ารอบนี้เพิ่มกล่องไหนเข้ามา · ผืนผ้าใบ diff ไม่ได้เลย
--   - grep หาได้ว่าไดอะแกรมไหนพูดถึง 'MQTT' บ้าง
--   - แก้ผังจากมือถือได้ ซึ่งลากวางบนจอเล็กทำไม่ได้จริง
--   - ไม่ผูกกับ editor เจ้าไหน วันหลังเปลี่ยนตัว render ข้อมูลเดิมยังอ่านออก
--
-- ตัวที่แปลงข้อความเป็นภาพคือ mermaid ทำงานฝั่งเบราว์เซอร์ล้วน
-- ฐานข้อมูลไม่รู้จักและไม่ต้องรู้จักว่าข้อความข้างในหน้าตาเป็นยังไง
--
-- ⚠️ policy **ฝั่งเขียน** เป็น is_project_owner โดยตั้งใจ (ฝั่งอ่านเป็น member ตามเดิม)
-- นอกจากเหตุผลเรื่องใครควรแก้ผังได้แล้ว ยังเป็นเงื่อนไขด้านความปลอดภัยด้วย:
-- label ของ mermaid ใส่ <img src="https://..."> ได้ (event handler โดนล้าง
-- แต่ตัว tag รอด) ซึ่งยิงคำขอออกนอกตอนคนอื่นเปิดดูได้แบบ tracking pixel
-- รับได้ตราบใดที่คนเขียนคือเจ้าของ ถ้าวันหนึ่งเปิดให้ลูกค้าเขียนผังด้วย
-- ต้องกลับมาคิดข้อนี้ใหม่ (รายละเอียดที่วัดไว้อยู่หัวไฟล์ MermaidView.tsx)
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_diagrams (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,

  title      text not null check (length(btrim(title)) > 0),

  -- ต้นฉบับ mermaid · ว่างได้ เพราะกด "เพิ่มไดอะแกรม" แล้วยังไม่ทันพิมพ์
  -- ก็ต้องมีแถวให้เปิดเข้าไปแก้ได้ก่อน
  source     text not null default '',

  sort       int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- default auth.uid() = หน้าเว็บไม่ต้องส่งมาเอง (รันจาก SQL editor จะได้ null ซึ่งถูกแล้ว)
  created_by uuid default auth.uid() references auth.users (id) on delete set null
);

-- 20,000 ตัวอักษรเท่ากับ description ใน 0019 — ผังที่ยาวกว่านี้อ่านไม่รู้เรื่องแล้ว
-- ควรซอยเป็นหลายผัง ไม่ใช่ยัดทุกอย่างลงภาพเดียว
do $$ begin
  alter table public.project_diagrams
    add constraint project_diagrams_source_len check (length(source) <= 20000);
exception when duplicate_object then null; end $$;

create index if not exists project_diagrams_project_idx
  on public.project_diagrams (project_id, sort);

-- ---------- RLS ----------
-- ลอกจาก project_task_groups (0014) ตรง ๆ — อ่าน = คนในโปรเจกต์ · เขียน = เจ้าของ
--
-- ลูกค้าต้องอ่านได้ เพราะผังพวกนี้คือของที่เราวาดไว้ "ให้ลูกค้าเข้าใจระบบตัวเอง"
-- ถ้าเปิดเฉพาะเจ้าของ ก็กลับไปเป็นไฟล์ที่ไม่มีใครเปิดเหมือนเดิม
alter table public.project_diagrams enable row level security;

drop policy if exists project_diagrams_read on public.project_diagrams;
create policy project_diagrams_read on public.project_diagrams
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists project_diagrams_write on public.project_diagrams;
create policy project_diagrams_write on public.project_diagrams
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop trigger if exists project_diagrams_touch on public.project_diagrams;
create trigger project_diagrams_touch before update on public.project_diagrams
  for each row execute function public.touch_updated_at();

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: เปิดRLS = true · จำนวนpolicy = 2 · จำนวนtrigger = 1 · จำกัดความยาว = true
-- และ policyอ่าน ต้องเป็น is_project_member (ลูกค้าต้องเห็นผังของโปรเจกต์ตัวเอง)
select
  (select relrowsecurity from pg_class where oid = 'public.project_diagrams'::regclass) as เปิดRLS,
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'project_diagrams')                     as จำนวนpolicy,
  (select count(*) from pg_trigger where tgname = 'project_diagrams_touch')             as จำนวนtrigger,
  (select exists (select 1 from pg_constraint
    where conname = 'project_diagrams_source_len'))                                     as จำกัดความยาว,
  (select case
      when qual like '%is_project_member%' then 'is_project_member ✓'
      else qual
    end
     from pg_policies
    where schemaname = 'public' and tablename = 'project_diagrams' and cmd = 'SELECT')  as policyอ่าน;
