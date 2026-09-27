-- ============================================================================
-- 0024_agent_runs — สมุดบันทึกการทำงานของผู้ช่วย AI (agent)
--
-- ทุกครั้งที่ผู้ช่วยในแท็บ "ผู้ช่วย AI" ทำงานจบหนึ่งรอบ เซิร์ฟเวอร์เขียนแถวลงที่นี่
-- หนึ่งแถว: ใครสั่ง บทบาทไหน เรียกเครื่องมืออะไรบ้าง ใช้ token เท่าไหร่ กี่บาท
-- คือส่วน "การจัดการ" ของระบบ agent — ไม่มีสมุดนี้ ก็ไม่มีทางรู้ว่าเอเจนต์ทำอะไรไป
-- และเงินค่า API หมดไปกับอะไร (โค้ดฝั่ง harness อยู่ที่ src/lib/agents/)
--
-- ---------------------------------------------------------------------------
-- ⚠️ ตั้งใจไม่เก็บ "ข้อความที่คุยกัน" ลงตารางนี้
--
-- สิ่งที่ผู้ใช้พิมพ์กับคำตอบของผู้ช่วยอาจมีเรื่องลูกค้า ตัวเลขเงิน หรือข้อมูลส่วนบุคคล
-- เก็บไว้ = เพิ่มที่ที่ข้อมูลพวกนั้นรั่วได้อีกหนึ่งที่ (และเป็นภาระตาม PDPA)
-- สมุดนี้จึงเก็บแค่ข้อมูลกำกับ (metadata) พอให้ตอบได้ว่า "ใคร ทำอะไร เสียเท่าไหร่"
-- ส่วนผลงานจริงที่ผู้ช่วยร่างให้ ไปอยู่ในตารางต้นทางเมื่อคนกดยืนยันแล้วเท่านั้น
-- ---------------------------------------------------------------------------
--
-- ---------------------------------------------------------------------------
-- ⚠️ เขียนได้อย่างเดียว แก้/ลบไม่ได้ (append-only) โดยตั้งใจ
--
-- ตัวนับ "วันนี้ใช้ไปกี่รอบแล้ว" ของ /api/agents/run นับจากตารางนี้
-- ถ้าผู้ใช้ลบแถวของตัวเองได้ ก็ลบเพื่อรีเซ็ตเพดานรายวันได้ ซึ่งคือค่า API ของเรา
-- ไม่มี policy update/delete = ทำจากเบราว์เซอร์ไม่ได้เลย
-- (ลบโปรเจกต์แล้วแถวหายตาม on delete cascade ซึ่งถูกต้อง)
--
-- ผู้ใช้ยัดแถวปลอมเพิ่มเองได้ แต่นั่นทำได้แค่ทำให้ตัวเองชนเพดานเร็วขึ้น ไม่ได้อะไร
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.agent_runs (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects (id) on delete cascade,
  user_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- id ของบทบาทใน src/lib/agents/roles.ts เช่น 'coordinator' 'pm' 'finance'
  -- เก็บเป็นข้อความ ไม่ใช่ enum เพราะเพิ่มบทบาทใหม่ต้องไม่ต้องมาแก้ฐานข้อมูล
  role               text not null check (role ~ '^[a-z][a-z0-9_-]{0,39}$'),
  status             text not null
                     check (status in ('done', 'limit', 'refused', 'error', 'aborted')),
  model              text not null check (length(model) <= 80),
  iterations         int not null default 0 check (iterations >= 0),
  -- [{ "agent": "pm", "name": "list_tasks", "ok": true }, ...] — ชื่อเครื่องมือเท่านั้น
  -- ไม่เก็บ input/output ของเครื่องมือ ด้วยเหตุผลเดียวกับที่ไม่เก็บข้อความ
  tool_calls         jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(tool_calls) = 'array'),
  input_tokens       int not null default 0 check (input_tokens >= 0),
  output_tokens      int not null default 0 check (output_tokens >= 0),
  cache_read_tokens  int not null default 0 check (cache_read_tokens >= 0),
  cache_write_tokens int not null default 0 check (cache_write_tokens >= 0),
  -- ประมาณการเป็นดอลลาร์จากตารางราคาใน src/lib/agents/pricing.ts
  -- null = ไม่รู้ราคาของรุ่นนั้น (เช่นตั้ง AGENT_MODEL เป็นรุ่นที่ยังไม่อยู่ในตาราง)
  cost_usd           numeric(10, 4) check (cost_usd is null or cost_usd >= 0),
  duration_ms        int check (duration_ms is null or duration_ms >= 0),
  error              text check (error is null or length(error) <= 500),
  created_at         timestamptz not null default now()
);

create index if not exists agent_runs_project_idx
  on public.agent_runs (project_id, created_at desc);

-- ตัวนับเพดานรายวันถามด้วย user_id + ช่วงเวลา
create index if not exists agent_runs_user_idx
  on public.agent_runs (user_id, created_at desc);

-- ---------- RLS ----------
alter table public.agent_runs enable row level security;

-- เขียนได้เฉพาะแถวของตัวเอง ในโปรเจกต์ที่ตัวเองอยู่
drop policy if exists agent_runs_insert on public.agent_runs;
create policy agent_runs_insert on public.agent_runs
  for insert to authenticated
  with check (user_id = auth.uid() and public.is_project_member(project_id));

-- อ่านได้: ของตัวเอง · เจ้าของโปรเจกต์เห็นทุกรอบในโปรเจกต์ (เพื่อดูแลค่าใช้จ่าย)
-- · แอดมินเว็บเห็นทั้งหมด
drop policy if exists agent_runs_read on public.agent_runs;
create policy agent_runs_read on public.agent_runs
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_project_owner(project_id)
    or public.is_app_admin()
  );

-- ไม่มี policy update / delete — ดูเหตุผลหัวไฟล์

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: เปิดRLS = true · policyที่มี = 'INSERT SELECT' (ไม่มี UPDATE/DELETE)
--            · จำนวนindex = 3 (pkey + สองตัวข้างบน)
select
  (select relrowsecurity from pg_class where oid = 'public.agent_runs'::regclass) as เปิดRLS,
  (select string_agg(cmd, ' ' order by cmd) from pg_policies
    where schemaname = 'public' and tablename = 'agent_runs')                     as policyที่มี,
  (select count(*) from pg_indexes
    where schemaname = 'public' and tablename = 'agent_runs')                     as จำนวนindex;
