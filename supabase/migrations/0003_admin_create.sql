-- ============================================================================
-- 0003_admin_create — เปิดให้สร้างและแก้โปรเจกต์จากหน้าเว็บได้
--
-- ปัญหาไก่กับไข่ที่ต้องแก้:
--   สิทธิ์ owner เก็บอยู่ใน project_members ซึ่งผูกกับ "โปรเจกต์ที่มีอยู่แล้ว"
--   แต่ตอนกดสร้างโปรเจกต์ใหม่ ยังไม่มีโปรเจกต์ให้เป็นเจ้าของ
--   จึงไม่มีทางพิสูจน์สิทธิ์ด้วย project_members ได้
--
--   ทางออก: มีตาราง app_admins แยกต่างหาก เก็บว่าใครเป็นเจ้าของเว็บนี้
--   สร้างเสร็จแล้ว trigger จะใส่คนสร้างเป็น owner ของโปรเจกต์นั้นให้เอง
-- ============================================================================

create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- เห็นได้แค่แถวของตัวเอง — พอให้หน้าเว็บรู้ว่า "ฉันเป็นแอดมินไหม"
-- แต่ไม่ให้ไล่ดูว่าใครเป็นแอดมินบ้าง
drop policy if exists app_admins_read_self on public.app_admins;
create policy app_admins_read_self on public.app_admins
  for select to authenticated
  using (user_id = auth.uid());

-- security definer เพราะถูกเรียกจาก policy ของตารางอื่น
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ---------- ให้แอดมินสร้างโปรเจกต์ได้ ----------
drop policy if exists projects_insert_admin on public.projects;
create policy projects_insert_admin on public.projects
  for insert to authenticated
  with check (public.is_app_admin());

-- แก้ไขได้ทั้งแอดมินและเจ้าของโปรเจกต์นั้น
drop policy if exists projects_update_owner on public.projects;
create policy projects_update_owner on public.projects
  for update to authenticated
  using (public.is_app_admin() or public.is_project_owner(id))
  with check (public.is_app_admin() or public.is_project_owner(id));

-- ลบได้เฉพาะแอดมิน — ลบโปรเจกต์คือ cascade ลบงาน งวดจ่าย ไฟล์ ทิ้งหมด
drop policy if exists projects_delete_admin on public.projects;
create policy projects_delete_admin on public.projects
  for delete to authenticated
  using (public.is_app_admin());

-- ---------- เจ้าของจัดการสมาชิกในโปรเจกต์ตัวเองได้ ----------
-- จำเป็นสำหรับ trigger ด้านล่าง และสำหรับลิงก์เชิญในอนาคต
drop policy if exists project_members_write_owner on public.project_members;
create policy project_members_write_owner on public.project_members
  for all to authenticated
  using (public.is_app_admin() or public.is_project_owner(project_id))
  with check (public.is_app_admin() or public.is_project_owner(project_id));

-- ---------- สร้างเสร็จแล้วใส่คนสร้างเป็นเจ้าของให้เลย ----------
-- ถ้าไม่มี trigger นี้ คนสร้างจะสร้างโปรเจกต์แล้วเข้าไปแก้ต่อไม่ได้
-- เพราะยังไม่ได้เป็น owner ของมัน
create or replace function public.claim_new_project()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- รันจาก SQL editor จะไม่มี auth.uid() ก็ข้ามไป ไม่ต้องพัง
  if auth.uid() is not null then
    insert into public.project_members (project_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end $$;

drop trigger if exists projects_claim on public.projects;
create trigger projects_claim after insert on public.projects
  for each row execute function public.claim_new_project();

-- ============================================================================
-- ตั้งเจ้าของเว็บเป็นแอดมิน — แก้อีเมลให้ตรงกับที่ใช้ล็อกอิน
-- ============================================================================

insert into public.app_admins (user_id, note)
select id, 'เจ้าของเว็บ'
from auth.users
where email = 'watcharinkurain57@gmail.com'
on conflict (user_id) do nothing;

-- ตรวจว่าเข้าแล้ว — ควรได้ 1 แถว
select u.email, a.note
from public.app_admins a
join auth.users u on u.id = a.user_id;
