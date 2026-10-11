# ร้านแซลดอง กุ้งแช่ — เปิดระบบสั่งซื้อ /shop

ลูกค้า: ปุ่ม "สั่งอาหาร" ในไลน์ร้าน → `watcharin-service.com/shop` → เลือกเมนู → สแกน QR พร้อมเพย์ (ยอดขึ้นเอง) → กด "โอนแล้ว" จบ
ร้าน: 19:05 ได้สรุปเข้าไลน์ (เฉพาะวันที่พรุ่งนี้มีของต้องส่ง) · ข้อมูลทั้งหมดอยู่ใน Supabase

> ลำดับสำคัญ: ทำข้อ 1–3 ก่อน merge ไม่งั้น /shop ขึ้นว่ายังไม่เปิด (ไม่พัง แต่ใช้ไม่ได้)

## 1. ฐานข้อมูล
Supabase (prod) → SQL Editor → วาง `supabase/migrations/0024_shop_orders.sql` ทั้งไฟล์ → Run
(ต้องมี `is_app_admin()` จาก 0003 อยู่แล้ว)

แล้วใส่เลขพร้อมเพย์:
```sql
update public.shop_settings set promptpay_id = '0XXXXXXXXX' where id = 1;
```

## 2. env บน Vercel (Production) แล้ว redeploy
| ชื่อ | ค่า |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของ project (ถ้ายังไม่มี) |
| `SUPABASE_SECRET_KEY` | Settings → API Keys → secret key (**ห้ามขึ้นต้นด้วย NEXT_PUBLIC_**) |
| `CRON_SECRET` | ตั้งเอง ยาว ๆ (ถ้ามีอยู่แล้วจาก meeting-reminders ใช้ตัวเดิม) |
| `SHOP_LINE_CHANNEL_TOKEN` | LINE Developers → channel ของร้าน → Messaging API → Channel access token |
| `SHOP_LINE_TO` | LINE Developers → Basic settings → Your user ID (ขึ้นต้นด้วย U) |

ทางเลือก: `SHOP_SUMMARY_EMAIL` ถ้าอยากได้สรุปทางอีเมลด้วย (ใช้ Resend ที่มีอยู่)

## 3. ตั้งเวลาสรุป
แก้ `<CRON_SECRET>` ใน `supabase/cron_shop_summary.sql` → วางใน SQL Editor → Run

## 4. LINE Official Account
1. manager.line.biz → สร้างบัญชีร้าน (แพ็กเกจ Free)
2. ตั้งค่า → Messaging API → เปิดใช้งาน (ได้ channel สำหรับข้อ 2)
3. Rich menu → ปุ่ม "สั่งอาหาร" → ลิงก์ `https://watcharin-service.com/shop` → แสดงตลอด
4. นามบัตร: ใช้ QR เพิ่มเพื่อนของไลน์ร้าน

แพ็กเกจฟรีส่ง push ได้ 200 ข้อความ/เดือน สรุปวันละ 1 ข้อความใช้ ~22

## ใช้งานทุกวัน (Supabase → Table Editor)
- `shop_menu`: แก้ราคา · เอาติ๊ก `available` ออกวันที่ไม่ทำเมนูนั้น
- `shop_orders`: เทียบยอดกับแอปธนาคาร ติ๊ก `payment_checked` · ไม่มีเงินเข้า/ยกเลิก → `status = cancelled` (แต้มคืนให้อัตโนมัติ)
- `shop_customers`: ดูแต้ม รหัสลูกค้า · เติม `note` เรื่องแพ้อาหาร
- `shop_settings`: เวลาปิดรับ วันรับของ (`open_days` 0=อาทิตย์) รอบเวลารับ

## สิ่งที่ระบบไม่ได้ทำ
- ไม่ตรวจสลิปอัตโนมัติ (บริการตรวจสลิปเสียเงิน) — แต้มเข้าทันที ยกเลิกแล้วคืนเอง
- ลูกค้าไม่ต้องล็อกอิน: มือถือจำ token ไว้ เปลี่ยนเครื่อง = เริ่มรหัสใหม่ (ย้ายแต้มให้ได้ใน `shop_customers`)
