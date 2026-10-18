-- ============================================================================
-- cron_shop_summary — สรุปออร์เดอร์ร้านแซลดอง กุ้งแช่ แยกสาขา
--
-- เรียก /api/shop/summary ทุกชั่วโมง นาทีที่ 5 แล้ว route เลือกเองว่าสาขาไหนเพิ่งปิดรับ
-- (แต่ละสาขาปิดรับคนละเวลาได้ ตั้งที่ shop_branches.cutoff_hour) สาขาไหนไม่ถึงเวลา/ไม่มีออร์เดอร์ = ไม่ส่ง
--
-- 🔴 รันหลังเอาหน้าร้านขึ้นเว็บจริงแล้ว และหลัง migration 0028_shop_cron_auth
--    เว็บจริงต้องมี SUPABASE_SECRET_KEY และอย่างน้อยหนึ่งช่องทางส่งสรุป
--    (ไลน์ของสาขา SHOP_LINE_TOKEN_<SLUG> หรือตัวกลาง SHOP_LINE_CHANNEL_TOKEN + SHOP_LINE_TO
--     หรือ SHOP_SUMMARY_EMAIL)
--
-- ไม่ต้องแก้อะไรในไฟล์นี้ วางทั้งไฟล์ใน SQL Editor แล้ว Run ได้เลย (รันซ้ำได้):
--   รหัสลับ shop_cron_secret สร้างสุ่มเก็บใน Vault ครั้งแรกครั้งเดียว ไม่มีใครต้องเห็นหรือก๊อป
--   cron อ่านรหัสจาก Vault ตอนยิงทุกครั้ง ส่วนเว็บเช็กกับ Vault ผ่าน shop_cron_ok() (0028)
--
-- pg_cron ใช้เวลา UTC แต่ทุกชั่วโมงเหมือนกัน — route คิดชั่วโมงเป็นเวลาไทยเอง
-- หา schema ของ http_post ของ pg_net เองตอนรัน (บทเรียนใน cron_meeting_reminders.sql)
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'shop_cron_secret') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
      'shop_cron_secret',
      'ร้านแซลดอง: รหัสที่ pg_cron ส่งไป /api/shop/summary (เว็บเช็กผ่าน shop_cron_ok)'
    );
  end if;
end $$;

do $$
declare
  v_url     text := 'https://watcharin-service.com/api/shop/summary';
  v_schema  text;
  v_cmd     text;
begin
  -- http_post ของ pg_net เท่านั้น (ส่วนขยาย http ก็มีฟังก์ชันชื่อนี้ แต่รับค่าคนละแบบ)
  select n.nspname into v_schema
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_depend d on d.objid = p.oid and d.deptype = 'e'
  join pg_extension e on e.oid = d.refobjid and e.extname = 'pg_net'
  where p.proname = 'http_post'
  limit 1;

  if v_schema is null then
    raise exception 'หาฟังก์ชัน http_post ของ pg_net ไม่เจอ — pg_net ติดตั้งไม่สำเร็จหรือเปล่า';
  end if;

  -- cron เก็บคำสั่งเป็นข้อความเฉย ๆ ชื่อพารามิเตอร์ผิดจะล้มเงียบทุกรอบ → เช็กตอนนี้เลย
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = v_schema and p.proname = 'http_post'
      and p.proargnames @> array['url', 'headers', 'body', 'timeout_milliseconds']
  ) then
    raise exception '%.http_post ไม่มีพารามิเตอร์ url/headers/body/timeout_milliseconds — pg_net รุ่นนี้ต้องแก้คำสั่งข้างล่าง', v_schema;
  end if;

  if to_regprocedure('public.shop_cron_ok(text)') is null then
    raise exception 'ยังไม่มีฟังก์ชัน shop_cron_ok — รัน migration 0028_shop_cron_auth ก่อน';
  end if;

  v_cmd := format(
    $cmd$select %I.http_post(
  url := %L,
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'shop_cron_secret'),
    'Content-Type', 'application/json'
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000
);$cmd$,
    v_schema,
    v_url
  );

  begin
    perform cron.unschedule('shop-summary');
  exception when others then null;
  end;

  perform cron.schedule('shop-summary', '5 * * * *', v_cmd);
end $$;

select jobname, schedule, active
from cron.job
where jobname = 'shop-summary';

-- ---------------------------------------------------------------------------
-- เช็กว่ายิงผ่าน (ไม่ส่งไลน์ เพราะเลือกวันที่ไม่มีออร์เดอร์):
--   select net.http_post(   -- หรือ extensions.http_post ตาม schema ที่ใช้ข้างบน
--     url := 'https://watcharin-service.com/api/shop/summary?branch=shinawatra3&date=2000-01-01',
--     headers := jsonb_build_object('Authorization', 'Bearer ' ||
--       (select decrypted_secret from vault.decrypted_secrets where name = 'shop_cron_secret')),
--     body := '{}'::jsonb);
--   แล้วดูคำตอบ: select status_code, content from net._http_response order by id desc limit 1;
--   ควรได้ 200 และ "orders":0 (ได้ 401 = เว็บจริงยังไม่มีโค้ดนี้หรือ shop_cron_ok ยังไม่ได้รัน)
--
-- ผลรอบที่ผ่านมา: select status, return_message, start_time from cron.job_run_details
--                 where jobid = (select jobid from cron.job where jobname = 'shop-summary')
--                 order by start_time desc limit 5;
-- เลิกใช้:  select cron.unschedule('shop-summary');
-- ============================================================================
