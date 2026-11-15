-- ช่องทางติดต่อร้านที่แสดงในหน้า /shop/info (ผู้ให้บริการรับชำระเงินขอชื่อ ที่อยู่ เบอร์โทร อีเมล)
--
-- ค่าจริงอยู่ในฐานข้อมูลเท่านั้น ห้ามใส่ใน repo (repo เป็นสาธารณะ)
-- ว่าง = ไม่แสดงบรรทัดนั้น · หน้าเว็บอ่านแยกจากการสั่งซื้อ ถ้ายังไม่รัน migration นี้ หน้าร้านยังสั่งได้ตามปกติ
--
-- contact_name:    ชื่อเจ้าของร้าน (เว้นว่างได้ หน้าเว็บแสดงชื่อร้านอยู่แล้ว)
-- contact_address: ที่อยู่ร้าน/สถานที่ผลิต
-- contact_phone:   เบอร์โทร เช่น 081-234-5678
-- contact_email:   อีเมลติดต่อร้าน

alter table public.shop_settings
  add column if not exists contact_name text not null default '',
  add column if not exists contact_address text not null default '',
  add column if not exists contact_phone text not null default ''
    constraint shop_settings_contact_phone_fmt check (contact_phone = '' or contact_phone ~ '^\+?[0-9][0-9 -]{7,18}$'),
  add column if not exists contact_email text not null default ''
    constraint shop_settings_contact_email_fmt check (contact_email = '' or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
