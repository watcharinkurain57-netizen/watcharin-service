-- ============================================================================
-- 0005_task_columns — คอลัมน์บอร์ดที่ตั้งเองได้ต่อโปรเจกต์
--
-- ของเดิม status เป็น enum ('todo','doing','done') ซึ่งตายตัวทั้งระบบ
-- อยากเพิ่มขั้นตอนอย่าง 'รอรีวิว' ต้องแก้ enum ซึ่งกระทบทุกโปรเจกต์พร้อมกัน
-- และคนละโปรเจกต์อาจมีขั้นตอนไม่เหมือนกัน
--
-- ย้ายไปเป็นตาราง project_task_columns แทน แต่ละโปรเจกต์กำหนดเองได้
--
-- ⚠️ migration นี้ลบคอลัมน์ status ทิ้งหลัง backfill เสร็จ
-- ต้องรันคู่กับโค้ดชุดใหม่ ถ้ารันแล้วหน้าเว็บยังเป็นโค้ดเก่าจะพัง
-- (dev server ให้รีสตาร์ตหลังรัน)
-- ============================================================================

-- ---------- ตารางคอลัมน์ ----------
create table if not exists public.project_task_columns (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,
  -- ชื่อสีแบบ token ไม่ใช่ค่าสีจริง เพื่อให้เปลี่ยนธีมทีเดียวได้ทั้งเว็บ
  color      text not null default 'slate'
             check (color in ('slate', 'amber', 'jade', 'sky', 'violet', 'coral')),
  -- คอลัมน์ที่ถือว่างานจบแล้ว ใช้ตัดสินว่าจะขีดฆ่าและไม่นับว่าเลยกำหนด
  -- เป็น boolean ไม่ใช่ "คอลัมน์สุดท้าย" เพราะบางบอร์ดมี 'ยกเลิก' ต่อท้าย
  is_done    boolean not null default false,
  sort       int not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create index if not exists project_task_columns_project_idx
  on public.project_task_columns (project_id, sort);

-- ---------- คอลัมน์เริ่มต้นให้โปรเจกต์ที่มีอยู่แล้ว ----------
insert into public.project_task_columns (project_id, name, color, is_done, sort)
select p.id, c.name, c.color, c.is_done, c.sort
from public.projects p
cross join (values
  ('รอทำ',      'slate', false, 1),
  ('กำลังทำ',   'amber', false, 2),
  ('เสร็จแล้ว', 'jade',  true,  3)
) as c(name, color, is_done, sort)
on conflict (project_id, name) do nothing;

-- ---------- ผูกงานเข้ากับคอลัมน์ ----------
alter table public.project_tasks
  add column if not exists column_id uuid references public.project_task_columns (id) on delete restrict;

update public.project_tasks t
set column_id = c.id
from public.project_task_columns c
where c.project_id = t.project_id
  and t.column_id is null
  and c.name = case t.status
        when 'todo'  then 'รอทำ'
        when 'doing' then 'กำลังทำ'
        when 'done'  then 'เสร็จแล้ว'
      end;

-- ต้องมีคอลัมน์เสมอ ไม่งั้นงานจะหลุดออกจากบอร์ดโดยไม่มีใครเห็น
alter table public.project_tasks
  alter column column_id set not null;

create index if not exists project_tasks_column_idx
  on public.project_tasks (column_id, sort);

-- ---------- เลิกใช้ status ----------
-- ลบทิ้งเลยแทนที่จะเก็บไว้เฉย ๆ เพราะการมีสองแหล่งความจริงที่ไม่มีใคร sync
-- คือบั๊กที่รอเกิด วันหนึ่งจะมีคนอ่าน status แล้วได้ค่าที่ไม่ตรงกับบอร์ด
alter table public.project_tasks drop column if exists status;
drop type if exists public.task_status;

-- ---------- โปรเจกต์ใหม่ได้คอลัมน์เริ่มต้นอัตโนมัติ ----------
create or replace function public.seed_task_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_task_columns (project_id, name, color, is_done, sort)
  values
    (new.id, 'รอทำ',      'slate', false, 1),
    (new.id, 'กำลังทำ',   'amber', false, 2),
    (new.id, 'เสร็จแล้ว', 'jade',  true,  3)
  on conflict (project_id, name) do nothing;
  return new;
end $$;

drop trigger if exists projects_seed_columns on public.projects;
create trigger projects_seed_columns after insert on public.projects
  for each row execute function public.seed_task_columns();

-- ---------- RLS ----------
alter table public.project_task_columns enable row level security;

drop policy if exists task_columns_read on public.project_task_columns;
create policy task_columns_read on public.project_task_columns
  for select to authenticated
  using (public.is_project_member(project_id));

drop policy if exists task_columns_write on public.project_task_columns;
create policy task_columns_write on public.project_task_columns
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------- ตรวจผล ----------
select p.slug, c.name, c.color, c.is_done, c.sort,
       (select count(*) from public.project_tasks t where t.column_id = c.id) as จำนวนงาน
from public.project_task_columns c
join public.projects p on p.id = c.project_id
order by p.slug, c.sort;
