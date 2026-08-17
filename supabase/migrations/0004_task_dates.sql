-- ============================================================================
-- 0004_task_dates — ใส่วันที่จริงให้งาน เพื่อรองรับมุมมองปฏิทิน/ไทม์ไลน์
--
-- ของเดิม due_label เก็บเป็นข้อความที่แสดงจริง เช่น 'พรุ่งนี้' 'ค้าง 3 วัน'
-- อ่านง่ายก็จริง แต่เอาไปวางบนปฏิทินหรือเรียงตามเวลาไม่ได้เลย
--
-- เพิ่ม due_on เป็นวันที่จริง และเก็บ due_label ไว้เป็นข้อความเสริม
-- (เช่นงานที่ยังไม่มีกำหนดแน่นอน เขียนว่า 'รอลูกค้าตอบ' ได้)
-- ============================================================================

alter table public.project_tasks
  add column if not exists due_on date;

alter table public.project_tasks
  add column if not exists started_on date;

-- ใช้ตอนเรียงงานตามกำหนดส่ง และตอนดึงงานของช่วงเวลาหนึ่งมาแสดงบนปฏิทิน
create index if not exists project_tasks_due_idx
  on public.project_tasks (project_id, due_on);

-- ---------- เติมวันที่ให้ข้อมูลตัวอย่างของ CoreSync ----------
-- ให้มีของวางบนปฏิทินตอนทดสอบ
update public.project_tasks t
set due_on = case t.title
      when 'ต่อ API ใบสั่งงานกับ ERP'      then current_date - 3
      when 'ทดสอบอ่านค่าจาก PLC ตัวที่ 4'  then current_date + 1
      when 'ทำหน้ารายงานส่งหัวหน้ากะ'      then current_date + 7
      when 'อบรมการใช้งานให้ทีมหน้างาน'    then current_date + 30
      else null
    end
from public.projects p
where p.id = t.project_id
  and p.slug = 'coresync'
  and t.due_on is null;
