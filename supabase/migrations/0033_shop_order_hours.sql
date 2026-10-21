-- เวลาปิดรับเป็นนาที (เช่น 19:30) + เวลาเริ่มรับออร์เดอร์ของแต่ละสาขา — ตั้งในหลังบ้าน หน้าสาขา
--
-- cutoff_minute: นาทีของเวลาปิดรับ (cutoff_hour:cutoff_minute) · เดิม = 0 ทุกสาขา (เวลาเดิมไม่เปลี่ยน)
-- open_from:     "HH:MM" เวลาเริ่มรับออร์เดอร์ทุกวัน · ว่าง = รับตลอด (แบบเดิม)
--   ตั้งแต่ปิดรับจนถึงเวลาเริ่มรับ (ข้ามเที่ยงคืนได้) หน้าร้านขึ้นว่ายังไม่เปิดรับ สั่งไม่ได้
--   เช่น เริ่ม 08:00 ปิด 19:00 → รับ 08:00-19:00 · 19:00-08:00 ยังไม่รับ
--
-- สรุปเข้าไลน์: cron เรียก /api/shop/summary ทุก 5 นาที (supabase/cron_shop_summary.sql)
-- เว็บส่งสรุปของสาขาที่ปิดรับไปแล้ว 5-9 นาที

alter table public.shop_branches
  add column if not exists cutoff_minute int not null default 0
    constraint shop_branches_cutoff_minute_range check (cutoff_minute between 0 and 59),
  add column if not exists open_from text
    constraint shop_branches_open_from_fmt check (open_from is null or open_from ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

-- ---------- วันรับของถัดไปของสาขา (แทนตัวใน 0027) ----------
-- สั่งก่อนเวลาปิดรับ → วันเปิดแรกตั้งแต่พรุ่งนี้ · หลังปิดรับ → ตั้งแต่มะรืน
-- = ออร์เดอร์ของวัน P ปิดรับตอนเวลาปิดรับของวันก่อนหน้า P เสมอ (สรุปส่งหลังจากนั้นไม่กี่นาที)
-- ข้ามวันที่ไม่อยู่ใน open_days และวันใน closed_dates
-- ปิดรับชั่วคราว · อยู่ในช่วงยังไม่เปิดรับ · ไม่มีวันเปิดใน 60 วัน = null
create or replace function public.shop_branch_pickup(p_branch uuid, p_at timestamptz default now())
returns date
language plpgsql
stable
set search_path = public
as $$
declare
  b     public.shop_branches;
  local timestamp := p_at at time zone 'Asia/Bangkok';
  tod   int := extract(hour from local)::int * 60 + extract(minute from local)::int;
  cut   int;
  opn   int;
  d     date;
  i     int := 0;
begin
  select * into b from public.shop_branches where id = p_branch;
  if not found or not b.accepting then return null; end if;
  cut := b.cutoff_hour * 60 + b.cutoff_minute;

  if b.open_from is not null then
    opn := split_part(b.open_from, ':', 1)::int * 60 + split_part(b.open_from, ':', 2)::int;
    -- ตอนนี้อยู่ระหว่างเวลาปิดรับ → เวลาเริ่มรับ (นับวนรอบเที่ยงคืน) = ยังไม่เปิดรับ
    if opn <> cut and ((tod - cut + 1440) % 1440) < ((opn - cut + 1440) % 1440) then
      return null;
    end if;
  end if;

  d := local::date + case when tod >= cut then 2 else 1 end;
  while not (extract(dow from d)::int = any (b.open_days)) or d = any (b.closed_dates) loop
    i := i + 1;
    if i > 60 then return null; end if;
    d := d + 1;
  end loop;
  return d;
end;
$$;

revoke all on function public.shop_branch_pickup(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.shop_branch_pickup(uuid, timestamptz) to service_role;
