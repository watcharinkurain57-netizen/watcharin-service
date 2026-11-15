-- จำลูกค้าด้วยบัญชีไลน์ — ลูกค้าที่เปิดหน้าร้านจากปุ่ม "สั่งอาหาร" ในไลน์ร้าน (LIFF)
-- บัตรลูกค้าผูกกับบัญชีไลน์ แต้มกับประวัติติดตัวลูกค้าแม้เปลี่ยนมือถือ
--
-- เก็บแค่ userId ของไลน์ (U + 32 ตัว เฉพาะ provider ของร้าน ใช้กับร้านอื่นไม่ได้)
-- ไม่เก็บชื่อจริง เบอร์ อีเมล หรือรูปโปรไฟล์ · เว็บเช็ก userId กับไลน์เองทุกครั้ง (ไม่เชื่อค่าที่หน้าเว็บส่งมา)
-- ว่าง = ลูกค้าที่สั่งจากเบราว์เซอร์ทั่วไป (มือถือจำไว้แบบเดิม)

alter table public.shop_customers add column if not exists line_user_id text;

alter table public.shop_customers
  add constraint shop_customers_line_user_id_format check (line_user_id is null or line_user_id ~ '^U[0-9a-f]{32}$');

-- บัญชีไลน์หนึ่งบัญชี = บัตรลูกค้าใบเดียว (ค่าว่างซ้ำกันได้)
create unique index if not exists shop_customers_line_user_id_key on public.shop_customers (line_user_id);
