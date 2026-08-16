"use client";

import {
  TASK_COLUMNS,
  TASK_STATUS_LABEL,
  dueText,
  isOverdue,
  thaiDate,
  todayIso,
  type Task,
  type TaskStatus,
} from "@/lib/project-tasks";

/* ============================================================
   มุมมองงาน 5 แบบ — ข้อมูลชุดเดียวกัน แค่มองคนละมุม
   ทุกมุมมองรับ props เหมือนกัน จะได้สลับไปมาโดยไม่ต้องคิดอะไรเพิ่ม
   ============================================================ */

export type ViewProps = {
  tasks: Task[];
  canEdit: boolean;
  onToggle: (t: Task) => void;
  onMove: (t: Task, status: TaskStatus) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
};

const rowBase = "rounded-xl bg-surface-overlay px-3 py-2.5 text-sm";

function Check({ t, canEdit, onToggle }: { t: Task; canEdit: boolean; onToggle: ViewProps["onToggle"] }) {
  return (
    <button
      type="button"
      disabled={!canEdit}
      onClick={() => onToggle(t)}
      aria-label={t.status === "done" ? `ทำเครื่องหมายว่ายังไม่เสร็จ: ${t.title}` : `ทำเครื่องหมายว่าเสร็จ: ${t.title}`}
      className={`grid size-4.5 flex-none place-items-center rounded border-2 text-[0.6rem] font-black transition-colors ${
        t.status === "done"
          ? "border-brand-500 bg-brand-500 text-brand-950"
          : "border-line-strong hover:border-brand-500"
      } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
    >
      {t.status === "done" ? "✓" : ""}
    </button>
  );
}

function Actions({ t, canEdit, onEdit, onDelete }: Pick<ViewProps, "canEdit" | "onEdit" | "onDelete"> & { t: Task }) {
  if (!canEdit) return null;
  return (
    <span className="ml-auto flex flex-none gap-1">
      <button
        type="button"
        onClick={() => onEdit(t)}
        className="rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-brand-400"
      >
        แก้
      </button>
      <button
        type="button"
        onClick={() => onDelete(t)}
        className="rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-red-400"
      >
        ลบ
      </button>
    </span>
  );
}

function DueBadge({ t }: { t: Task }) {
  const text = dueText(t);
  if (!text) return null;
  return (
    <span className={`flex-none text-[0.76rem] ${isOverdue(t) ? "font-bold text-red-400" : "text-ink-faint"}`}>
      {isOverdue(t) ? `เลยกำหนด · ${text}` : text}
    </span>
  );
}

/* ---------------- 1. รายการ ---------------- */
export function ListView({ tasks, canEdit, onToggle, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid gap-4">
      {TASK_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
        if (items.length === 0) return null;
        return (
          <div key={col.id}>
            <h3 className="mb-2 flex items-center gap-2 text-[0.82rem] font-bold text-ink-muted">
              <span className={`size-2 rounded-full ${col.dot}`} />
              {col.label}
              <span className="text-ink-faint">{items.length}</span>
            </h3>
            <ul className="grid gap-1.5">
              {items.map((t) => (
                <li key={t.id} className={`flex items-center gap-3 ${rowBase}`}>
                  <Check t={t} canEdit={canEdit} onToggle={onToggle} />
                  <span className={t.status === "done" ? "text-ink-faint line-through" : "text-ink-muted"}>
                    {t.title}
                  </span>
                  <span className="ml-auto flex items-center gap-2">
                    <DueBadge t={t} />
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
export function BoardView({ tasks, canEdit, onToggle, onMove, onEdit, onDelete }: ViewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {TASK_COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.id);
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
              if (t && t.status !== col.id) onMove(t, col.id);
            }}
            className="rounded-2xl border border-line bg-surface-overlay/40 p-3"
          >
            <h3 className="mb-2.5 flex items-center gap-2 text-[0.82rem] font-bold text-ink-muted">
              <span className={`size-2 rounded-full ${col.dot}`} />
              {col.label}
              <span className="text-ink-faint">{items.length}</span>
            </h3>

            <div className="grid gap-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  draggable={canEdit}
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  className={`rounded-xl border border-line bg-surface-raised p-3 text-sm ${
                    canEdit ? "cursor-grab active:cursor-grabbing" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Check t={t} canEdit={canEdit} onToggle={onToggle} />
                    <span className={`leading-snug ${t.status === "done" ? "text-ink-faint line-through" : "text-ink"}`}>
                      {t.title}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <DueBadge t={t} />
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
export function TableView({ tasks, canEdit, onToggle, onEdit, onDelete }: ViewProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-line-strong text-left text-[0.72rem] uppercase tracking-wider text-ink-faint">
            <th className="w-8 pb-2" />
            <th className="pb-2 font-medium">งาน</th>
            <th className="pb-2 font-medium">สถานะ</th>
            <th className="pb-2 font-medium">กำหนดส่ง</th>
            {canEdit && <th className="pb-2" />}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} className="border-b border-line last:border-b-0">
              <td className="py-2.5">
                <Check t={t} canEdit={canEdit} onToggle={onToggle} />
              </td>
              <td className={`py-2.5 pr-3 ${t.status === "done" ? "text-ink-faint line-through" : "text-ink-muted"}`}>
                {t.title}
              </td>
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-1.5 text-[0.82rem] text-ink-muted">
                  <span className={`size-2 rounded-full ${TASK_COLUMNS.find((c) => c.id === t.status)?.dot}`} />
                  {TASK_STATUS_LABEL[t.status]}
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <DueBadge t={t} />
              </td>
              {canEdit && (
                <td className="py-2.5">
                  <span className="flex justify-end">
                    <Actions t={t} canEdit={canEdit} onEdit={onEdit} onDelete={onDelete} />
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- 4. ปฏิทิน ---------------- */
export function CalendarView({ tasks, canEdit, onEdit, month }: ViewProps & { month: Date }) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const lead = first.getDay(); // อาทิตย์ = 0
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
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => onEdit(t)}
                    title={t.title}
                    className={`truncate rounded px-1.5 py-0.5 text-left text-[0.7rem] leading-snug ${
                      t.status === "done"
                        ? "bg-brand-500/15 text-brand-300 line-through"
                        : isOverdue(t)
                          ? "bg-red-500/15 text-red-300"
                          : "bg-amber-400/15 text-amber-200"
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
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
export function TimelineView({ tasks, canEdit, onEdit }: ViewProps) {
  const dated = tasks.filter((t) => t.due_on);
  if (dated.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint">
        ยังไม่มีงานที่ระบุวันที่ — ไทม์ไลน์ต้องใช้วันเริ่มหรือวันครบกำหนดถึงจะวาดแท่งได้
      </p>
    );
  }

  // ขอบเขตของแกนเวลา = วันแรกสุดถึงวันสุดท้ายของงานทั้งหมด บวกขอบไว้หน่อย
  const stamps = dated.flatMap((t) => [t.started_on, t.due_on].filter(Boolean) as string[]);
  const min = new Date(`${stamps.reduce((a, b) => (a < b ? a : b))}T00:00:00`);
  const max = new Date(`${stamps.reduce((a, b) => (a > b ? a : b))}T00:00:00`);
  min.setDate(min.getDate() - 2);
  max.setDate(max.getDate() + 2);

  const span = Math.max(1, (max.getTime() - min.getTime()) / 86400000);
  const pct = (iso: string) => ((new Date(`${iso}T00:00:00`).getTime() - min.getTime()) / 86400000 / span) * 100;
  const todayPct = pct(todayIso());

  return (
    <div>
      <div className="mb-2 flex justify-between text-[0.72rem] text-ink-faint">
        <span>{thaiDate(min.toISOString().slice(0, 10))}</span>
        <span>{thaiDate(max.toISOString().slice(0, 10))}</span>
      </div>

      <div className="relative grid gap-1.5 rounded-xl border border-line bg-surface-overlay/40 p-3">
        {todayPct >= 0 && todayPct <= 100 && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-2 w-px bg-brand-500/60"
            style={{ left: `calc(0.75rem + ${todayPct}% * 0.94)` }}
          />
        )}

        {dated.map((t) => {
          const start = t.started_on ?? t.due_on!;
          const left = pct(start);
          const right = pct(t.due_on!);
          // งานที่มีแค่วันครบกำหนด วาดเป็นแท่งสั้น ๆ ให้มองเห็น
          const width = Math.max(2.5, right - left);
          return (
            <div key={t.id} className="grid grid-cols-[9rem_1fr] items-center gap-3">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => onEdit(t)}
                title={t.title}
                className={`truncate text-left text-[0.8rem] ${t.status === "done" ? "text-ink-faint line-through" : "text-ink-muted"} ${canEdit ? "hover:text-brand-400" : ""}`}
              >
                {t.title}
              </button>
              <div className="relative h-5">
                <span
                  className={`absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full ${
                    t.status === "done" ? "bg-brand-500" : isOverdue(t) ? "bg-red-500" : "bg-amber-400"
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
