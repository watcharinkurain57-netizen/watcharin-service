"use client";

import { Avatar } from "./Avatar";
import {
  colorOf,
  dueText,
  groupTasks,
  isDone,
  isOverdue,
  isoOf,
  personName,
  thaiDate,
  todayIso,
  type Person,
  type Task,
  type TaskColumn,
  type TaskGroup,
} from "@/lib/project-tasks";

/* ============================================================
   มุมมองงาน 5 แบบ — ข้อมูลชุดเดียวกัน แค่มองคนละมุม
   ทุกมุมมองรับ props เหมือนกัน จะได้สลับไปมาโดยไม่ต้องคิดอะไรเพิ่ม
   คอลัมน์มาจากฐานข้อมูล ไม่ได้เขียนตายไว้ แต่ละโปรเจกต์ตั้งเองได้
   ============================================================ */

export type ViewProps = {
  tasks: Task[];
  columns: TaskColumn[];
  /** หมวดตามเนื้องาน — คนละแกนกับ columns ที่เป็นสถานะ */
  groups: TaskGroup[];
  /** คนในโปรเจกต์ ใช้แปลง assignee_id เป็นชื่อกับรูป */
  people: Person[];
  canEdit: boolean;
  /** ติ๊กเสร็จ = ย้ายไปคอลัมน์ที่ is_done ตัวแรก หรือย้ายกลับคอลัมน์แรก */
  onToggle: (t: Task) => void;
  onMove: (t: Task, columnId: string) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
};

const rowBase = "rounded-xl bg-surface-overlay px-3 py-2.5 text-sm";

function Check({ t, columns, canEdit, onToggle }: Pick<ViewProps, "columns" | "canEdit" | "onToggle"> & { t: Task }) {
  const done = isDone(t, columns);
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => onToggle(t)}
      aria-label={done ? `ย้ายกลับว่ายังไม่เสร็จ: ${t.title}` : `ทำเครื่องหมายว่าเสร็จ: ${t.title}`}
      className={`grid size-4 flex-none place-items-center rounded border-2 text-[0.6rem] font-black transition-colors ${
        done ? "border-brand-500 bg-brand-500 text-brand-950" : "border-line-strong hover:border-brand-500"
      } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
    >
      {done ? "✓" : ""}
    </button>
  );
}

function Actions({ t, canEdit, onEdit, onDelete }: Pick<ViewProps, "canEdit" | "onEdit" | "onDelete"> & { t: Task }) {
  if (!canEdit) return null;
  return (
    <span className="ml-auto flex flex-none gap-1">
      <button type="button" onClick={() => onEdit(t)} className="rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-brand-400">
        แก้
      </button>
      <button type="button" onClick={() => onDelete(t)} className="rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-red-400">
        ลบ
      </button>
    </span>
  );
}

function DueBadge({ t, columns }: { t: Task; columns: TaskColumn[] }) {
  const text = dueText(t);
  if (!text) return null;
  const over = isOverdue(t, columns);
  return (
    <span className={`flex-none text-[0.76rem] ${over ? "font-bold text-red-400" : "text-ink-faint"}`}>
      {over ? `เลยกำหนด · ${text}` : text}
    </span>
  );
}

/** รูปคนที่รับผิดชอบ — ไม่แสดงอะไรเลยถ้ายังไม่ได้มอบหมาย เพื่อไม่ให้รก */
function Assignee({ t, people, size = 22 }: { t: Task; people: Person[]; size?: number }) {
  if (!t.assignee_id) return null;
  const p = people.find((x) => x.id === t.assignee_id);
  return <Avatar person={p} size={size} />;
}

function Title({ t, columns }: { t: Task; columns: TaskColumn[] }) {
  return (
    <span className={isDone(t, columns) ? "text-ink-faint line-through" : "text-ink-muted"}>{t.title}</span>
  );
}

/** ป้ายบอกว่างานนี้อยู่หมวดไหน — ใช้ตอนที่หัวข้อไม่ได้บอกอยู่แล้ว */
function GroupChip({ t, groups }: { t: Task; groups: TaskGroup[] }) {
  const g = groups.find((x) => x.id === t.group_id);
  if (!g) return null;
  return (
    <span className={`flex-none rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${colorOf(g.color).chip}`}>
      {g.name}
    </span>
  );
}

/** ป้ายบอกสถานะ — ใช้ตอนจัดกลุ่มตามหมวด ซึ่งหัวข้อไม่ได้บอกสถานะแล้ว */
function ColumnChip({ t, columns }: { t: Task; columns: TaskColumn[] }) {
  const c = columns.find((x) => x.id === t.column_id);
  if (!c) return null;
  return (
    <span className={`flex-none rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${colorOf(c.color).chip}`}>
      {c.name}
    </span>
  );
}

/* ---------------- 1. รายการ ---------------- */
/**
 * จัดกลุ่มได้สองแบบ เพราะสองแกนนี้ตอบคนละคำถาม
 *   "column" (เดิม) — งานไหนอยู่ขั้นไหน
 *   "group"  (ใหม่) — งานไหนเป็นเรื่องเดียวกัน
 * แถวจะโชว์ป้ายของ *อีกแกนหนึ่ง* เสมอ จะได้ไม่เสียข้อมูลที่หัวข้อไม่ได้บอก
 */
export function ListView({
  tasks,
  columns,
  groups,
  people,
  canEdit,
  onToggle,
  onEdit,
  onDelete,
  groupBy = "column",
}: ViewProps & { groupBy?: "column" | "group" }) {
  const sections =
    groupBy === "group"
      ? groupTasks(tasks, groups).map((b) => ({
          key: b.group?.id ?? "ไม่มีหมวด",
          name: b.group?.name ?? "ยังไม่จัดหมวด",
          dot: b.group ? colorOf(b.group.color).dot : "bg-line-strong",
          items: b.items,
        }))
      : columns.map((col) => ({
          key: col.id,
          name: col.name,
          dot: colorOf(col.color).dot,
          items: tasks.filter((t) => t.column_id === col.id),
        }));

  return (
    <div className="grid gap-4">
      {sections.map((s) => {
        if (s.items.length === 0) return null;
        return (
          <div key={s.key}>
            <h3 className="mb-2 flex items-center gap-2 text-[0.82rem] font-bold text-ink-muted">
              <span className={`size-2 rounded-full ${s.dot}`} />
              {s.name}
              <span className="text-ink-faint">{s.items.length}</span>
            </h3>
            <ul className="grid gap-1.5">
              {s.items.map((t) => (
                <li key={t.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${rowBase}`}>
                  <Check t={t} columns={columns} canEdit={canEdit} onToggle={onToggle} />
                  <Title t={t} columns={columns} />
                  <span className="ml-auto flex items-center gap-2">
                    {groupBy === "group" ? (
                      <ColumnChip t={t} columns={columns} />
                    ) : (
                      <GroupChip t={t} groups={groups} />
                    )}
                    <DueBadge t={t} columns={columns} />
                    <Assignee t={t} people={people} />
                  </span>
                  <Actions t={t} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 2. บอร์ด ---------------- */
export function BoardView({ tasks, columns, groups, people, canEdit, onToggle, onMove, onEdit, onDelete }: ViewProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => {
        const items = tasks.filter((t) => t.column_id === col.id);
        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              if (canEdit) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!canEdit) return;
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              const t = tasks.find((x) => x.id === id);
              if (t && t.column_id !== col.id) onMove(t, col.id);
            }}
            className="w-64 flex-none rounded-2xl border border-line bg-surface-overlay/40 p-3"
          >
            <h3 className="mb-2.5 flex items-center gap-2 text-[0.82rem] font-bold text-ink-muted">
              <span className={`size-2 rounded-full ${colorOf(col.color).dot}`} />
              {col.name}
              <span className="text-ink-faint">{items.length}</span>
            </h3>

            <div className="grid gap-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable={canEdit}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  className={`rounded-xl border border-line bg-surface-raised p-3 text-sm ${canEdit ? "cursor-grab active:cursor-grabbing" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <Check t={t} columns={columns} canEdit={canEdit} onToggle={onToggle} />
                    <span className={`leading-snug ${isDone(t, columns) ? "text-ink-faint line-through" : "text-ink"}`}>
                      {t.title}
                    </span>
                  </div>
                  {/* หัวคอลัมน์บอกสถานะอยู่แล้ว การ์ดจึงบอกหมวดแทน ไม่ซ้ำกัน */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <GroupChip t={t} groups={groups} />
                    <DueBadge t={t} columns={columns} />
                    <Assignee t={t} people={people} size={20} />
                    <Actions t={t} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-line px-3 py-5 text-center text-[0.8rem] text-ink-faint">
                  {canEdit ? "ลากการ์ดมาวางได้" : "ไม่มีงาน"}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- 3. ตาราง ---------------- */
export function TableView({ tasks, columns, groups, people, canEdit, onToggle, onEdit, onDelete }: ViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-line-strong text-left text-[0.72rem] uppercase tracking-wider text-ink-faint">
            <th className="w-8 pb-2" />
            <th className="pb-2 font-medium">งาน</th>
            <th className="pb-2 font-medium">หมวด</th>
            <th className="pb-2 font-medium">คอลัมน์</th>
            <th className="pb-2 font-medium">ผู้รับผิดชอบ</th>
            <th className="pb-2 font-medium">กำหนดส่ง</th>
            {canEdit && <th className="pb-2" />}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => {
            const col = columns.find((c) => c.id === t.column_id);
            return (
              <tr key={t.id} className="border-b border-line last:border-b-0">
                <td className="py-2.5">
                  <Check t={t} columns={columns} canEdit={canEdit} onToggle={onToggle} />
                </td>
                <td className="py-2.5 pr-3">
                  <Title t={t} columns={columns} />
                </td>
                <td className="py-2.5 pr-3">
                  {t.group_id ? (
                    <GroupChip t={t} groups={groups} />
                  ) : (
                    <span className="text-[0.82rem] text-ink-faint">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-ink-muted">
                    <span className={`size-2 rounded-full ${colorOf(col?.color ?? "slate").dot}`} />
                    {col?.name ?? "—"}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  {t.assignee_id ? (
                    <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-ink-muted">
                      <Assignee t={t} people={people} size={20} />
                      {personName(people.find((p) => p.id === t.assignee_id))}
                    </span>
                  ) : (
                    <span className="text-[0.82rem] text-ink-faint">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  <DueBadge t={t} columns={columns} />
                </td>
                {canEdit && (
                  <td className="py-2.5">
                    <span className="flex justify-end">
                      <Actions t={t} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
                    </span>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 4. ปฏิทิน ---------------- */
export function CalendarView({ tasks, columns, people, canEdit, onEdit, month }: ViewProps & { month: Date }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const lead = new Date(year, m, 1).getDay(); // อาทิตย์ = 0
  const today = todayIso();

  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.due_on) continue;
    byDay.set(t.due_on, [...(byDay.get(t.due_on) ?? []), t]);
  }

  const unscheduled = tasks.filter((t) => !t.due_on);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
          <div key={d} className="bg-surface-overlay py-1.5 text-center text-[0.72rem] font-bold text-ink-faint">
            {d}
          </div>
        ))}

        {cells.map((day, i) => {
          const iso = day ? `${year}-${`${m + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}` : null;
          const items = iso ? (byDay.get(iso) ?? []) : [];
          return (
            <div
              key={i}
              className={`min-h-[5.5rem] bg-surface-raised p-1.5 ${iso === today ? "ring-1 ring-inset ring-brand-500" : ""}`}
            >
              {day && (
                <span className={`text-[0.72rem] ${iso === today ? "font-bold text-brand-400" : "text-ink-faint"}`}>
                  {day}
                </span>
              )}
              <div className="mt-1 grid gap-1">
                {items.map((t) => {
                  const col = columns.find((c) => c.id === t.column_id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => onEdit(t)}
                      title={`${t.title} · ${col?.name ?? ""}${t.assignee_id ? ` · ${personName(people.find((p) => p.id === t.assignee_id))}` : ""}`}
                      className={`truncate rounded px-1.5 py-0.5 text-left text-[0.7rem] leading-snug ${
                        isOverdue(t, columns)
                          ? "bg-red-500/15 text-red-300"
                          : colorOf(col?.color ?? "slate").chip
                      } ${isDone(t, columns) ? "line-through" : ""}`}
                    >
                      {t.title}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <p className="mt-3 text-[0.82rem] text-ink-faint">
          ยังไม่ได้กำหนดวัน {unscheduled.length} งาน — ใส่วันที่ให้ถึงจะขึ้นบนปฏิทิน
        </p>
      )}
    </div>
  );
}

/* ---------------- 5. ไทม์ไลน์ ---------------- */
export function TimelineView({ tasks, columns, people, canEdit, onEdit }: ViewProps) {
  const dated = tasks.filter((t) => t.due_on);
  if (dated.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint">
        ยังไม่มีงานที่ระบุวันที่ — ไทม์ไลน์ต้องใช้วันเริ่มหรือวันครบกำหนดถึงจะวาดแท่งได้
      </p>
    );
  }

  const stamps = dated.flatMap((t) => [t.started_on, t.due_on].filter(Boolean) as string[]);
  const min = new Date(`${stamps.reduce((a, b) => (a < b ? a : b))}T00:00:00`);
  const max = new Date(`${stamps.reduce((a, b) => (a > b ? a : b))}T00:00:00`);
  min.setDate(min.getDate() - 2);
  max.setDate(max.getDate() + 2);

  const span = Math.max(1, (max.getTime() - min.getTime()) / 86400000);
  const pct = (iso: string) => ((new Date(`${iso}T00:00:00`).getTime() - min.getTime()) / 86400000 / span) * 100;
  const todayPct = pct(todayIso());
  const showToday = todayPct >= 0 && todayPct <= 100;

  return (
    <div>
      <div className="mb-2 flex justify-between text-[0.72rem] text-ink-faint">
        <span>{thaiDate(isoOf(min))}</span>
        <span>{thaiDate(isoOf(max))}</span>
      </div>

      <div className="grid gap-1.5 rounded-xl border border-line bg-surface-overlay/40 p-3">
        {dated.map((t) => {
          const start = t.started_on ?? t.due_on!;
          const left = pct(start);
          const width = Math.max(2.5, pct(t.due_on!) - left);
          const col = columns.find((c) => c.id === t.column_id);
          return (
            <div key={t.id} className="grid grid-cols-[9rem_1fr] items-center gap-3">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onEdit(t)}
                title={`${t.title} · ${col?.name ?? ""}`}
                className={`flex items-center gap-1.5 overflow-hidden text-left text-[0.8rem] ${isDone(t, columns) ? "text-ink-faint line-through" : "text-ink-muted"} ${canEdit ? "hover:text-brand-400" : ""}`}
              >
                <Assignee t={t} people={people} size={18} />
                <span className="truncate">{t.title}</span>
              </button>
              {/*
                เส้นวันนี้วาดในแทร็กของแต่ละแถว ไม่ใช่วาดทับทั้งกล่อง
                เพราะกล่องนอกรวมคอลัมน์ชื่องานไว้ด้วย ถ้าวาดทับทั้งกล่อง
                เปอร์เซ็นต์จะคิดจากความกว้างที่รวมชื่องาน เส้นเลยไม่ตรงกับแท่ง
              */}
              <div className="relative h-5">
                {showToday && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-y-1 w-px bg-brand-500/60"
                    style={{ left: `${todayPct}%` }}
                  />
                )}
                <span
                  className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${
                    isOverdue(t, columns) ? "bg-red-500" : colorOf(col?.color ?? "slate").dot
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
