-- ============================================================================
-- 0007_profile_relations — ผูก project_members กับ profiles ให้ join ได้
--
-- อาการ: PostgREST ตอบว่า
--   "Could not find a relationship between 'project_members' and 'profiles'"
--
-- สาเหตุ: ทั้งสองตารางชี้ไป auth.users คนละทาง
--   project_members.user_id -> auth.users.id
--   profiles.id             -> auth.users.id
-- ไม่มี foreign key ระหว่างกันเอง PostgREST จึงไม่รู้ว่าจะ join ด้วยคีย์ไหน
-- (มันอ่านความสัมพันธ์จาก foreign key เท่านั้น ไม่ได้เดาจากชื่อคอลัมน์)
--
-- วิธีแก้: ย้ายให้ชี้มาที่ profiles แทน auth.users
-- ห่วงโซ่จะกลายเป็น auth.users -> profiles -> project_members
-- ลบผู้ใช้แล้วยัง cascade ครบเหมือนเดิม แต่ join ได้ด้วย
-- ============================================================================

-- ---------- project_members ----------
alter table public.project_members
  drop constraint if exists project_members_user_id_fkey;

alter table public.project_members
  add constraint project_members_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------- project_tasks.assignee_id ----------
-- ผูกกับ profiles ด้วยเหตุผลเดียวกัน จะได้ดึงชื่อคนรับผิดชอบมาพร้อมงานได้
alter table public.project_tasks
  drop constraint if exists project_tasks_assignee_id_fkey;

alter table public.project_tasks
  add constraint project_tasks_assignee_id_fkey
  foreign key (assignee_id) references public.profiles (id) on delete set null;

-- ---------- project_invites.used_by ----------
alter table public.project_invites
  drop constraint if exists project_invites_used_by_fkey;

alter table public.project_invites
  add constraint project_invites_used_by_fkey
  foreign key (used_by) references public.profiles (id) on delete set null;

-- ---------- app_admins ----------
alter table public.app_admins
  drop constraint if exists app_admins_user_id_fkey;

alter table public.app_admins
  add constraint app_admins_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- ---------- ตรวจผล ----------
-- ควรได้ 1 แถวต่อสมาชิก 1 คน พร้อมชื่อที่ไม่ใช่ null
select p.slug, pr.display_name, pr.email, m.role
from public.project_members m
join public.projects p  on p.id  = m.project_id
join public.profiles pr on pr.id = m.user_id
order by p.slug;
