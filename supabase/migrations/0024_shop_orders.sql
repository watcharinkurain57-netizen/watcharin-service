-- ============================================================================
-- 0024_shop_orders — ร้านแซลดอง กุ้งแช่: ออร์เดอร์ ลูกค้า แต้มสะสม
--
-- ลูกค้าเปิด /shop จากปุ่มในไลน์ร้าน → เลือกเมนู → สแกนพร้อมเพย์ → กดยืนยัน จบ
-- ปิดรับ 19:00 รับของวันทำการถัดไป · 1 กล่อง = 1 แต้ม · ครบ 10 แลกฟรี 1 กล่อง
--
-- ---------------------------------------------------------------------------
-- ⚠️ ลูกค้า **ไม่ได้ล็อกอิน** โดยตั้งใจ (เจ้าของร้านอยากให้กดน้อยที่สุด)
--
-- จึงไม่มี policy ให้ anon/authenticated อ่านหรือเขียนตารางเหล่านี้เลย
-- ทุกอย่างผ่าน route ฝั่งเซิร์ฟเวอร์ (/api/shop/*) ที่ใช้ SUPABASE_SECRET_KEY
-- แล้วเรียก shop_place_order() ซึ่งเป็นที่เดียวที่คิดราคาและแต้ม
-- → ราคาที่ส่งมาจากเบราว์เซอร์ไม่ถูกใช้เลย คิดใหม่จาก shop_menu ทุกครั้ง
--
-- ตัวตนลูกค้า = token (uuid สุ่ม) ที่มือถือเก็บไว้ ไม่ใช่รหัส S001
-- เพราะรหัสเรียงเลขเดาได้ ถ้าใช้รหัสเป็นกุญแจ ใครก็แลกแต้มของคนอื่นได้
-- ---------------------------------------------------------------------------
--
-- ---------------------------------------------------------------------------
-- ⚠️ ไม่ได้ตรวจสลิปอัตโนมัติ — แต้มเข้าทันทีที่กดยืนยัน
-- เจ้าของร้านเทียบยอดโอนรวมกับสรุป 19:00 เอง ถ้าออร์เดอร์ไหนไม่มีเงินเข้า
-- เปลี่ยน status เป็น 'cancelled' → trigger คืนแต้มให้ถูกต้องเอง (ข้างล่าง)
-- ---------------------------------------------------------------------------
-- ============================================================================

-- ---------- ตั้งค่าร้าน (แถวเดียว) ----------
create table if not exists public.shop_settings (
  id           int primary key default 1 check (id = 1),
  shop_name    text not null default 'แซลดอง กุ้งแช่',
  -- เบอร์มือถือ / เลขบัตร 13 หลัก / e-wallet 15 หลัก ที่ผูกพร้อมเพย์
  promptpay_id text not null default '' check (promptpay_id ~ '^[0-9]*$'),
  cutoff_hour  int  not null default 19 check (cutoff_hour between 0 and 23),
  -- 0 = อาทิตย์ ... 6 = เสาร์ (ตาม extract(dow))
  open_days    int[] not null default '{1,2,3,4,5}',
  pickup_slots text[] not null default '{11:00,11:30,12:00,12:30,13:00,15:00,17:00,17:30}',
  updated_at   timestamptz not null default now()
);
insert into public.shop_settings (id) values (1) on conflict (id) do nothing;

-- ---------- เมนู ----------
create table if not exists public.shop_menu (
  id          uuid primary key default gen_random_uuid(),
  sort        int  not null default 0,
  name        text not null unique check (length(btrim(name)) > 0),
  description text not null default '',
  price       int  not null check (price > 0),
  points      int  not null default 1 check (points >= 0),
  -- ใช้แต้มแลกฟรีได้ไหม (เซ็ตรวมไม่ได้ เพราะต้นทุนสูงเกิน)
  redeemable  boolean not null default true,
  -- เอาติ๊กออกวันที่ไม่ทำเมนูนั้น
  available   boolean not null default true
);
insert into public.shop_menu (sort, name, description, price, points, redeemable) values
  (1, 'แซลมอนดองซีอิ๊ว', 'เนื้อ 150 ก. + น้ำดอง', 249, 1, true),
  (2, 'กุ้งดองซีอิ๊ว', '10 ตัว', 199, 1, true),
  (3, 'กุ้งแช่น้ำปลา', '10 ตัว + น้ำยำ ผัก', 169, 1, true),
  (4, 'ซาชิมิแซลมอน', '100 ก. วาซาบิ โชยุ', 179, 1, true),
  (5, 'เซ็ตรวม', 'แซลมอนดอง กุ้งดอง ซาชิมิ ไซซ์เล็ก', 399, 2, false)
on conflict (name) do nothing;

-- ---------- ลูกค้า ----------
create sequence if not exists public.shop_customer_seq;

create table if not exists public.shop_customers (
  id            uuid primary key default gen_random_uuid(),
  -- รหัสไว้คุยกับลูกค้า ("รหัส S014 ค่ะ") — ไม่ใช่กุญแจ
  code          text not null unique default ('S' || lpad(nextval('public.shop_customer_seq')::text, 3, '0')),
  -- กุญแจจริง เก็บในมือถือลูกค้า
  token         uuid not null unique default gen_random_uuid(),
  nickname      text not null check (length(btrim(nickname)) between 1 and 30),
  points        int  not null default 0 check (points >= 0),
  rewards_used  int  not null default 0,
  total_spent   int  not null default 0,
  -- แพ้อาหาร ฯลฯ เจ้าของร้านเติมเอง
  note          text not null default '',
  created_at    timestamptz not null default now(),
  last_order_at timestamptz
);

-- ---------- ออร์เดอร์ ----------
create table if not exists public.shop_orders (
  id              uuid primary key default gen_random_uuid(),
  order_no        text not null unique,
  customer_id     uuid not null references public.shop_customers (id) on delete restrict,
  nickname        text not null,
  pickup_date     date not null,
  pickup_slot     text not null,
  -- [{name, qty, price, points}] ราคา ณ ตอนสั่ง
  items           jsonb not null,
  subtotal        int  not null,
  discount        int  not null default 0,
  total           int  not null,
  points_earned   int  not null default 0,
  reward_used     boolean not null default false,
  -- ติ๊กเองหลังเช็กยอดในแอปธนาคาร
  payment_checked boolean not null default false,
  status          text not null default 'new' check (status in ('new', 'done', 'cancelled')),
  created_at      timestamptz not null default now()
);

create index if not exists shop_orders_pickup_idx on public.shop_orders (pickup_date, pickup_slot);
create index if not exists shop_orders_customer_idx on public.shop_orders (customer_id, created_at desc);

-- ---------- RLS: ปิดหมดสำหรับ anon · แอดมินเว็บอ่าน/แก้ได้ ----------
alter table public.shop_settings  enable row level security;
alter table public.shop_menu      enable row level security;
alter table public.shop_customers enable row level security;
alter table public.shop_orders    enable row level security;

drop policy if exists shop_settings_admin on public.shop_settings;
create policy shop_settings_admin on public.shop_settings
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists shop_menu_admin on public.shop_menu;
create policy shop_menu_admin on public.shop_menu
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists shop_customers_admin on public.shop_customers;
create policy shop_customers_admin on public.shop_customers
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());
drop policy if exists shop_orders_admin on public.shop_orders;
create policy shop_orders_admin on public.shop_orders
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

-- ---------- วันรับของถัดไป ----------
-- สั่งก่อน cutoff → วันเปิดแรกตั้งแต่พรุ่งนี้ · หลัง cutoff → ตั้งแต่มะรืน
-- คิดเวลาไทยเสมอ ไม่ขึ้นกับ timezone ของเซิร์ฟเวอร์
create or replace function public.shop_next_pickup(p_at timestamptz default now())
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  s     public.shop_settings;
  local timestamp := p_at at time zone 'Asia/Bangkok';
  d     date;
  i     int := 0;
begin
  select * into s from public.shop_settings where id = 1;
  d := local::date + case when extract(hour from local) >= s.cutoff_hour then 2 else 1 end;
  while not (extract(dow from d)::int = any (s.open_days)) and i < 7 loop
    d := d + 1;
    i := i + 1;
  end loop;
  return d;
end;
$$;

-- ---------- รับออร์เดอร์ (ที่เดียวที่คิดเงินและแต้ม) ----------
create or replace function public.shop_place_order(
  p_token      uuid,
  p_nickname   text,
  p_slot       text,
  p_items      jsonb,
  p_use_reward boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s          public.shop_settings;
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
  seq        int;
  ord_no     text;
begin
  if nick = '' then raise exception 'shop: nickname required'; end if;
  select * into s from public.shop_settings where id = 1;
  if not (p_slot = any (s.pickup_slots)) then raise exception 'shop: invalid slot'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'shop: invalid items';
  end if;

  -- คิดราคาจาก shop_menu เท่านั้น
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

  -- ลูกค้า: token เดิม หรือสร้างใหม่ (ล็อกแถวกันกดซ้ำพร้อมกัน)
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

  pick := public.shop_next_pickup(now());

  -- เลขออร์เดอร์ = วันรับ + ลำดับ เช่น 1016-03
  -- นับจากเลขที่ออกไปแล้ว ไม่ใช่จาก pickup_date เพราะเจ้าของร้านอาจย้ายวันรับ
  -- ของออร์เดอร์เก่าเอง แล้วเลขจะชนกัน (เจอจริงตอนทดสอบ)
  perform pg_advisory_xact_lock(hashtext('shop_orders:' || to_char(pick, 'MMDD')));
  select coalesce(max(split_part(order_no, '-', 2)::int), 0) + 1 into seq
  from public.shop_orders where order_no like to_char(pick, 'MMDD') || '-%';
  ord_no := to_char(pick, 'MMDD') || '-' || lpad(seq::text, 2, '0');

  insert into public.shop_orders
    (order_no, customer_id, nickname, pickup_date, pickup_slot, items, subtotal, discount, total, points_earned, reward_used)
  values
    (ord_no, c.id, nick, pick, p_slot, lines, sub, disc, sub - disc, pts, reward);

  update public.shop_customers set
    nickname      = nick,
    points        = points - case when reward then 10 else 0 end + pts,
    rewards_used  = rewards_used + case when reward then 1 else 0 end,
    total_spent   = total_spent + (sub - disc),
    last_order_at = now()
  where id = c.id
  returning * into c;

  return jsonb_build_object(
    'orderNo', ord_no, 'code', c.code, 'token', c.token,
    'pickupDate', pick, 'total', sub - disc, 'discount', disc,
    'earned', pts, 'points', c.points
  );
end;
$$;

-- ---------- ยกเลิก = คืนแต้ม ----------
create or replace function public.shop_order_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    update public.shop_customers set
      points       = greatest(0, points - old.points_earned + case when old.reward_used then 10 else 0 end),
      rewards_used = greatest(0, rewards_used - case when old.reward_used then 1 else 0 end),
      total_spent  = greatest(0, total_spent - old.total)
    where id = old.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists shop_order_cancelled on public.shop_orders;
create trigger shop_order_cancelled
  after update of status on public.shop_orders
  for each row execute function public.shop_order_cancelled();

-- เรียกได้จากเซิร์ฟเวอร์ (service role) เท่านั้น
revoke all on function public.shop_place_order(uuid, text, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.shop_place_order(uuid, text, text, jsonb, boolean) to service_role;
revoke all on function public.shop_order_cancelled() from public, anon, authenticated;
