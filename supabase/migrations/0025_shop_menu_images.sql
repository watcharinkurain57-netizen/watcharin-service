-- ============================================================================
-- 0025_shop_menu_images — รูปเมนูหน้าร้าน /shop
--
-- เจ้าของร้านอัปโหลดรูปเองใน Supabase → Storage → bucket "shop-menu"
-- แล้วก๊อป public URL มาวางในช่อง shop_menu.image_url (ว่าง = แสดงกรอบสีแทน)
--
-- bucket เป็น public เพราะรูปเมนูไม่ใช่ข้อมูลลับ และให้ LINE in-app browser
-- โหลดรูปได้ตรง ๆ ไม่ต้องขอ signed URL ทุกครั้ง
-- ไม่มี policy ให้ anon เขียน — อัปโหลดได้จากหน้า dashboard (หรือ service role) เท่านั้น
-- ============================================================================

alter table public.shop_menu add column if not exists image_url text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-menu', 'shop-menu', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
