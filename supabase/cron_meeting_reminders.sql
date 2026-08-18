-- ============================================================================
-- cron_meeting_reminders — ตั้งเวลาให้ยิงตัวส่งอีเมลเตือนประชุม
--
-- 🔴 รันเฉพาะ prod เท่านั้น
--    pg_cron ยิง HTTP ออกจากเซิร์ฟเวอร์ Supabase ซึ่งเข้า localhost
--    ของเครื่องนักพัฒนาไม่ได้ · dev ทดสอบด้วย curl เอง (ดูท้ายไฟล์)
--
-- 🔴 ก่อนรัน ต้องมี env สองตัวบน Vercel (Production) แล้ว มิฉะนั้นจะยิงแล้วได้ 503
--    SUPABASE_SECRET_KEY  — service key จาก Supabase → Settings → API Keys
--    CRON_SECRET          — ตั้งเองอะไรก็ได้ ยาว ๆ แล้วเอามาใส่ข้างล่างให้ตรงกัน
--
-- ⚠️ ต้องแก้ <CRON_SECRET> ข้างล่างเป็นค่าจริงก่อน Run
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ลบตัวเดิมก่อนถ้าเคยตั้งไว้ — cron.schedule ชื่อซ้ำจะทับให้เอง
-- แต่เรียก unschedule ไว้ก่อนทำให้รันไฟล์นี้ซ้ำได้โดยไม่ต้องคิด
do $$ begin
  perform cron.unschedule('meeting-reminders');
exception when others then null; end $$;

-- ทุก 5 นาที — ละเอียดพอสำหรับการเตือนล่วงหน้า 15 นาทีขึ้นไป
-- ถี่กว่านี้ไม่ได้ช่วยอะไร เพราะตัวเลือกที่สั้นที่สุดคือ 15 นาที
select cron.schedule(
  'meeting-reminders',
  '*/5 * * * *',
  $CRON$
  select net.http_post(
    url     := 'https://watcharin-service.com/api/cron/meeting-reminders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <CRON_SECRET>',
      'Content-Type',  'application/json'
    ),
    body    := '{}'::jsonb
  );
  $CRON$
);

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: 1 แถว · schedule = */5 * * * * · active = true
select jobid, jobname, schedule, active
from cron.job
where jobname = 'meeting-reminders';

-- ============================================================================
-- ถ้า net.http_post หาไม่เจอ
-- ให้ลองเปลี่ยนเป็น extensions.http_post — Supabase บางรุ่นติดตั้ง pg_net
-- ไว้ที่ schema extensions แทนที่จะเป็น net
--
-- ดูผลการยิงย้อนหลัง (เผื่อสงสัยว่าเรียกไปแล้วได้อะไรกลับมา):
--   select * from net._http_response order by created desc limit 10;
--
-- ดูว่า cron รันไปแล้วกี่รอบและสำเร็จไหม:
--   select * from cron.job_run_details order by start_time desc limit 10;
--
-- เลิกใช้:
--   select cron.unschedule('meeting-reminders');
--
-- ---------------------------------------------------------------------------
-- ทดสอบเองโดยไม่ต้องรอ cron (ใช้ได้ทั้ง dev และ prod):
--   curl -X POST https://watcharin-service.com/api/cron/meeting-reminders \
--        -H "Authorization: Bearer <CRON_SECRET>"
-- ควรได้ JSON กลับมาแบบ {"checked":n,"due":n,"sent":n,"failed":[]}
-- ============================================================================
