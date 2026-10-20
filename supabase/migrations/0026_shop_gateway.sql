-- ============================================================================
-- 0026_shop_gateway — จ่ายผ่าน Omise (PromptPay) แล้วยืนยันออร์เดอร์อัตโนมัติ
--
-- เดิม (0024): ลูกค้ากด "โอนแล้ว" → ออร์เดอร์ + แต้มเข้าทันที เจ้าของร้านเช็กยอดเอง
-- ใหม่: กด "ไปจ่ายเงิน" → สร้างออร์เดอร์ payment_status = 'pending' + QR จาก Omise
--       → Omise แจ้งเงินเข้า (webhook) หรือหน้าเว็บถามสถานะ → shop_confirm_payment()
--       → ค่อยนับแต้ม ยอดซื้อ และเข้าสรุป 19:00
--
-- ออร์เดอร์ที่ไม่จ่ายค้างเป็น pending ไปเลย ไม่เข้าสรุป ไม่ได้แต้ม (ไม่ต้องลบ)
-- ร้านที่ยังไม่มีคีย์ Omise ใช้ทางเดิมได้ต่อ (p_pending = false → 'paid' ทันที)
-- ============================================================================

alter table public.shop_orders
  add column if not exists payment_status text not null default 'paid'
    check (payment_status in ('pending', 'paid')),
  add column if not exists charge_id text unique,
  add column if not exists paid_at timestamptz;

create index if not exists shop_orders_charge_idx on public.shop_orders (charge_id);

-- ---------- รับออร์เดอร์ (เพิ่ม p_pending) ----------
-- overload ใหม่ 6 พารามิเตอร์ — ตัว 5 พารามิเตอร์ของ 0024 ยังอยู่ ไม่มีโค้ดเรียกแล้ว
create or replace function public.shop_place_order(
  p_token      uuid,
  p_nickname   text,
  p_slot       text,
  p_items      jsonb,
  p_use_reward boolean,
  p_pending    boolean
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
  ord_id     uuid;
begin
  if nick = '' then raise exception 'shop: nickname required'; end if;
  select * into s from public.shop_settings where id = 1;
  if not (p_slot = any (s.pickup_slots)) then raise exception 'shop: invalid slot'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 20 then
    raise exception 'shop: invalid items';
  end if;

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

  pick := public.shop_next_pickup(now());

  perform pg_advisory_xact_lock(hashtext('shop_orders:' || to_char(pick, 'MMDD')));
  select coalesce(max(split_part(order_no, '-', 2)::int), 0) + 1 into seq
  from public.shop_orders where order_no like to_char(pick, 'MMDD') || '-%';
  ord_no := to_char(pick, 'MMDD') || '-' || lpad(seq::text, 2, '0');

  insert into public.shop_orders
    (order_no, customer_id, nickname, pickup_date, pickup_slot, items, subtotal, discount, total,
     points_earned, reward_used, payment_status, payment_checked, paid_at)
  values
    (ord_no, c.id, nick, pick, p_slot, lines, sub, disc, sub - disc,
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

-- ---------- เงินเข้าแล้ว → ยืนยันออร์เดอร์ + นับแต้ม ----------
-- เรียกได้ซ้ำ (webhook กับหน้าเว็บอาจมาพร้อมกัน) — ล็อกแถวแล้วทำครั้งเดียว
-- p_amount เป็นสตางค์ ต้องตรงกับยอดออร์เดอร์เป๊ะ ไม่งั้นไม่ยืนยัน
create or replace function public.shop_confirm_payment(
  p_order_id  uuid,
  p_charge_id text,
  p_amount    int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.shop_orders;
  c public.shop_customers;
begin
  select * into o from public.shop_orders where id = p_order_id for update;
  if not found then raise exception 'shop: order not found'; end if;

  if o.payment_status = 'pending' then
    if o.charge_id is distinct from p_charge_id then raise exception 'shop: charge mismatch'; end if;
    if p_amount <> o.total * 100 then raise exception 'shop: amount mismatch'; end if;

    update public.shop_orders
       set payment_status = 'paid', payment_checked = true, paid_at = now()
     where id = o.id;

    if o.status <> 'cancelled' then
      update public.shop_customers set
        points        = greatest(0, points - case when o.reward_used then 10 else 0 end + o.points_earned),
        rewards_used  = rewards_used + case when o.reward_used then 1 else 0 end,
        total_spent   = total_spent + o.total,
        last_order_at = now()
      where id = o.customer_id;
    end if;
  end if;

  select * into c from public.shop_customers where id = o.customer_id;
  return jsonb_build_object(
    'orderNo', o.order_no, 'code', c.code, 'pickupDate', o.pickup_date, 'slot', o.pickup_slot,
    'total', o.total, 'earned', o.points_earned, 'points', c.points, 'paymentStatus', 'paid'
  );
end;
$$;

-- ---------- ยกเลิก = คืนแต้ม เฉพาะออร์เดอร์ที่จ่ายแล้ว (pending ยังไม่เคยได้แต้ม) ----------
create or replace function public.shop_order_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled' and old.payment_status = 'paid' then
    update public.shop_customers set
      points       = greatest(0, points - old.points_earned + case when old.reward_used then 10 else 0 end),
      rewards_used = greatest(0, rewards_used - case when old.reward_used then 1 else 0 end),
      total_spent  = greatest(0, total_spent - old.total)
    where id = old.customer_id;
  end if;
  return new;
end;
$$;

revoke all on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean) from public, anon, authenticated;
grant execute on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean) to service_role;
revoke all on function public.shop_confirm_payment(uuid, text, int) from public, anon, authenticated;
grant execute on function public.shop_confirm_payment(uuid, text, int) to service_role;
