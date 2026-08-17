-- ============================================================================
-- 0006_profiles_assignee — โปรไฟล์ผู้ใช้ + มอบหมายงานให้คนในโปรเจกต์
--
-- ปัญหาที่ต้องแก้ก่อน:
--   ตาราง auth.users ฝั่งเบราว์เซอร์อ่านไม่ได้ (Supabase ปิดไว้โดยตั้งใจ)
--   เรารู้แค่ user_id เป็นรหัสยาว ๆ เลยแสดงชื่อคนไม่ได้เลย
--   ต้องมีตาราง profiles ใน schema public ที่คัดลอกเฉพาะข้อมูลที่แสดงได้
-- ============================================================================

-- ---------- โปรไฟล์ ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ---------- สร้างโปรไฟล์อัตโนมัติตอนมีคนล็อกอินครั้งแรก ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    -- Google ส่งชื่อมาใน full_name บางเคสใช้ name ถ้าไม่มีเลยใช้ชื่อหน้า @
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email      = excluded.email,
    -- ไม่ทับชื่อที่เจ้าตัวตั้งเอง ถ้าเคยตั้งไว้แล้ว
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- เติมโปรไฟล์ให้คนที่ล็อกอินไปแล้วก่อนหน้านี้
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    split_part(coalesce(u.email, ''), '@', 1)
  ),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
on conflict (id) do nothing;

-- ---------- ใครเห็นโปรไฟล์ใครได้ ----------
-- security definer เพื่อกัน recursion ตอน policy เรียก project_members
create or replace function public.shares_project_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members a
    join public.project_members b on b.project_id = a.project_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

alter table public.profiles enable row level security;

-- เห็นได้เฉพาะตัวเองกับคนที่อยู่โปรเจกต์เดียวกัน
-- ไม่เปิดให้คนล็อกอินคนไหนก็ได้อ่าน เพราะในนี้มีอีเมลจริงของทุกคน
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_project_with(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- มอบหมายงาน ----------
alter table public.project_tasks
  add column if not exists assignee_id uuid references auth.users (id) on delete set null;

create index if not exists project_tasks_assignee_idx
  on public.project_tasks (project_id, assignee_id);

-- กันมอบหมายให้คนนอกโปรเจกต์
-- ใช้ trigger เพราะ CHECK constraint ของ Postgres ใส่ subquery ไม่ได้
create or replace function public.check_task_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_id is not null and not exists (
    select 1 from public.project_members m
    where m.project_id = new.project_id and m.user_id = new.assignee_id
  ) then
    raise exception 'มอบหมายงานให้คนที่ไม่ได้อยู่ในโปรเจกต์นี้ไม่ได้';
  end if;
  return new;
end $$;

drop trigger if exists project_tasks_check_assignee on public.project_tasks;
create trigger project_tasks_check_assignee
  before insert or update of assignee_id, project_id on public.project_tasks
  for each row execute function public.check_task_assignee();

-- ---------- ตรวจผล ----------
select p.display_name, p.email, p.avatar_url is not null as มีรูป
from public.profiles p;
