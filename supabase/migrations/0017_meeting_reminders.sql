-- ============================================================================
-- 0017_meeting_reminders — ตั้งค่าเตือนก่อนถึงเวลาประชุม
--
-- ตัวส่งจริงเป็น cron ที่ยิงเข้า /api/cron/meeting-reminders
-- ไฟล์นี้แค่เพิ่มช่องเก็บว่า "จะเตือนล่วงหน้ากี่นาที" และ "เตือนไปหรือยัง"
--
-- ⚠️ ตัวตั้งเวลา cron อยู่คนละไฟล์: supabase/cron_meeting_reminders.sql
-- แยกกันเพราะ migration นี้ต้องรันทั้ง dev และ prod
-- แต่ cron ตั้งเฉพาะ prod (pg_cron ยิง HTTP จากเซิร์ฟเวอร์ Supabase
-- เข้า localhost ของเครื่องนักพัฒนาไม่ได้)
-- ============================================================================

alter table public.project_meetings
  -- null = ไม่ต้องเตือน · เพดาน 10080 นาที = 7 วัน
  add column if not exists remind_minutes int default 30
    check (remind_minutes is null or (remind_minutes > 0 and remind_minutes <= 10080));

alter table public.project_meetings
  -- null = ยังไม่ได้เตือน · มีค่า = เตือนไปแล้วเมื่อไหร่
  -- ใช้เป็นตัวกันส่งซ้ำด้วย ตัวส่งจะ "จอง" ด้วยการเซ็ตค่านี้ก่อนแล้วค่อยส่งอีเมล
  add column if not exists reminded_at timestamptz;

-- ดัชนีเฉพาะแถวที่ยังรอเตือน — ตัว cron ถามทุก 5 นาที
-- partial index ทำให้มันเล็กมากเพราะนัดที่เตือนไปแล้วหลุดออกจากดัชนีเอง
create index if not exists project_meetings_pending_reminder_idx
  on public.project_meetings (starts_at)
  where reminded_at is null and remind_minutes is not null;

-- นัดที่มีอยู่ก่อนหน้านี้และเลยเวลาไปแล้ว ไม่ต้องเตือนย้อนหลัง
-- ถ้าไม่ปิดไว้ พอ cron ทำงานครั้งแรกจะยิงอีเมลนัดเก่าทั้งหมดพรวดเดียว
update public.project_meetings
set reminded_at = now()
where reminded_at is null and starts_at <= now();

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: คอลัมน์ครบ 2 ตัว · ค่าเริ่มต้น 30 · ดัชนีมีอยู่
--            · และไม่มีนัดเก่าค้างรอเตือน (รอเตือนย้อนหลัง = 0)
select
  (select count(*) from information_schema.columns
    where table_name = 'project_meetings'
      and column_name in ('remind_minutes', 'reminded_at'))                        as คอลัมน์ใหม่,
  (select column_default from information_schema.columns
    where table_name = 'project_meetings' and column_name = 'remind_minutes')      as ค่าเริ่มต้น,
  (select count(*) from pg_indexes
    where tablename = 'project_meetings'
      and indexname = 'project_meetings_pending_reminder_idx')                     as มีดัชนี,
  (select count(*) from public.project_meetings
    where reminded_at is null and starts_at <= now())                              as รอเตือนย้อนหลัง;
