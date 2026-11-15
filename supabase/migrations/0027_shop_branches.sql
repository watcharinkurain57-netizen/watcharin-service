-- ============================================================================
-- 0027_shop_branches — หลายสาขา แต่ละสาขามีไลน์ร้าน (LINE OA) ของตัวเอง
--
-- นามบัตรแต่ละที่ = QR ไลน์ของสาขานั้น → ปุ่ม "สั่งอาหาร" ในไลน์สาขา เปิด /shop/<slug>
-- แต่ละสาขาตั้งเวลาปิดรับ วันที่รับของ วันหยุดพิเศษ และรอบเวลารับ เองได้
-- สรุปออร์เดอร์แยกสาขา ส่งตอนปิดรับของสาขานั้น ผ่านไลน์ของสาขานั้น (/api/shop/summary)
--
-- ใช้ร่วมกันทุกสาขา: ชื่อร้าน พร้อมเพย์ (shop_settings) เมนู ราคา ลูกค้าและแต้มสะสม
-- คีย์ไลน์ของแต่ละสาขา (channel access token) อยู่ใน env ของ Vercel ไม่อยู่ในตารางนี้
--
-- shop_settings.cutoff_hour / open_days / pickup_slots เลิกใช้แล้ว (ย้ายมาอยู่ที่สาขา)
-- ไม่ลบคอลัมน์ทิ้ง เผื่อย้อนกลับ
-- ============================================================================

create table if not exists public.shop_branches (
  id           uuid primary key default gen_random_uuid(),
  sort         int  not null default 0,
  -- ลิงก์หน้าร้าน /shop/<slug> — ตัวเล็ก ตัวเลข ขีด
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,29}$'),
  -- นำหน้าเลขออร์เดอร์ เช่น A1016-03 — ตัวใหญ่ 1-2 ตัว
  code         text not null unique check (code ~ '^[A-Z]{1,2}$'),
  -- ชื่อสาขาไม่ต้องมีคำว่า "สาขา" (หน้าเว็บเติมให้) เช่น 'ชินวัตร 3'
  name         text not null check (length(btrim(name)) > 0),
  -- ไลน์ร้านของสาขา เช่น @463zgiwx (ใช้ในข้อความ OpenChat)
  line_id      text not null default '',
  -- LIFF ของสาขา (endpoint = https://<โดเมน>/shop/<slug>) ไม่ใช่ความลับ · ว่าง = ลูกค้าพิมพ์ชื่อเอง
  liff_id      text not null default '',
  -- ลิงก์ OpenChat ของสาขา (https://line.me/ti/g2/...) · ว่าง = ไม่โชว์ปุ่มเข้ากลุ่ม
  openchat_url text not null default '' check (openchat_url = '' or openchat_url ~ '^https://'),
  -- จุดรับของ เช่น 'ล็อบบี้ชั้น 1'
  pickup_note  text not null default '',
  -- ปิดรับออร์เดอร์ของ "พรุ่งนี้" กี่โมง (เวลาไทย)
  cutoff_hour  int  not null default 19 check (cutoff_hour between 0 and 23),
  -- วันที่รับของได้ 0 = อาทิตย์ ... 6 = เสาร์ (ตาม extract(dow) เหมือน shop_settings)
  open_days    int[] not null default '{1,2,3,4,5}' check (open_days <@ '{0,1,2,3,4,5,6}'),
  -- วันหยุดพิเศษ ไม่รับของ เช่น '{2026-12-31,2027-01-01}'
  closed_dates date[] not null default '{}',
  pickup_slots text[] not null default '{11:00,11:30,12:00,12:30,13:00,15:00,17:00,17:30}'
                check (cardinality(pickup_slots) > 0),
  -- false = ปิดรับออร์เดอร์ชั่วคราว (ออร์เดอร์ที่สั่งไว้แล้วยังส่งสรุปตามปกติ)
  accepting    boolean not null default true,
  created_at   timestamptz not null default now()
);

-- สาขาแรก = ร้านเดิม (ไลน์ @463zgiwx) ใช้เวลาเดิมจาก shop_settings
insert into public.shop_branches (sort, slug, code, name, line_id, cutoff_hour, open_days, pickup_slots)
select 1, 'shinawatra3', 'A', 'ชินวัตร 3', '@463zgiwx', s.cutoff_hour, s.open_days, s.pickup_slots
from public.shop_settings s
where s.id = 1
on conflict (slug) do nothing;

alter table public.shop_branches enable row level security;
drop policy if exists shop_branches_admin on public.shop_branches;
create policy shop_branches_admin on public.shop_branches
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

-- ---------- ออร์เดอร์เป็นของสาขา ----------
alter table public.shop_orders
  add column if not exists branch_id uuid references public.shop_branches (id) on delete restrict;
-- ออร์เดอร์ที่มีอยู่ก่อนหน้า = สาขาแรก
update public.shop_orders
   set branch_id = (select id from public.shop_branches order by sort, created_at limit 1)
 where branch_id is null;
alter table public.shop_orders alter column branch_id set not null;
create index if not exists shop_orders_branch_pickup_idx on public.shop_orders (branch_id, pickup_date);

-- ---------- วันรับของถัดไปของสาขา ----------
-- สั่งก่อน cutoff → วันเปิดแรกตั้งแต่พรุ่งนี้ · หลัง cutoff → ตั้งแต่มะรืน
-- = ออร์เดอร์ของวัน P ปิดรับตอน cutoff ของวันก่อนหน้า P เสมอ (สรุปส่งตอนนั้น)
-- ข้ามวันที่ไม่อยู่ใน open_days และวันใน closed_dates
-- ปิดรับชั่วคราว หรือไม่มีวันเปิดใน 60 วัน = null
create or replace function public.shop_branch_pickup(p_branch uuid, p_at timestamptz default now())
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  b     public.shop_branches;
  local timestamp := p_at at time zone 'Asia/Bangkok';
  d     date;
  i     int := 0;
begin
  select * into b from public.shop_branches where id = p_branch;
  if not found or not b.accepting then return null; end if;
  d := local::date + case when extract(hour from local) >= b.cutoff_hour then 2 else 1 end;
  while not (extract(dow from d)::int = any (b.open_days)) or d = any (b.closed_dates) loop
    i := i + 1;
    if i > 60 then return null; end if;
    d := d + 1;
  end loop;
  return d;
end;
$$;

-- ---------- รับออร์เดอร์ (เพิ่ม p_branch = slug ของสาขา) ----------
create or replace function public.shop_place_order(
  p_token      uuid,
  p_nickname   text,
  p_slot       text,
  p_items      jsonb,
  p_use_reward boolean,
  p_pending    boolean,
  p_branch     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b          public.shop_branches;
  c          public.shop_customers;
  nick       text := left(btrim(coalesce(p_nickname, '')), 30);
  it         jsonb;
  m          public.shop_menu;
  q          int;
  lines      jsonb := '[]'::jsonb;
  sub        int := 0;
  pts        int := 0;
  best       public.shop_menu;
  disc       int := 0;
  reward     boolean := false;
  pick       date;
  prefix     text;
  seq        int;
  ord_no     text;
  ord_id     uuid;
begin
  if nick = '' then raise exception 'shop: nickname required'; end if;
  select * into b from public.shop_branches where slug = p_branch;
  if not found then raise exception 'shop: unknown branch'; end if;
  if not (p_slot = any (b.pickup_slots)) then raise exception 'shop: invalid slot'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'shop: invalid items';
  end if;

  pick := public.shop_branch_pickup(b.id, now());
  if pick is null then raise exception 'shop: branch closed'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into m from public.shop_menu where name = it->>'name' and available;
    if not found then raise exception 'shop: unknown item %', it->>'name'; end if;
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 20 then raise exception 'shop: invalid qty'; end if;
    lines := lines || jsonb_build_object('name', m.name, 'qty', q, 'price', m.price, 'points', m.points);
    sub := sub + m.price * q;
    pts := pts + m.points * q;
    if m.redeemable and (best.id is null or m.price > best.price) then best := m; end if;
  end loop;

  if p_token is not null then
    select * into c from public.shop_customers where token = p_token for update;
  end if;
  if c.id is null then
    insert into public.shop_customers (nickname) values (nick) returning * into c;
  end if;

  if p_use_reward and c.points >= 10 and best.id is not null then
    reward := true;
    disc := best.price;
    pts := pts - best.points;
  end if;

  -- เลขออร์เดอร์ = รหัสสาขา + วันรับ + ลำดับของสาขานั้น เช่น A1016-03
  prefix := b.code || to_char(pick, 'MMDD');
  perform pg_advisory_xact_lock(hashtext('shop_orders:' || prefix));
  select coalesce(max(split_part(order_no, '-', 2)::int), 0) + 1 into seq
  from public.shop_orders where order_no like prefix || '-%';
  ord_no := prefix || '-' || lpad(seq::text, 2, '0');

  insert into public.shop_orders
    (order_no, branch_id, customer_id, nickname, pickup_date, pickup_slot, items, subtotal, discount, total,
     points_earned, reward_used, payment_status, payment_checked, paid_at)
  values
    (ord_no, b.id, c.id, nick, pick, p_slot, lines, sub, disc, sub - disc,
     pts, reward,
     case when p_pending then 'pending' else 'paid' end,
     false,
     case when p_pending then null else now() end)
  returning id into ord_id;

  update public.shop_customers set nickname = nick where id = c.id;

  if not p_pending then
    update public.shop_customers set
      points        = greatest(0, points - case when reward then 10 else 0 end + pts),
      rewards_used  = rewards_used + case when reward then 1 else 0 end,
      total_spent   = total_spent + (sub - disc),
      last_order_at = now()
    where id = c.id
    returning * into c;
  end if;

  return jsonb_build_object(
    'orderId', ord_id, 'orderNo', ord_no, 'code', c.code, 'token', c.token,
    'pickupDate', pick, 'slot', p_slot, 'total', sub - disc, 'discount', disc,
    'earned', pts, 'points', c.points,
    'paymentStatus', case when p_pending then 'pending' else 'paid' end
  );
end;
$$;

-- ตัว 6 พารามิเตอร์ของ 0026 (โค้ดรุ่นก่อนมีสาขา) → สั่งเข้าสาขาแรก
create or replace function public.shop_place_order(
  p_token      uuid,
  p_nickname   text,
  p_slot       text,
  p_items      jsonb,
  p_use_reward boolean,
  p_pending    boolean
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.shop_place_order(
    p_token, p_nickname, p_slot, p_items, p_use_reward, p_pending,
    (select slug from public.shop_branches order by sort, created_at limit 1)
  );
$$;

revoke all on function public.shop_branch_pickup(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.shop_branch_pickup(uuid, timestamptz) to service_role;
revoke all on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean, text) from public, anon, authenticated;
grant execute on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean, text) to service_role;
revoke all on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean) from public, anon, authenticated;
grant execute on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean) to service_role;
