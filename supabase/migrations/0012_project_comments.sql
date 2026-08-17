-- ============================================================================
-- 0012_project_comments — ห้องคุยงานในโปรเจกต์
--
-- ทุกแท็บที่ผ่านมาเป็นแบบ "เจ้าของเขียน ลูกค้าอ่าน"
-- แท็บนี้เป็นอันแรกที่ **ลูกค้าเขียนได้ด้วย** เพราะห้องคุยที่พูดได้ข้างเดียว
-- ไม่ใช่ห้องคุย policy จึงต่างจากตารางอื่นตรงที่ insert เปิดให้ทุกคนในโปรเจกต์
--
-- ---------------------------------------------------------------------------
-- ที่ต้องระวังเป็นพิเศษ: นี่คือตารางแรกที่คนที่ไม่ใช่เจ้าของเขียนลงได้
-- policy จึงต้องกันสองอย่างที่ตารางอื่นไม่ต้องกัน
--   1. เขียนแล้วสวมชื่อคนอื่นไม่ได้  → with check (author_id = auth.uid())
--   2. แก้/ลบของคนอื่นไม่ได้        → using (author_id = auth.uid())
-- ---------------------------------------------------------------------------
-- ============================================================================

create table if not exists public.project_comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,

  -- ⚠️ ยอมให้เป็น null ได้ และใช้ on delete set null ไม่ใช่ cascade
  -- ถ้าใครลบบัญชีไป ข้อความที่เคยคุยกันต้องไม่หายไปทั้งบทสนทนา
  -- เพราะอีกฝ่ายยังต้องอ่านย้อนได้ว่าตกลงอะไรกันไว้
  -- ตอนแทรกแถวจริง policy บังคับให้เท่ากับ auth.uid() อยู่แล้ว จึงไม่มีทางเป็น null ตั้งแต่แรก
  author_id  uuid default auth.uid() references auth.users (id) on delete set null,

  body       text not null check (length(btrim(body)) > 0 and length(body) <= 4000),

  created_at timestamptz not null default now(),
  -- null = ยังไม่เคยแก้ · หน้าเว็บเอาไปติดป้าย "แก้ไขแล้ว"
  edited_at  timestamptz
);

-- อ่านเรียงตามเวลาเสมอ จึงทำ index ให้ตรงกับที่ query จริง
create index if not exists project_comments_project_idx
  on public.project_comments (project_id, created_at);

-- ---------- ติดเวลาแก้ไขให้เอง ----------
-- ให้ DB เป็นคนตัดสินว่า "แก้แล้ว" แทนที่จะเชื่อค่าที่หน้าเว็บส่งมา
-- และเช็คว่า body เปลี่ยนจริงไหม จะได้ไม่ติดป้ายแก้ไขทั้งที่กดบันทึกข้อความเดิม
create or replace function public.touch_comment_edited()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at = now();
  end if;
  return new;
end $$;

drop trigger if exists project_comments_touch on public.project_comments;
create trigger project_comments_touch before update on public.project_comments
  for each row execute function public.touch_comment_edited();

-- ---------- RLS ----------
alter table public.project_comments enable row level security;

-- อ่าน: คนในโปรเจกต์ทุกคน
drop policy if exists project_comments_read on public.project_comments;
create policy project_comments_read on public.project_comments
  for select to authenticated
  using (public.is_project_member(project_id));

-- เขียน: คนในโปรเจกต์ทุกคน แต่ต้องเขียนในนามตัวเองเท่านั้น
-- `author_id = auth.uid()` คือส่วนที่กันการสวมชื่อคนอื่น
-- และเป็นตัวรับประกันว่า author_id ไม่มีทางเป็น null ตอนแทรก
drop policy if exists project_comments_insert on public.project_comments;
create policy project_comments_insert on public.project_comments
  for insert to authenticated
  with check (public.is_project_member(project_id) and author_id = auth.uid());

-- แก้: เฉพาะข้อความของตัวเอง
-- with check ซ้ำอีกชั้นเพื่อกันการแก้แล้วโยนข้อความไปให้คนอื่นหรือย้ายข้ามโปรเจกต์
drop policy if exists project_comments_update_own on public.project_comments;
create policy project_comments_update_own on public.project_comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.is_project_member(project_id));

-- ลบ: ของตัวเอง หรือเจ้าของโปรเจกต์ลบของใครก็ได้
-- เจ้าของต้องลบของคนอื่นได้ เพราะเป็นคนรับผิดชอบห้องนี้
drop policy if exists project_comments_delete on public.project_comments;
create policy project_comments_delete on public.project_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: RLS เปิด · policy 4 บรรทัด (SELECT / INSERT / UPDATE / DELETE)
--            · trigger 1 ตัว · และ author_id ต้องเป็น SET NULL ไม่ใช่ CASCADE
select
  (select relrowsecurity from pg_class where oid = 'public.project_comments'::regclass) as เปิดRLS,
  (select string_agg(cmd, ' ' order by cmd) from pg_policies
    where schemaname = 'public' and tablename = 'project_comments')                     as policyที่มี,
  (select count(*) from pg_trigger where tgname = 'project_comments_touch')             as จำนวนtrigger,
  (select rc.delete_rule
     from information_schema.referential_constraints rc
     join information_schema.key_column_usage k on k.constraint_name = rc.constraint_name
    where k.table_name = 'project_comments' and k.column_name = 'author_id')            as ลบบัญชีแล้วข้อความ;
