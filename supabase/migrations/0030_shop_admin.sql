-- หลังบ้านร้าน /shop/admin — ไม่ต้องตั้งรหัสผ่าน ไม่ต้องมี LIFF
-- เจ้าของร้านกด "ส่งลิงก์เข้าระบบ" → เว็บส่งลิงก์ใช้ครั้งเดียว (15 นาที) ไปที่ไลน์ของผู้รับสรุป (SHOP_LINE_TO)
-- กดลิงก์แล้วกดยืนยัน → ได้คุกกี้เข้าระบบ 30 วัน
--
-- เก็บแค่ sha256 ของรหัส ไม่เก็บรหัสจริง · kind: link = ลิงก์ในไลน์ / session = คุกกี้ที่เข้าระบบแล้ว
-- ไม่มี policy: เปิดได้จากเว็บฝั่ง server (service role) เท่านั้น

create table if not exists public.shop_admin_tokens (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('link', 'session')),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shop_admin_tokens_kind_created on public.shop_admin_tokens (kind, created_at desc);

alter table public.shop_admin_tokens enable row level security;
revoke all on public.shop_admin_tokens from anon, authenticated;
