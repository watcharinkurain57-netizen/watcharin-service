-- ============================================================================
-- cron_meeting_reminders — ตั้งเวลาให้ยิงตัวส่งอีเมลเตือนประชุม
--
-- 🔴 รันเฉพาะ prod เท่านั้น
--    pg_cron ยิง HTTP ออกจากเซิร์ฟเวอร์ Supabase ซึ่งเข้า localhost
--    ของเครื่องนักพัฒนาไม่ได้ · dev ทดสอบด้วย curl เอง (ดูท้ายไฟล์)
--
-- 🔴 ก่อนรัน ต้องมี env สองตัวบน Vercel (Production) และ **redeploy แล้ว**
--    SUPABASE_SECRET_KEY  — service key จาก Supabase → Settings → API Keys
--    CRON_SECRET          — ตั้งเองยาว ๆ แล้วเอามาใส่ข้างล่างให้ตรงกัน
--    (Vercel ผูกชุด env กับ deployment ตอนสร้าง แก้ค่าเฉย ๆ ไม่มีผลกับตัวที่รันอยู่)
--
-- ⚠️ ต้องแก้ <CRON_SECRET> ข้างล่างเป็นค่าจริงก่อน Run
--
-- ---------------------------------------------------------------------------
-- 🐛 บทเรียนจากรอบแรก (2026-08-18)
--
-- ไฟล์นี้เคยเขียน `net.http_post` ตายตัว แต่ Supabase ติดตั้ง pg_net ไว้ที่
-- schema `extensions` ไม่ใช่ `net` → cron ยิงล้มทุกรอบตั้งแต่วันแรก
-- และ **ไม่มีอะไรฟ้องเลย** เพราะ cron.schedule เก็บคำสั่งเป็นข้อความเฉย ๆ
-- ไม่ได้ตรวจว่าฟังก์ชันมีจริงตอนตั้ง กว่าจะรู้ก็ตอนไปเปิด job_run_details ดู
--
-- รอบนี้จึง **หา schema เองตอนรัน** แล้วประกอบคำสั่งด้วย format()
-- ย้ายที่อีกกี่รอบก็ยังทำงาน และถ้าหาไม่เจอจริง ๆ จะ raise exception
-- ให้เห็นตั้งแต่ตอนรันไฟล์นี้ ไม่ใช่ไปเงียบอยู่ใน cron
-- ---------------------------------------------------------------------------
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
declare
  -- 🔴 แก้ตรงนี้ให้ตรงกับที่ตั้งบน Vercel
  v_secret  text := '<CRON_SECRET>';
  v_url     text := 'https://watcharin-service.com/api/cron/meeting-reminders';
  v_schema  text;
  v_cmd     text;
begin
  if v_secret = '<CRON_SECRET>' then
    raise exception 'ยังไม่ได้แก้ <CRON_SECRET> เป็นค่าจริง';
  end if;

  -- หาว่า http_post อยู่ schema ไหน (net หรือ extensions แล้วแต่รุ่นของ Supabase)
  select n.nspname into v_schema
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'http_post'
  limit 1;

  if v_schema is null then
    raise exception 'หาฟังก์ชัน http_post ไม่เจอ — pg_net ติดตั้งไม่สำเร็จหรือเปล่า';
  end if;

  raise notice 'พบ http_post ที่ schema: %', v_schema;

  /*
   * ประกอบคำสั่งด้วย format()
   *   %I = ชื่อ identifier (schema) ใส่เครื่องหมายคำพูดให้เองถ้าจำเป็น
   *   %L = ค่าคงที่แบบ literal — **สำคัญ** เพราะมันหนีอัญประกาศให้เอง
   *        ถ้าต่อสตริงเองแล้วรหัสลับมี ' อยู่ข้างใน SQL จะพังหรือเพี้ยนเงียบ ๆ
   */
  v_cmd := format(
    'select %I.http_post(url := %L, headers := jsonb_build_object(''Authorization'', %L, ''Content-Type'', ''application/json''), body := ''{}''::jsonb);',
    v_schema,
    v_url,
    'Bearer ' || v_secret
  );

  -- ลบตัวเดิมก่อน — ทำให้รันไฟล์นี้ซ้ำได้โดยไม่ต้องคิด
  begin
    perform cron.unschedule('meeting-reminders');
  exception when others then null;
  end;

  -- ทุก 5 นาที — ละเอียดพอสำหรับการเตือนล่วงหน้า 15 นาทีขึ้นไป
  -- ถี่กว่านี้ไม่ช่วยอะไร เพราะตัวเลือกที่สั้นที่สุดคือ 15 นาที
  perform cron.schedule('meeting-reminders', '*/5 * * * *', v_cmd);
end $$;

-- ---------- ตรวจผล ----------
-- ที่ควรเห็น: 1 แถว · active = true
--            · และ command ต้องขึ้นต้นด้วย schema ที่ถูก (extensions หรือ net)
--              ไม่ใช่ค้างเป็นตัวเดิมที่หาไม่เจอ
select jobname, schedule, active, left(command, 60) as คำสั่ง
from cron.job
where jobname = 'meeting-reminders';

-- ============================================================================
-- 🔎 หลังตั้งเสร็จ รอ 5 นาทีแล้วเช็คว่าทำงานจริงไหม — **อย่าข้ามขั้นนี้**
--
-- 1) cron รันผ่านไหม (ถ้า failed จะบอกสาเหตุใน return_message)
--    select status, return_message, start_time
--    from cron.job_run_details
--    where jobid in (select jobid from cron.job where jobname = 'meeting-reminders')
--    order by start_time desc limit 5;
--
-- 2) เว็บตอบอะไรกลับมา — ตารางอยู่ schema เดียวกับ http_post
--    (แทน <schema> ด้วย extensions หรือ net ตามที่ raise notice บอกไว้ข้างบน)
--    select status_code, content, created
--    from <schema>._http_response order by created desc limit 5;
--
--    200 = ครบวงจร · 401 = รหัสในไฟล์นี้ไม่ตรงกับบน Vercel
--    503 = ยังไม่ได้ตั้ง env บน Vercel หรือยังไม่ได้ redeploy
--
-- เลิกใช้:  select cron.unschedule('meeting-reminders');
--
-- ---------------------------------------------------------------------------
-- ทดสอบเองโดยไม่ต้องรอ cron:
--   curl -X POST https://watcharin-service.com/api/cron/meeting-reminders \
--        -H "Authorization: Bearer <CRON_SECRET>"
-- ควรได้ {"checked":n,"due":n,"sent":n,"failed":[]}
-- ============================================================================
