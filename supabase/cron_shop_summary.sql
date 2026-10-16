-- ============================================================================
-- cron_shop_summary — สรุปออร์เดอร์ร้านแซลดอง กุ้งแช่ แยกสาขา
--
-- เรียก /api/shop/summary ทุกชั่วโมง นาทีที่ 5 แล้ว route เลือกเองว่าสาขาไหนเพิ่งปิดรับ
-- (แต่ละสาขาปิดรับคนละเวลาได้ ตั้งที่ shop_branches.cutoff_hour) สาขาไหนไม่ถึงเวลา/ไม่มีออร์เดอร์ = ไม่ส่ง
--
-- 🔴 รันหลัง migration 0024_shop_orders และหลังตั้ง env บน Vercel (Production)
--    แล้ว redeploy: SUPABASE_SECRET_KEY, CRON_SECRET และอย่างน้อยหนึ่งช่องทาง
--    (ไลน์ของสาขา SHOP_LINE_TOKEN_<SLUG> หรือตัวกลาง SHOP_LINE_CHANNEL_TOKEN + SHOP_LINE_TO
--     หรือ SHOP_SUMMARY_EMAIL)
--
-- ⚠️ แก้ <CRON_SECRET> ข้างล่างเป็นค่าเดียวกับบน Vercel ก่อน Run
--
-- pg_cron ใช้เวลา UTC แต่ทุกชั่วโมงเหมือนกัน — route คิดชั่วโมงเป็นเวลาไทยเอง
-- หา schema ของ http_post เองตอนรัน (บทเรียนใน cron_meeting_reminders.sql)
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  v_secret  text := '<CRON_SECRET>';
  v_url     text := 'https://watcharin-service.com/api/shop/summary';
  v_schema  text;
  v_cmd     text;
begin
  if v_secret = '<CRON_SECRET>' then
    raise exception 'ยังไม่ได้แก้ <CRON_SECRET> เป็นค่าจริง';
  end if;

  select n.nspname into v_schema
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'http_post'
  limit 1;

  if v_schema is null then
    raise exception 'หาฟังก์ชัน http_post ไม่เจอ — pg_net ติดตั้งไม่สำเร็จหรือเปล่า';
  end if;

  v_cmd := format(
    'select %I.http_post(url := %L, headers := jsonb_build_object(''Authorization'', %L, ''Content-Type'', ''application/json''), body := ''{}''::jsonb);',
    v_schema,
    v_url,
    'Bearer ' || v_secret
  );

  begin
    perform cron.unschedule('shop-summary');
  exception when others then null;
  end;

  perform cron.schedule('shop-summary', '5 * * * *', v_cmd);
end $$;

select jobname, schedule, active, left(command, 60) as คำสั่ง
from cron.job
where jobname = 'shop-summary';

-- ---------------------------------------------------------------------------
-- ทดสอบเองโดยไม่ต้องรอเวลา (ต้องมีออร์เดอร์ที่จ่ายแล้วของวันนั้นอย่างน้อย 1 รายการ):
--   curl -X POST "https://watcharin-service.com/api/shop/summary?branch=shinawatra3&date=2026-10-19" \
--        -H "Authorization: Bearer <CRON_SECRET>"
-- ควรได้ {"date":"…","branches":[{"branch":"shinawatra3","orders":n,"sent":["line:200"],"failed":[]}]}
-- ไม่มีออร์เดอร์ = "orders":0 และไม่มีอะไรส่งออกไป (ตั้งใจ)
--
-- เลิกใช้:  select cron.unschedule('shop-summary');
-- ============================================================================
