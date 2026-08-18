-- ============================================================================
-- diagnose_cron — หาว่า pg_net/pg_cron อยู่ที่ไหน และ cron ยิงไปแล้วได้อะไร
--
-- รันบน prod · ไม่แก้อะไรทั้งนั้น อ่านอย่างเดียว
-- ============================================================================

-- ---------- 1) cron รันไปแล้วกี่รอบ และผลเป็นยังไง ----------
-- 🔴 ช่องที่สำคัญที่สุดคือ status กับ return_message
--    'succeeded' = คำสั่งใน cron รันผ่าน (ไม่ได้แปลว่าเว็บตอบ 200 นะ แค่ยิงออกได้)
--    'failed'    = คำสั่งพัง — อ่าน return_message จะบอกว่าเพราะอะไร
--                  ถ้าเขียนว่า function net.http_post does not exist
--                  แปลว่า pg_net อยู่คนละ schema ต้องแก้ตาม ข้อ 3
select
  status,
  return_message,
  start_time
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'meeting-reminders')
order by start_time desc
limit 10;

-- ---------- 2) ตารางเก็บคำตอบของ pg_net อยู่ schema ไหน ----------
-- ปกติชื่อ _http_response แต่ schema อาจเป็น net หรือ extensions
select table_schema, table_name
from information_schema.tables
where table_name ilike '%http_response%';

-- ---------- 3) ฟังก์ชัน http_post อยู่ schema ไหน ----------
-- 🔴 ถ้าได้ 'extensions' ไม่ใช่ 'net' แปลว่าคำสั่งใน cron_meeting_reminders.sql
--    ต้องแก้จาก net.http_post เป็น extensions.http_post แล้วรันไฟล์นั้นใหม่
select n.nspname as schema_ของฟังก์ชัน, p.proname as ชื่อฟังก์ชัน
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname in ('http_post', 'http_get')
order by 1, 2;

-- ---------- 4) ตัว cron ยังตั้งอยู่ไหม และคำสั่งข้างในเป็นยังไง ----------
-- ดู command ว่าเรียก schema ไหน และ <CRON_SECRET> ถูกแทนที่ด้วยค่าจริงแล้วหรือยัง
select jobname, schedule, active, command
from cron.job
where jobname = 'meeting-reminders';

-- ---------- 5) extension ที่ติดตั้งอยู่จริง ----------
select extname, n.nspname as ติดตั้งไว้ที่
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where extname in ('pg_cron', 'pg_net');
