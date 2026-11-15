-- ============================================================================
-- 0028_shop_cron_auth — รหัสลับของสรุปตอนปิดรับ เก็บใน Vault ไม่ต้องมีใครก๊อป
--
-- pg_cron ส่งรหัส shop_cron_secret (อยู่ใน Vault) ไปกับคำขอ /api/shop/summary
-- เว็บถามฟังก์ชันนี้ว่ารหัสที่ได้มาตรงกับใน Vault ไหม → ได้แค่ true/false รหัสไม่ออกจากฐานข้อมูล
-- (CRON_SECRET บน Vercel ยังใช้ได้เหมือนเดิม ตัวนี้เป็นอีกทางที่ไม่ต้องตั้งอะไรใน Vercel)
--
-- ตัวรหัสกับตารางเวลาสร้างใน supabase/cron_shop_summary.sql
-- ============================================================================

create or replace function public.shop_cron_ok(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(length(p_token) >= 32, false) and exists (
    select 1
    from vault.decrypted_secrets s
    where s.name = 'shop_cron_secret'
      and s.decrypted_secret = p_token
  );
$$;

-- เรียกได้เฉพาะเซิร์ฟเวอร์ของเว็บ (service key) — ลูกค้าและคนทั่วไปเรียกผ่าน API ไม่ได้
revoke all on function public.shop_cron_ok(text) from public;
revoke all on function public.shop_cron_ok(text) from anon, authenticated;
grant execute on function public.shop_cron_ok(text) to service_role;
