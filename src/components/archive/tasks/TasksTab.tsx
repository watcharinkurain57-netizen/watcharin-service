"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  COLUMN_COLORS,
  COLUMN_SELECT,
  PROFILE_SELECT,
  TASK_SELECT,
  colorOf,
  isDone,
  personName,
  todayIso,
  type ColumnColor,
  type Person,
  type Task,
  type TaskColumn,
} from "@/lib/project-tasks";
import {
  BoardView,
  CalendarView,
  ListView,
  TableView,
  TimelineView,
  type ViewProps,
} from "./TaskViews";

type ViewId = "list" | "board" | "table" | "calendar" | "timeline";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "list", label: "รายการ" },
  { id: "board", label: "บอร์ด" },
  { id: "table", label: "ตาราง" },
  { id: "calendar", label: "ปฏิทิน" },
  { id: "timeline", label: "ไทม์ไลน์" },
];

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

function friendly(code: string | undefined, fallback: string, action: string) {
  if (code === "42501") return `${action}ได้เฉพาะเจ้าของโปรเจกต์`;
  if (code === "23505") return "มีคอลัมน์ชื่อนี้อยู่แล้วในโปรเจกต์นี้";
  if (code === "23503") return "ย้ายงานออกจากคอลัมน์นี้ให้หมดก่อนถึงจะลบได้";
  return fallback;
}

export function TasksTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<TaskColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("list");
  const [month, setMonth] = useState(() => new Date());
  const [editing, setEditing] = useState<Task | null>(null);
  const [managing, setManaging] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [me, setMe] = useState<string | null>(null);
  /** "all" | "none" | user_id */
  const [who, setWho] = useState("all");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchAll = useCallback(async () => {
    const [t, c, m] = await Promise.all([
      supabase.from("project_tasks").select(TASK_SELECT).eq("project_id", projectId).order("sort"),
      supabase.from("project_task_columns").select(COLUMN_SELECT).eq("project_id", projectId).order("sort"),
      // ดึงโปรไฟล์ผ่านความสัมพันธ์ของ project_members จะได้เฉพาะคนในโปรเจกต์นี้
      supabase.from("project_members").select(`profiles!inner(${PROFILE_SELECT})`).eq("project_id", projectId),
    ]);
    return {
      tasks: (t.data ?? []) as Task[],
      columns: (c.data ?? []) as TaskColumn[],
      people: ((m.data ?? []) as unknown as { profiles: Person }[]).map((r) => r.profiles),
      // แยก error ของรายชื่อคนออกจากงาน เพราะระดับความร้ายแรงต่างกัน
      // งานโหลดไม่ได้ = แท็บใช้ไม่ได้เลย · รายชื่อโหลดไม่ได้ = แค่ไม่มีรูปกับชื่อ
      error: t.error ?? c.error,
      peopleError: m.error,
    };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [r, auth] = await Promise.all([fetchAll(), supabase.auth.getUser()]);
      if (!alive) return;
      if (r.error) setError(r.error.message);
      else if (r.peopleError)
        setError("โหลดรายชื่อคนในโปรเจกต์ไม่ได้ — ชื่อกับรูปผู้รับผิดชอบจะไม่ขึ้น แต่งานยังใช้ได้ตามปกติ");
      setTasks(r.tasks);
      setColumns(r.columns);
      setPeople(r.people);
      setMe(auth.data.user?.id ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [fetchAll, supabase]);

  async function reload() {
    const r = await fetchAll();
    setTasks(r.tasks);
    setColumns(r.columns);
    setPeople(r.people);
  }

  /* ---------- งาน ---------- */

  async function patch(t: Task, changes: Partial<Task>) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...changes } : x)));
    const { error: e } = await supabase.from("project_tasks").update(changes).eq("id", t.id);
    if (e) {
      setError(friendly(e.code, e.message, "แก้งาน"));
      reload();
    }
  }

  async function removeTask(t: Task) {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const { error: e } = await supabase.from("project_tasks").delete().eq("id", t.id);
    if (e) {
      setError(friendly(e.code, e.message, "ลบงาน"));
      reload();
    }
  }

  async function addTask(form: FormData) {
    const title = String(form.get("title") ?? "").trim();
    if (!title || columns.length === 0) return;
    const due = String(form.get("due_on") ?? "").trim();

    const { error: e } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      column_id: columns[0].id,
      title,
      due_on: due || null,
      sort: (tasks.at(-1)?.sort ?? 0) + 1,
    });

    if (e) setError(friendly(e.code, e.message, "เพิ่มงาน"));
    reload();
  }

  /**
   * ติ๊กเสร็จ = ย้ายไปคอลัมน์ที่ตั้งไว้ว่า "จบแล้ว" ตัวแรก
   * ถ้าอยู่ในคอลัมน์จบแล้ว ให้ย้ายกลับคอลัมน์แรกสุด
   */
  function toggle(t: Task) {
    const doneCol = columns.find((c) => c.is_done);
    if (!doneCol) {
      setError("ยังไม่ได้ตั้งว่าคอลัมน์ไหนคือ “จบแล้ว” — ตั้งได้ในจัดการคอลัมน์");
      return;
    }
    patch(t, { column_id: isDone(t, columns) ? columns[0].id : doneCol.id });
  }

  /* ---------- คอลัมน์ ---------- */

  async function addColumn(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;

    const { error: e } = await supabase.from("project_task_columns").insert({
      project_id: projectId,
      name,
      color: String(form.get("color") ?? "slate") as ColumnColor,
      // ต่อท้ายเสมอ แล้วให้ผู้ใช้กดลูกศรย้ายเอง
      // เคยลองแทรกก่อนคอลัมน์ "จบแล้ว" ด้วยการลบ 0.5 แต่ sort เป็น int
      // ค่าจะโดนปัดแล้วไปชนกับคอลัมน์เดิม ลำดับเลยสลับมั่วโดยไม่มีใครรู้
      sort: Math.max(0, ...columns.map((c) => c.sort)) + 1,
    });

    if (e) setError(friendly(e.code, e.message, "เพิ่มคอลัมน์"));
    reload();
  }

  async function patchColumn(c: TaskColumn, changes: Partial<TaskColumn>) {
    setColumns((prev) => prev.map((x) => (x.id === c.id ? { ...x, ...changes } : x)));
    const { error: e } = await supabase.from("project_task_columns").update(changes).eq("id", c.id);
    if (e) {
      setError(friendly(e.code, e.message, "แก้คอลัมน์"));
      reload();
    }
  }

  async function removeColumn(c: TaskColumn) {
    if (tasks.some((t) => t.column_id === c.id)) {
      setError(`คอลัมน์ “${c.name}” ยังมีงานอยู่ — ย้ายงานออกให้หมดก่อน`);
      return;
    }
    const { error: e } = await supabase.from("project_task_columns").delete().eq("id", c.id);
    if (e) setError(friendly(e.code, e.message, "ลบคอลัมน์"));
    reload();
  }

  /** สลับลำดับกับคอลัมน์ข้างเคียง — เก็บ sort เป็นตัวเลข ไม่ต้องเรียงใหม่ทั้งชุด */
  async function moveColumn(c: TaskColumn, dir: -1 | 1) {
    const i = columns.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= columns.length) return;
    const other = columns[j];
    await Promise.all([
      patchColumn(c, { sort: other.sort }),
      patchColumn(other, { sort: c.sort }),
    ]);
    reload();
  }

  /** กรองก่อนส่งเข้ามุมมอง ทุกมุมมองจึงเห็นชุดเดียวกันเสมอ ไม่ต้องรู้เรื่องตัวกรอง */
  const shown = tasks.filter((t) =>
    who === "all" ? true : who === "none" ? !t.assignee_id : t.assignee_id === who
  );

  const viewProps: ViewProps = {
    tasks: shown,
    columns,
    people,
    canEdit,
    onToggle: toggle,
    onMove: (t, columnId) => patch(t, { column_id: columnId }),
    onEdit: (t) => setEditing(t),
    onDelete: removeTask,
  };

  if (loading) return <p className="py-8 text-center text-sm text-ink-faint">กำลังโหลดงาน…</p>;

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.9rem] text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      {/* ---------- สลับมุมมอง ---------- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-overlay p-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              aria-pressed={view === v.id}
              className={`rounded-lg px-3 py-1.5 text-[0.85rem] font-bold transition-colors ${
                view === v.id ? "bg-brand-500 text-brand-950" : "text-ink-muted hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* กรองตามผู้รับผิดชอบ — ทุกคนใช้ได้ ไม่ใช่แค่เจ้าของ
            เพราะน้อง ๆ ในโปรเจกต์ต้องดูงานตัวเองได้ */}
        {people.length > 0 && (
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            aria-label="กรองตามผู้รับผิดชอบ"
            className="rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.85rem] font-semibold text-ink-muted"
          >
            <option value="all">ทุกคน ({tasks.length})</option>
            {me && (
              <option value={me}>
                งานของฉัน ({tasks.filter((t) => t.assignee_id === me).length})
              </option>
            )}
            {people
              .filter((p) => p.id !== me)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {personName(p)} ({tasks.filter((t) => t.assignee_id === p.id).length})
                </option>
              ))}
            <option value="none">
              ยังไม่มอบหมาย ({tasks.filter((t) => !t.assignee_id).length})
            </option>
          </select>
        )}

        {canEdit && (
          <button
            type="button"
            onClick={() => setManaging((m) => !m)}
            aria-expanded={managing}
            className={`rounded-xl border px-3 py-2 text-[0.85rem] font-bold transition-colors ${
              managing ? "border-brand-500 text-brand-400" : "border-line text-ink-muted hover:text-ink"
            }`}
          >
            จัดการคอลัมน์
          </button>
        )}

        {view === "calendar" && (
          <div className="ml-auto flex items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="rounded-lg border border-line px-2.5 py-1.5 font-bold text-ink-muted hover:text-ink"
              aria-label="เดือนก่อนหน้า"
            >
              ‹
            </button>
            <span className="min-w-[7rem] text-center font-semibold tabular-nums">
              {month.toLocaleDateString("en-CA", { year: "numeric", month: "short" })}
            </span>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="rounded-lg border border-line px-2.5 py-1.5 font-bold text-ink-muted hover:text-ink"
              aria-label="เดือนถัดไป"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* ---------- จัดการคอลัมน์ ---------- */}
      {managing && canEdit && (
        <section className="mb-4 rounded-2xl border border-line bg-surface-raised p-4">
          <h3 className="mb-3 text-[0.95rem] font-bold">คอลัมน์ของโปรเจกต์นี้</h3>

          <ul className="mb-4 grid gap-2">
            {columns.map((c, i) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2">
                <span className={`size-2.5 flex-none rounded-full ${colorOf(c.color).dot}`} />

                <input
                  defaultValue={c.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== c.name) patchColumn(c, { name: v });
                  }}
                  aria-label={`ชื่อคอลัมน์ ${c.name}`}
                  className="min-w-[7rem] flex-1 rounded-lg bg-transparent px-1 py-1 text-[0.9rem] font-semibold text-ink outline-none focus:bg-surface-raised"
                />

                <select
                  value={c.color}
                  onChange={(e) => patchColumn(c, { color: e.target.value as ColumnColor })}
                  aria-label={`สีของ ${c.name}`}
                  className="rounded-lg border border-line bg-surface-raised px-2 py-1 text-[0.8rem] text-ink-muted"
                >
                  {COLUMN_COLORS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-[0.8rem] text-ink-muted">
                  <input
                    type="checkbox"
                    checked={c.is_done}
                    onChange={(e) => patchColumn(c, { is_done: e.target.checked })}
                    className="size-3.5 accent-brand-500"
                  />
                  จบแล้ว
                </label>

                <span className="ml-auto flex flex-none gap-1">
                  <button
                    type="button"
                    onClick={() => moveColumn(c, -1)}
                    disabled={i === 0}
                    aria-label={`ย้าย ${c.name} ไปทางซ้าย`}
                    className="rounded px-1.5 py-0.5 text-ink-faint hover:text-ink disabled:opacity-30"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(c, 1)}
                    disabled={i === columns.length - 1}
                    aria-label={`ย้าย ${c.name} ไปทางขวา`}
                    className="rounded px-1.5 py-0.5 text-ink-faint hover:text-ink disabled:opacity-30"
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(c)}
                    className="rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint hover:text-red-400"
                  >
                    ลบ
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <form action={addColumn} className="flex flex-wrap gap-2">
            <input name="name" placeholder="ชื่อคอลัมน์ใหม่ เช่น รอรีวิว" className={`${field} min-w-[10rem] flex-1`} />
            <select name="color" defaultValue="sky" className={field} aria-label="สีคอลัมน์">
              {COLUMN_COLORS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950">
              เพิ่มคอลัมน์
            </button>
          </form>

          <p className="mt-3 text-[0.8rem] text-ink-faint">
            ติ๊ก “จบแล้ว” เพื่อบอกว่าคอลัมน์ไหนถือว่างานเสร็จ — ใช้ตัดสินว่าจะขีดฆ่าและไม่นับว่าเลยกำหนด
            · ลบคอลัมน์ได้เฉพาะตอนที่ไม่มีงานค้างอยู่
          </p>
        </section>
      )}

      {/* ---------- เพิ่มงาน ---------- */}
      {/* React 19 เคลียร์ฟอร์มให้เองหลัง action ทำงานเสร็จ */}
      {canEdit && columns.length > 0 && (
        <form action={addTask} className="mb-4 flex flex-wrap gap-2">
          <input name="title" placeholder={`เพิ่มงานใหม่ลง “${columns[0].name}”…`} className={`${field} min-w-[12rem] flex-1`} />
          <input name="due_on" type="date" className={field} aria-label="กำหนดส่ง" />
          <button
            type="submit"
            className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            เพิ่ม
          </button>
        </form>
      )}

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint">
          {tasks.length === 0 ? "ยังไม่มีงานในโปรเจกต์นี้" : "ไม่มีงานที่ตรงกับตัวกรองนี้"}
        </p>
      ) : view === "list" ? (
        <ListView {...viewProps} />
      ) : view === "board" ? (
        <BoardView {...viewProps} />
      ) : view === "table" ? (
        <TableView {...viewProps} />
      ) : view === "calendar" ? (
        <CalendarView {...viewProps} month={month} />
      ) : (
        <TimelineView {...viewProps} />
      )}

      {/* ---------- กล่องแก้งาน ---------- */}
      {editing && canEdit && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`แก้ไขงาน ${editing.title}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditing(null);
          }}
        >
          <form
            className="w-full max-w-md rounded-2xl border border-line bg-surface-raised p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await patch(editing, {
                title: String(f.get("title") ?? "").trim() || editing.title,
                column_id: String(f.get("column_id")),
                assignee_id: String(f.get("assignee_id") ?? "") || null,
                due_on: String(f.get("due_on") ?? "") || null,
                started_on: String(f.get("started_on") ?? "") || null,
                due_label: String(f.get("due_label") ?? "").trim() || null,
              });
              setEditing(null);
            }}
          >
            <h3 className="mb-4 text-base font-bold">แก้ไขงาน</h3>

            <div className="grid gap-3">
              <input name="title" defaultValue={editing.title} className={field} aria-label="ชื่องาน" />

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-[0.8rem] text-ink-muted">
                  คอลัมน์
                  <select name="column_id" defaultValue={editing.column_id} className={field}>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-[0.8rem] text-ink-muted">
                  ผู้รับผิดชอบ
                  <select name="assignee_id" defaultValue={editing.assignee_id ?? ""} className={field}>
                    <option value="">ยังไม่มอบหมาย</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {personName(p)}
                        {p.id === me ? " (ฉัน)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-[0.8rem] text-ink-muted">
                  วันเริ่ม
                  <input name="started_on" type="date" defaultValue={editing.started_on ?? ""} className={field} />
                </label>
                <label className="grid gap-1 text-[0.8rem] text-ink-muted">
                  กำหนดส่ง
                  <input name="due_on" type="date" defaultValue={editing.due_on ?? ""} className={field} />
                </label>
              </div>

              <label className="grid gap-1 text-[0.8rem] text-ink-muted">
                หมายเหตุกำหนดส่ง
                <input
                  name="due_label"
                  defaultValue={editing.due_label ?? ""}
                  placeholder="เช่น รอลูกค้าตอบ — ใช้ตอนยังไม่มีวันแน่นอน"
                  className={field}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button type="submit" className="rounded-full bg-brand-500 px-5 py-2.5 text-[0.9rem] font-bold text-brand-950">
                บันทึก
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-full bg-surface-overlay px-5 py-2.5 text-[0.9rem] font-bold text-ink"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  removeTask(editing);
                  setEditing(null);
                }}
                className="ml-auto rounded-full border border-red-500/40 px-4 py-2.5 text-[0.9rem] font-bold text-red-300 hover:bg-red-500/10"
              >
                ลบงานนี้
              </button>
            </div>
          </form>
        </div>
      )}

      {canEdit && view === "board" && tasks.length > 0 && (
        <p className="mt-3 text-[0.8rem] text-ink-faint">ลากการ์ดข้ามคอลัมน์เพื่อเปลี่ยนสถานะได้</p>
      )}
      {canEdit && view === "calendar" && (
        <p className="mt-3 text-[0.8rem] text-ink-faint">
          วันนี้คือ {todayIso()} · กดที่งานบนปฏิทินเพื่อแก้วันที่
        </p>
      )}
    </div>
  );
}
