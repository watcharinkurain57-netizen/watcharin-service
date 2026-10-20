-- แจ้งเข้าไลน์ทุกออร์เดอร์ (เช่น บางกรวยที่ส่งถึงที่) — เพิ่มจากสรุปรายวันตอนปิดรับ ไม่ได้แทน
-- ออร์เดอร์ที่จ่ายแล้วของสาขาที่เปิดไว้ ส่งหนึ่งข้อความเข้าไลน์ผู้รับสรุปของสาขานั้นทันที
-- ใช้โควตาไลน์ของสาขา 1 ข้อความต่อผู้รับต่อออร์เดอร์ · เว็บเหลือโควตาไว้ให้สรุปรายวันเสมอ
--
-- เปิดให้สาขาไหน: update public.shop_branches set notify_orders = true where slug = 'bangkruai';
-- หรือกดในหลังบ้าน หน้าสาขา

alter table public.shop_branches
  add column if not exists notify_orders boolean not null default false;

-- ส่งแจ้งแล้วเมื่อไหร่ (ว่าง = ยังไม่ส่ง) — webhook กับหน้าเว็บยืนยันเงินเข้าพร้อมกันได้ ส่งครั้งเดียว
alter table public.shop_orders
  add column if not exists notified_at timestamptz;
