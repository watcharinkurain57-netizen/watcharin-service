"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  TASK_SELECT,
  TASK_STATUS_LABEL,
  todayIso,
  type Task,
  type TaskStatus,
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

export function TasksTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewId>("list");
  const [month, setMonth] = useState(() => new Date());
  const [editing, setEditing] = useState<Task | null>(null);

  // สร้าง client ครั้งเดียว ไม่ใช่ทุกรอบ render
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  /** ดึงอย่างเดียว ไม่แตะ state — จะได้เรียกได้ทั้งจาก effect และจากปุ่มต่าง ๆ */
  const fetchTasks = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_tasks")
      .select(TASK_SELECT)
      .eq("project_id", projectId)
      .order("sort");
    return { rows: (data ?? []) as Task[], error: e };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { rows, error: e } = await fetchTasks();
      if (!alive) return;
      if (e) setError(e.message);
      else setTasks(rows);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [fetchTasks]);

  /** ดึงของจริงกลับมาทับ ใช้ตอนที่การอัปเดตแบบมองโลกในแง่ดีพลาด */
  async function reload() {
    const { rows } = await fetchTasks();
    setTasks(rows);
  }

  /** อัปเดตหน้าจอก่อนแล้วค่อยยิงไปฐานข้อมูล ถ้าพลาดค่อยดึงของจริงกลับมา */
  async function patch(t: Task, changes: Partial<Task>) {
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, ...changes } : x)));
    const { error: e } = await supabase.from("project_tasks").update(changes).eq("id", t.id);
    if (e) {
      setError(e.code === "42501" ? "แก้งานได้เฉพาะเจ้าของโปรเจกต์" : e.message);
      reload();
    }
  }

  async function remove(t: Task) {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const { error: e } = await supabase.from("project_tasks").delete().eq("id", t.id);
    if (e) {
      setError(e.code === "42501" ? "ลบงานได้เฉพาะเจ้าของโปรเจกต์" : e.message);
      reload();
    }
  }

  async function add(form: FormData) {
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;
    const due = String(form.get("due_on") ?? "").trim();

    const { error: e } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      title,
      status: "todo",
      due_on: due || null,
      sort: (tasks.at(-1)?.sort ?? 0) + 1,
    });

    if (e) setError(e.code === "42501" ? "เพิ่มงานได้เฉพาะเจ้าของโปรเจกต์" : e.message);
    reload();
  }

  const viewProps: ViewProps = {
    tasks,
    canEdit,
    onToggle: (t) => patch(t, { status: t.status === "done" ? "todo" : "done" }),
    onMove: (t, status) => patch(t, { status }),
    onEdit: (t) => setEditing(t),
    onDelete: (t) => remove(t),
  };

  if (loading) return <p className="py-8 text-center text-sm text-ink-faint">กำลังโหลดงาน…</p>;

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.9rem] text-red-300">
          {error}
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

      {/* ---------- เพิ่มงาน ---------- */}
      {/* React 19 เคลียร์ฟอร์มให้เองหลัง action ทำงานเสร็จ
          ถ้าไปสั่ง reset() เองใน onSubmit เสี่ยงล้างค่าก่อนที่ action จะอ่าน FormData */}
      {canEdit && (
        <form action={add} className="mb-4 flex flex-wrap gap-2">
          <input name="title" placeholder="เพิ่มงานใหม่…" className={`${field} min-w-[12rem] flex-1`} />
          <input name="due_on" type="date" className={field} aria-label="กำหนดส่ง" />
          <button
            type="submit"
            className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            เพิ่ม
          </button>
        </form>
      )}

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint">
          ยังไม่มีงานในโปรเจกต์นี้
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
                status: String(f.get("status")) as TaskStatus,
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

              <select name="status" defaultValue={editing.status} className={field} aria-label="สถานะ">
                {(["todo", "doing", "done"] as TaskStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {TASK_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>

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
                  remove(editing);
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
