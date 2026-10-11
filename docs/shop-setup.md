# ร้านแซลดอง กุ้งแช่ — เปิดระบบสั่งซื้อ /shop

ลูกค้า: ปุ่ม "สั่งอาหาร" ในไลน์ร้าน → `watcharin-service.com/shop` → เลือกเมนู → สแกน QR พร้อมเพย์ (ยอดขึ้นเอง) → จ่ายแล้วหน้าเว็บขึ้น "รับออร์เดอร์แล้ว" เอง (ผ่าน Omise)
ยังไม่ตั้ง Omise: ใช้ QR พร้อมเพย์ของร้านแทน ลูกค้ากด "โอนแล้ว" แล้วร้านเช็กยอดเอง
ร้าน: 19:05 ได้สรุปเข้าไลน์ (เฉพาะวันที่พรุ่งนี้มีของต้องส่ง) · ข้อมูลทั้งหมดอยู่ใน Supabase

> ลำดับสำคัญ: ทำข้อ 1–3 ก่อน merge ไม่งั้น /shop ขึ้นว่ายังไม่เปิด (ไม่พัง แต่ใช้ไม่ได้)

## 1. ฐานข้อมูล
Supabase (prod) → SQL Editor → วาง `supabase/migrations/0024_shop_orders.sql` ทั้งไฟล์ → Run
ตามด้วย `0025_shop_menu_images.sql` และ `0026_shop_gateway.sql`
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
| `SHOP_LINE_TO` | LINE Developers → Basic settings → Your user ID (ขึ้นต้นด้วย U) · เป็นค่าเดียวกันทุก OA ที่อยู่ใต้ Provider เดียวกัน (Watcharin Service) |

ทางเลือก: `SHOP_SUMMARY_EMAIL` ถ้าอยากได้สรุปทางอีเมลด้วย (ใช้ Resend ที่มีอยู่)

## 3. ตั้งเวลาสรุป
แก้ `<CRON_SECRET>` ใน `supabase/cron_shop_summary.sql` → วางใน SQL Editor → Run

## 4. LINE Official Account
1. manager.line.biz → สร้างบัญชีร้าน (แพ็กเกจ Free)
2. ตั้งค่า → Messaging API → เปิดใช้งาน (ได้ channel สำหรับข้อ 2)
3. Rich menu → ปุ่ม "สั่งอาหาร" → ลิงก์ `https://watcharin-service.com/shop` → แสดงตลอด
4. นามบัตร: ใช้ QR เพิ่มเพื่อนของไลน์ร้าน

แพ็กเกจฟรีส่ง push ได้ 200 ข้อความ/เดือน สรุปวันละ 1 ข้อความใช้ ~22

ไม่ต้องตั้ง webhook: ระบบไม่ได้อ่านแชท แค่ push สรุปออกไป

### ทดสอบก่อนขึ้นจริง (แนะนำ)
1. ใส่ env ข้อ 2 ที่ Vercel โดยเลือก environment **Preview** แล้ว redeploy preview ของ PR
   - Preview ของเว็บนี้ต่อ Supabase โปรเจกต์ dev แต่ `SUPABASE_SECRET_KEY` เป็นของ prod → เพิ่ม `SHOP_SUPABASE_URL` (Preview) = `https://ouhinfbpsuhuzsyuqwbl.supabase.co` ให้ร้านต่อโปรเจกต์เดียวกับ key
2. ริชเมนูชั่วคราวลิงก์ไป `<ลิงก์ preview>/shop` แล้วลองสั่งจากมือถือ
3. ยิงสรุปเองไม่ต้องรอ 1 ทุ่ม (สรุปจะแสดงออเดอร์ที่รับ "พรุ่งนี้"):
   `curl -X POST <ลิงก์ preview>/api/shop/summary -H "Authorization: Bearer <CRON_SECRET>"`
4. ผ่านแล้วค่อยใส่ env ฝั่ง Production และเปลี่ยนลิงก์ริชเมนูเป็นเว็บจริง

## เช็กเงินเข้าอัตโนมัติ (Omise)
1. สมัครที่ omise.co (บุคคลธรรมดาได้) · ระหว่างรออนุมัติใช้โหมดทดสอบได้เลย
2. Omise Dashboard → Keys → คัดลอก Secret key (`skey_test_…` ตอนทดสอบ, `skey_…` ตอนใช้จริง)
3. Vercel → env `OMISE_SECRET_KEY` (ติ๊ก Sensitive) → redeploy · **ห้ามส่งคีย์ในแชท**
4. Omise Dashboard → Webhooks → ใส่ `https://<โดเมน>/api/shop/omise/webhook`
   (ไม่ใส่ก็ใช้ได้ หน้าเว็บถาม Omise เองทุก 3 วิ แต่ถ้าลูกค้าปิดหน้าไปก่อน webhook จะยืนยันให้)

ทดสอบ (คีย์ test): สั่งในหน้า /shop → Omise Dashboard → Charges → charge ล่าสุด → Actions → Mark as successful → หน้าเว็บขึ้น "รับออร์เดอร์แล้ว" เอง

- ค่าธรรมเนียม PromptPay ~1.65% + VAT · ยอดขั้นต่ำ 20 บาท · QR หมดอายุ 30 นาที (ลูกค้ากดสร้างใหม่ได้)
- ออร์เดอร์ที่ได้ QR แต่ไม่จ่าย = `payment_status = pending` ไม่ได้แต้ม ไม่เข้าสรุป 19:00 ปล่อยไว้ได้
- จ่ายแล้ว = `payment_status = paid` + `payment_checked` ติ๊กให้เอง · เงินโอนเข้าบัญชีธนาคารตามรอบของ Omise

## ชื่อลูกค้าจากไลน์ (LIFF)
ลูกค้ากดปุ่ม "สั่งอาหาร" ในไลน์ร้าน → ชื่อที่แสดงในไลน์ขึ้นให้เอง ไม่ต้องพิมพ์ (กด "แก้" เปลี่ยนเป็นชื่อเล่นได้)
1. LINE Developers → Provider "Watcharin Service" → Create a new channel → **LINE Login** (ต้องอยู่ provider เดียวกับ OA ร้าน)
2. ในช่อง LINE Login → แท็บ LIFF → Add
   - Size: **Full** · Endpoint URL: `https://watcharin-service.com/shop` (ทดสอบ: ลิงก์ preview + `/shop`)
   - Scopes: ติ๊ก **profile** · Bot link feature: **On (Normal)** แล้วเลือก OA ร้าน
3. คัดลอก **LIFF ID** → Vercel env `NEXT_PUBLIC_SHOP_LIFF_ID` (ไม่ใช่ความลับ) → redeploy
4. ปุ่มในเมนูไลน์ใช้ลิงก์ `https://liff.line.me/<LIFF ID>` แทนลิงก์เว็บตรง ๆ
5. Channel ของ LINE Login ต้องกด **Publish** (สถานะ Developing ใช้ได้แค่บัญชีที่เป็น admin/tester)

ไม่ตั้ง = ลูกค้าพิมพ์ชื่อเองครั้งแรก มือถือจำไว้ครั้งต่อไป

## เมนูไลน์ (Rich menu)
LINE Official Account Manager → หน้าแรก → Rich menus → Create
- เทมเพลต: แบบ 2 ช่อง ซ้ายใหญ่ ขวาเล็ก (ขนาด 2500×843) · อัปโหลดรูป `line-richmenu-2500x843.jpg`
- ช่องซ้าย "สั่งอาหาร" → Link → `https://liff.line.me/<LIFF ID>` (ยังไม่มี LIFF ใช้ `https://watcharin-service.com/shop`)
- ช่องขวา "ทักแอดมิน" → Text → `ขอสอบถามค่ะ/ครับ`
- Menu bar text: `สั่งอาหาร` · Default behavior: Shown

## กลุ่ม OpenChat (ให้เห็นว่ามีคนสั่งจริง)
สรุป 19:00 ในไลน์เจ้าของร้านมี 2 ข้อความ: ข้อความแรกสำหรับร้าน (ชื่อลูกค้า เมนูที่ต้องเตรียม)
ข้อความที่ 2 ไม่มีชื่อลูกค้า/ยอดเงิน → กดค้าง → ส่งต่อ → เลือก OpenChat ของร้าน
(ไลน์ไม่เปิดให้บอทโพสต์ใน OpenChat เอง) · หน้าร้านโชว์ "รอบนี้สั่งแล้ว N ออร์เดอร์" เองเมื่อมีตั้งแต่ 3 ออร์เดอร์

## รูปเมนู
1. Supabase → Storage → bucket `shop-menu` → Upload (jpg/png/webp ไม่เกิน 5 MB · รูปจัตุรัสสวยสุด)
2. กดไฟล์ → Get URL / Copy URL
3. Table Editor → `shop_menu` → วาง URL ในช่อง `image_url` ของเมนูนั้น (ว่าง = แสดงกรอบสีพร้อมตัวอักษรแรกแทน)

## ใช้งานทุกวัน (Supabase → Table Editor)
- `shop_menu`: แก้ราคา · เอาติ๊ก `available` ออกวันที่ไม่ทำเมนูนั้น
- `shop_orders`: (ไม่มี Omise) เทียบยอดกับแอปธนาคาร ติ๊ก `payment_checked` · ยกเลิก → `status = cancelled` (แต้มคืนให้อัตโนมัติ)
- `shop_customers`: ดูแต้ม รหัสลูกค้า · เติม `note` เรื่องแพ้อาหาร
- `shop_settings`: เวลาปิดรับ วันรับของ (`open_days` 0=อาทิตย์) รอบเวลารับ

## สิ่งที่ระบบไม่ได้ทำ
- ไม่มี Omise = ไม่ตรวจเงินเข้า — แต้มเข้าทันที ยกเลิกแล้วคืนเอง
- ลูกค้าไม่ต้องล็อกอิน: มือถือจำ token ไว้ เปลี่ยนเครื่อง = เริ่มรหัสใหม่ (ย้ายแต้มให้ได้ใน `shop_customers`)
