-- ============================================================================
-- prod_post_login — รันหลังล็อกอินบนเว็บ prod ครั้งแรก
--
-- ตอนรัน prod_deploy ครั้งแรกยังไม่มีใครใน auth.users
-- ส่วนที่ตั้งแอดมินจึงไม่ทำอะไรเลย ต้องมารันซ้ำหลังมีบัญชีแล้ว
--
-- ไฟล์นี้ไม่ผูกกับอีเมลตายตัว ใช้ทุกบัญชีที่มีอยู่ตอนนั้น
-- ซึ่งตอน prod เพิ่งเปิดจะมีแค่บัญชีเจ้าของคนเดียว
-- ============================================================================

-- 1) ตั้งเป็นแอดมินของเว็บ (สร้าง/ลบโปรเจกต์ได้)
insert into public.app_admins (user_id, note)
select id, 'เจ้าของเว็บ' from auth.users
on conflict (user_id) do nothing;

-- 2) ตั้งเป็นเจ้าของทุกโปรเจกต์ที่ seed มากับ migration
insert into public.project_members (project_id, user_id, role)
select p.id, u.id, 'owner'
from public.projects p
cross join auth.users u
on conflict (project_id, user_id) do nothing;

-- 3) ตรวจผล — ควรเห็นอีเมลคุณเป็น owner ของทุกโปรเจกต์
select
  pr.email,
  pr.display_name,
  (select count(*) from public.app_admins a where a.user_id = pr.id) > 0 as เป็นแอดมิน,
  count(m.project_id)                                                    as จำนวนโปรเจกต์ที่เป็นเจ้าของ
from public.profiles pr
left join public.project_members m on m.user_id = pr.id and m.role = 'owner'
group by pr.id, pr.email, pr.display_name;
