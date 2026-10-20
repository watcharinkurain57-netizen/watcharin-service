-- สาขาที่ส่งถึงที่ (เช่น บางกรวย): ลูกค้าใส่ที่อยู่ + เบอร์โทร (+ ตำแหน่งในแผนที่ถ้าอยากใส่)
-- ขึ้นในสรุปออร์เดอร์ให้เจ้าของร้านไปส่ง · สาขาที่ลูกค้ามารับเองไม่เปลี่ยนอะไร
--
-- เปิดให้สาขาไหนส่งถึงที่: update public.shop_branches set delivery = true where slug = 'bangkruai';
-- รอบเวลา (pickup_slots) ของสาขาส่งถึงที่ = เวลาส่ง

alter table public.shop_branches
  add column if not exists delivery boolean not null default false;

alter table public.shop_orders
  add column if not exists delivery_address text not null default ''
    constraint shop_orders_delivery_address_len check (char_length(delivery_address) <= 300),
  add column if not exists delivery_phone text not null default ''
    constraint shop_orders_delivery_phone_fmt check (delivery_phone = '' or delivery_phone ~ '^0[0-9]{8,9}$'),
  -- "lat,lng" จากปุ่ม "ใช้ตำแหน่งตอนนี้" ในหน้าร้าน ไม่ใส่ = ''
  add column if not exists delivery_map text not null default ''
    constraint shop_orders_delivery_map_fmt check (
      delivery_map = '' or delivery_map ~ '^-?[0-9]{1,2}(\.[0-9]{1,7})?,-?[0-9]{1,3}(\.[0-9]{1,7})?$'
    );

-- ---------- รับออร์เดอร์ + ที่อยู่ส่ง (ตัว 8 พารามิเตอร์ — หน้าร้านเรียกตัวนี้ทุกสาขา) ----------
-- p_delivery = {"address": "...", "phone": "...", "map": "lat,lng"} · สาขาที่ไม่ได้ส่งถึงที่ไม่สนค่านี้
-- ทั้งหมดอยู่ในคำสั่งเดียว: ที่อยู่ไม่ผ่าน = ไม่มีออร์เดอร์เกิดขึ้น แต้มไม่ขยับ
create or replace function public.shop_place_order(
  p_token      uuid,
  p_nickname   text,
  p_slot       text,
  p_items      jsonb,
  p_use_reward boolean,
  p_pending    boolean,
  p_branch     text,
  p_delivery   jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dlv   boolean;
  addr  text := left(btrim(regexp_replace(coalesce(p_delivery->>'address', ''), '\s+', ' ', 'g')), 300);
  phone text := regexp_replace(coalesce(p_delivery->>'phone', ''), '[^0-9]', '', 'g');
  pin   text := btrim(coalesce(p_delivery->>'map', ''));
  res   jsonb;
begin
  select delivery into dlv from public.shop_branches where slug = p_branch;

  if coalesce(dlv, false) then
    if char_length(addr) < 5 then raise exception 'shop: address required'; end if;
    -- +66 81 234 5678 → 0812345678
    if phone ~ '^66[0-9]{8,9}$' then phone := '0' || substr(phone, 3); end if;
    if phone !~ '^0[0-9]{8,9}$' then raise exception 'shop: invalid phone'; end if;
    -- ตำแหน่งไม่บังคับ — รูปแบบแปลก ๆ ทิ้งไป ไม่ทำให้สั่งไม่ได้
    if pin !~ '^-?[0-9]{1,2}(\.[0-9]{1,7})?,-?[0-9]{1,3}(\.[0-9]{1,7})?$' then pin := ''; end if;
  end if;

  res := public.shop_place_order(p_token, p_nickname, p_slot, p_items, p_use_reward, p_pending, p_branch);

  if coalesce(dlv, false) then
    update public.shop_orders
       set delivery_address = addr, delivery_phone = phone, delivery_map = pin
     where id = (res->>'orderId')::uuid;
  end if;

  return res || jsonb_build_object('delivery', coalesce(dlv, false));
end;
$$;

revoke all on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean, text, jsonb) from public, anon, authenticated;
grant execute on function public.shop_place_order(uuid, text, text, jsonb, boolean, boolean, text, jsonb) to service_role;
