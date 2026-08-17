-- ============================================================================
-- 0008_invites — ลิงก์เชิญเข้าโปรเจกต์
--
-- โจทย์: คนที่ถูกเชิญยังไม่ได้อยู่ในโปรเจกต์
--   - อ่านตาราง project_invites ไม่ได้ (0001 เปิด RLS แล้วไม่ใส่ policy เลย)
--   - เพิ่มตัวเองเข้า project_members ไม่ได้ (0003 ให้เฉพาะเจ้าของเขียน)
--   ซึ่งถูกต้องแล้ว ไม่ควรผ่อน
--
-- ทางออก: ทำเป็นฟังก์ชัน security definer สองตัว
--   peek_project_invite   ดูว่าลิงก์นี้เชิญเข้าโปรเจกต์อะไร (ยังไม่ล็อกอินก็เรียกได้)
--   redeem_project_invite แลกลิงก์เป็นสมาชิก (ต้องล็อกอินแล้ว)
-- ฟังก์ชันเป็นประตูแคบ ๆ ที่เราคุมเงื่อนไขได้เอง ต่างจากการเปิด policy ทั้งตาราง
-- ============================================================================

-- ---------- รองรับลิงก์ใช้ได้หลายครั้ง ----------
-- เชิญลูกค้ารายเดียวใช้ครั้งเดียวพอ แต่เชิญน้อง ๆ ทั้งทีมอยากส่งลิงก์เดียว
alter table public.project_invites
  add column if not exists max_uses int default 1 check (max_uses is null or max_uses > 0);

alter table public.project_invites
  add column if not exists use_count int not null default 0 check (use_count >= 0);

comment on column public.project_invites.max_uses is 'null = ใช้ได้ไม่จำกัด';
comment on column public.project_invites.used_at is 'ครั้งล่าสุดที่ถูกใช้';
comment on column public.project_invites.used_by is 'คนล่าสุดที่ใช้';

-- ---------- เจ้าของจัดการลิงก์ของโปรเจกต์ตัวเองได้ ----------
drop policy if exists invites_manage_owner on public.project_invites;
create policy invites_manage_owner on public.project_invites
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ดูว่าลิงก์นี้คืออะไร ----------
-- ต้องเรียกได้ตั้งแต่ยังไม่ล็อกอิน เพราะคนกดลิงก์มาต้องเห็นก่อนว่าจะเข้าอะไร
-- ก่อนตัดสินใจล็อกอิน — คืนแค่ชื่อโปรเจกต์กับสถานะ ไม่คืนอะไรที่เป็นความลับ
create or replace function public.peek_project_invite(p_token text)
returns table (project_name text, member_role public.project_role, valid boolean, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inv public.project_invites;
  v_name text;
begin
  select * into v_inv from public.project_invites where token = p_token;

  if not found then
    return query select null::text, null::public.project_role, false, 'ลิงก์เชิญไม่ถูกต้อง'::text;
    return;
  end if;

  select p.name into v_name from public.projects p where p.id = v_inv.project_id;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    return query select v_name, v_inv.role, false, 'ลิงก์เชิญหมดอายุแล้ว'::text;
    return;
  end if;

  if v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then
    return query select v_name, v_inv.role, false, 'ลิงก์เชิญนี้ถูกใช้ครบจำนวนแล้ว'::text;
    return;
  end if;

  return query select v_name, v_inv.role, true, null::text;
end $$;

grant execute on function public.peek_project_invite(text) to anon, authenticated;

-- ---------- แลกลิงก์เป็นสมาชิก ----------
create or replace function public.redeem_project_invite(p_token text)
returns table (slug text, project_name text, already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.project_invites;
  v_uid uuid := auth.uid();
  v_already boolean;
begin
  if v_uid is null then
    raise exception 'ต้องเข้าสู่ระบบก่อนถึงจะเข้าร่วมโปรเจกต์ได้';
  end if;

  select * into v_inv from public.project_invites where token = p_token;
  if not found then
    raise exception 'ลิงก์เชิญไม่ถูกต้อง';
  end if;

  if v_inv.expires_at is not null and v_inv.expires_at < now() then
    raise exception 'ลิงก์เชิญหมดอายุแล้ว';
  end if;

  select exists (
    select 1 from public.project_members m
    where m.project_id = v_inv.project_id and m.user_id = v_uid
  ) into v_already;

  -- กดลิงก์ซ้ำไม่ควรพัง และไม่ควรกินโควตาการใช้งานเพิ่ม
  if not v_already then
    if v_inv.max_uses is not null and v_inv.use_count >= v_inv.max_uses then
      raise exception 'ลิงก์เชิญนี้ถูกใช้ครบจำนวนแล้ว';
    end if;

    insert into public.project_members (project_id, user_id, role)
    values (v_inv.project_id, v_uid, v_inv.role);

    update public.project_invites
    set use_count = use_count + 1, used_at = now(), used_by = v_uid
    where token = p_token;
  end if;

  return query
    select p.slug, p.name, v_already
    from public.projects p
    where p.id = v_inv.project_id;
end $$;

grant execute on function public.redeem_project_invite(text) to authenticated;

-- ---------- ตรวจผล ----------
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('peek_project_invite', 'redeem_project_invite');
