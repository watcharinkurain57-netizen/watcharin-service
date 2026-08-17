-- ============================================================================
-- prod_post_login — รันหลังล็อกอินบนเว็บ prod ครั้งแรก
--
-- ตอนรัน prod_deploy ครั้งแรกยังไม่มีใครใน auth.users
-- ส่วนที่ตั้งแอดมินจึงไม่ทำอะไรเลย ต้องมารันซ้ำหลังมีบัญชีแล้ว
--
-- ไฟล์นี้ไม่ผูกกับอีเมลตายตัว ใช้ทุกบัญชีที่มีอยู่ตอนนั้น
-- ซึ่งตอน prod เพิ่งเปิดจะมีแค่บัญชีเจ้าของคนเดียว
--
-- รันซ้ำได้ไม่เสียหาย (on conflict do nothing ทุกท่อน)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) ด่านกันเงียบ — เคยเจอมาแล้ว 2026-08-17
--
-- `insert ... select ... from auth.users` ตอนตารางว่าง = ใส่ 0 แถว
-- Postgres ถือว่าสำเร็จ ไม่มี error ไม่มี warning — SQL editor ขึ้นเขียวปกติ
-- คนรันเลยเชื่อว่าตั้งแอดมินแล้ว ทั้งที่ไม่ได้เกิดอะไรขึ้นเลย
-- ต้องหยุดตรงนี้ให้ดังกว่านั้น
-- ---------------------------------------------------------------------------
do $$
declare
  n int;
begin
  select count(*) into n from auth.users;
  if n = 0 then
    raise exception
      'auth.users ยังว่าง — ยังไม่มีใครล็อกอินเลย ไฟล์นี้จึงยังไม่มีบัญชีให้ตั้งเป็นแอดมิน'
      using hint = 'เปิด https://watcharin-service.com/login ล็อกอินด้วย Google ให้สำเร็จก่อน แล้วค่อยกลับมารันไฟล์นี้ใหม่';
  end if;
  raise notice 'พบ % บัญชีใน auth.users — ไปต่อ', n;
end $$;

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

-- 3) กันเคสโปรไฟล์หาย — ปกติ trigger on_auth_user_created สร้างให้เอง
--    แต่ถ้าบัญชีเกิดก่อน mig 0006 หรือ trigger ถูกลบไป จะไม่มีแถว
--    แล้วหน้า "คนในโปรเจกต์" จะโชว์ช่องว่างแทนชื่อ
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

-- ---------------------------------------------------------------------------
-- 4) ตรวจผล — อ่านจาก auth.users เป็นหลัก ไม่ใช่ profiles
--    เพราะถ้า profiles เป็นตัวที่มีปัญหา ตารางตรวจจะว่างตามไปด้วย
--    แล้วจะดูไม่ออกว่า "ไม่มีบัญชี" หรือ "มีบัญชีแต่ไม่มีโปรไฟล์"
--
--    ที่ควรเห็น: 1 แถว · เป็นแอดมิน = true · จำนวนโปรเจกต์ที่เป็นเจ้าของ = 4
-- ---------------------------------------------------------------------------
select
  u.email,
  u.created_at                                                     as ล็อกอินครั้งแรกเมื่อ,
  exists (select 1 from public.app_admins a  where a.user_id = u.id) as เป็นแอดมิน,
  exists (select 1 from public.profiles  pr where pr.id      = u.id) as มีโปรไฟล์,
  (select count(*) from public.project_members m
    where m.user_id = u.id and m.role = 'owner')                    as จำนวนโปรเจกต์ที่เป็นเจ้าของ,
  (select count(*) from public.projects)                            as โปรเจกต์ทั้งหมดในระบบ
from auth.users u
order by u.created_at;
