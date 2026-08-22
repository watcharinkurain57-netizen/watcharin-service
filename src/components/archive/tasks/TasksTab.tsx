"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  COLUMN_COLORS,
  COLUMN_SELECT,
  GROUP_SELECT,
  PROFILE_SELECT,
  TASK_FILE_SELECT,
  TASK_SELECT,
  colorOf,
  isDone,
  personName,
  todayIso,
  type ColumnColor,
  type Person,
  type Task,
  type TaskColumn,
  type TaskFile,
  type TaskGroup,
} from "@/lib/project-tasks";
import { FILES_BUCKET, SIGNED_URL_SECONDS, fileErrorMessage, formatBytes } from "@/lib/project-files";
import { Modal } from "../Modal";
import { TaskDialog } from "./TaskDialog";
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
  const [groups, setGroups] = useState<TaskGroup[]>([]);
  /** ไฟล์แนบของทั้งโปรเจกต์ — โหลดทีเดียวแล้วแจกให้แต่ละงานเอง
      เพราะทุกมุมมองต้องรู้ว่างานไหนมีไฟล์กี่ไฟล์ ไม่ใช่แค่งานที่เปิดกล่องอยู่ */
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  /** "all" | "none" | group_id */
  const [whichGroup, setWhichGroup] = useState("all");
  /**
   * มุมมองรายการจัดกลุ่มตามอะไร — null = ยังไม่ได้เลือกเอง ให้ระบบเดาให้
   * เดาว่า: มีหมวดแล้วก็จัดตามหมวด (เพราะตั้งหมวดไว้ก็ตั้งใจจะใช้)
   * ยังไม่มีหมวดก็จัดตามคอลัมน์เหมือนเดิม จะได้ไม่เห็นหน้าเปลี่ยนไปเฉย ๆ
   */
  const [listGroupBy, setListGroupBy] = useState<"column" | "group" | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchAll = useCallback(async () => {
    const [t, c, g, m, f] = await Promise.all([
      supabase.from("project_tasks").select(TASK_SELECT).eq("project_id", projectId).order("sort"),
      supabase.from("project_task_columns").select(COLUMN_SELECT).eq("project_id", projectId).order("sort"),
      supabase.from("project_task_groups").select(GROUP_SELECT).eq("project_id", projectId).order("sort"),
      // ดึงโปรไฟล์ผ่านความสัมพันธ์ของ project_members จะได้เฉพาะคนในโปรเจกต์นี้
      supabase.from("project_members").select(`profiles!inner(${PROFILE_SELECT})`).eq("project_id", projectId),
      supabase.from("project_task_files").select(TASK_FILE_SELECT).eq("project_id", projectId).order("created_at"),
    ]);
    return {
      tasks: (t.data ?? []) as Task[],
      columns: (c.data ?? []) as TaskColumn[],
      groups: (g.data ?? []) as TaskGroup[],
      people: ((m.data ?? []) as unknown as { profiles: Person }[]).map((r) => r.profiles),
      taskFiles: (f.data ?? []) as TaskFile[],
      // แยก error ของรายชื่อคนออกจากงาน เพราะระดับความร้ายแรงต่างกัน
      // งานโหลดไม่ได้ = แท็บใช้ไม่ได้เลย · รายชื่อโหลดไม่ได้ = แค่ไม่มีรูปกับชื่อ
      error: t.error ?? c.error ?? g.error,
      peopleError: m.error,
      // ไฟล์แนบโหลดไม่ได้ = แค่ไม่เห็นคลิปหนีบ งานยังใช้ได้ครบ จึงไม่ปนกับ error ก้อนบน
      filesError: f.error,
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
      else if (r.filesError)
        setError("โหลดรายการไฟล์แนบไม่ได้ — งานจะขึ้นว่าไม่มีไฟล์แนบทั้งที่อาจมีอยู่ ลองรีเฟรชอีกครั้ง");
      setTasks(r.tasks);
      setColumns(r.columns);
      setGroups(r.groups);
      setPeople(r.people);
      setTaskFiles(r.taskFiles);
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
    setGroups(r.groups);
    setPeople(r.people);
    setTaskFiles(r.taskFiles);
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

  /**
   * ลบงาน — ถ้ามีไฟล์แนบต้องเก็บกวาด Storage เองก่อนเสมอ
   *
   * ⚠️ FK ของ task_id เป็น `on delete set null` ไม่ใช่ cascade โดยตั้งใจ (0019)
   * Postgres ไม่รู้จัก Storage ถ้าปล่อยให้ DB จัดการ ไฟล์จริงจะค้างกินโควตา
   * ตลอดกาลโดยไม่มีใครมองเห็น ลำดับที่ถูกคือ Storage → แถวไฟล์ → งาน
   * (แถบ "ไฟล์แนบที่งานถูกลบไปแล้ว" ข้างล่างคือตาข่ายเผื่อมีทางลบที่ไม่ผ่านฟังก์ชันนี้)
   */
  /** @returns ลบไปจริงไหม — ฝั่งที่เรียกใช้ตัดสินใจต่อว่าจะปิดกล่องดีไหม */
  async function removeTask(t: Task): Promise<boolean> {
    const attached = taskFiles.filter((f) => f.task_id === t.id);

    if (attached.length > 0) {
      const size = formatBytes(attached.reduce((sum, f) => sum + (f.size_bytes ?? 0), 0));
      if (!confirm(`ลบงาน “${t.title}”?
ไฟล์แนบ ${attached.length} ไฟล์ (${size}) จะถูกลบถาวรไปด้วย`)) return false;

      const { error: se } = await supabase.storage
        .from(FILES_BUCKET)
        .remove(attached.map((f) => f.storage_path));
      if (se) {
        setError(fileErrorMessage(se, "ลบไฟล์แนบออกจากที่เก็บไม่สำเร็จ — ยังไม่ได้ลบงาน"));
        return false;
      }

      const { error: fe } = await supabase.from("project_task_files").delete().eq("task_id", t.id);
      if (fe) {
        setError(fileErrorMessage(fe, "ลบรายการไฟล์แนบไม่สำเร็จ — ยังไม่ได้ลบงาน"));
        reload();
        return false;
      }
    }

    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    const { error: e } = await supabase.from("project_tasks").delete().eq("id", t.id);
    if (e) setError(friendly(e.code, e.message, "ลบงาน"));
    reload();
    return !e;
  }

  async function addTask(form: FormData) {
    const title = String(form.get("title") ?? "").trim();
    if (!title || columns.length === 0) return;
    const due = String(form.get("due_on") ?? "").trim();

    // ถ้ากำลังกรองหมวดใดหมวดหนึ่งอยู่ ให้งานใหม่ลงหมวดนั้นเลย
    // คนที่กรองหมวด "ออกแบบ" แล้วพิมพ์งานเพิ่ม ย่อมตั้งใจให้อยู่หมวดนั้น
    const groupFromForm = String(form.get("group_id") ?? "");
    const group_id =
      groupFromForm || (whichGroup !== "all" && whichGroup !== "none" ? whichGroup : null);

    const { error: e } = await supabase.from("project_tasks").insert({
      project_id: projectId,
      column_id: columns[0].id,
      group_id: group_id || null,
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

  /* ---------- ไฟล์แนบที่งานหายไปแล้ว ---------- */

  async function downloadOrphan(f: TaskFile) {
    const { data, error: e } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(f.storage_path, SIGNED_URL_SECONDS, { download: f.name });

    if (e || !data?.signedUrl) {
      setError(fileErrorMessage(e, "ขอลิงก์ดาวน์โหลดไม่สำเร็จ"));
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    a.click();
  }

  async function removeOrphan(f: TaskFile) {
    if (!confirm(`ลบไฟล์ "${f.name}" ถาวร?`)) return;

    const { error: se } = await supabase.storage.from(FILES_BUCKET).remove([f.storage_path]);
    if (se) {
      setError(fileErrorMessage(se, "ลบไฟล์ออกจากที่เก็บไม่สำเร็จ"));
      return;
    }
    const { error: e } = await supabase.from("project_task_files").delete().eq("id", f.id);
    if (e) setError(fileErrorMessage(e, "ลบรายการไฟล์ไม่สำเร็จ"));
    reload();
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

  /* ---------- หมวด ---------- */

  async function addGroup(form: FormData) {
    const name = String(form.get("name") ?? "").trim();
    if (!name) return;

    const { error: e } = await supabase.from("project_task_groups").insert({
      project_id: projectId,
      name,
      color: String(form.get("color") ?? "sky") as ColumnColor,
      sort: Math.max(0, ...groups.map((g) => g.sort)) + 1,
    });

    if (e) setError(friendly(e.code, e.message, "เพิ่มหมวด"));
    reload();
  }

  async function patchGroup(g: TaskGroup, changes: Partial<TaskGroup>) {
    setGroups((prev) => prev.map((x) => (x.id === g.id ? { ...x, ...changes } : x)));
    const { error: e } = await supabase.from("project_task_groups").update(changes).eq("id", g.id);
    if (e) {
      setError(friendly(e.code, e.message, "แก้หมวด"));
      reload();
    }
  }

  /**
   * ลบหมวดได้เลยแม้มีงานอยู่ ต่างจากคอลัมน์ที่ต้องย้ายงานออกก่อน
   * เพราะ group_id เป็น null ได้ งานจะกลับไปเป็น "ยังไม่จัดหมวด" ไม่มีอะไรหาย
   * (คอลัมน์ทำแบบนี้ไม่ได้เพราะ column_id เป็น not null งานจะหลุดออกจากบอร์ด)
   */
  async function removeGroup(g: TaskGroup) {
    const inside = tasks.filter((t) => t.group_id === g.id).length;
    if (inside > 0 && !confirm(`ลบหมวด “${g.name}”?\nงาน ${inside} งานข้างในจะกลับไปเป็นยังไม่จัดหมวด ไม่ถูกลบ`)) return;

    const { error: e } = await supabase.from("project_task_groups").delete().eq("id", g.id);
    if (e) setError(friendly(e.code, e.message, "ลบหมวด"));
    // ถ้ากำลังกรองหมวดที่เพิ่งลบอยู่ ต้องคืนเป็นทั้งหมด ไม่งั้นเจอหน้าว่าง
    if (whichGroup === g.id) setWhichGroup("all");
    reload();
  }

  async function moveGroup(g: TaskGroup, dir: -1 | 1) {
    const i = groups.findIndex((x) => x.id === g.id);
    const j = i + dir;
    if (j < 0 || j >= groups.length) return;
    const other = groups[j];
    await Promise.all([patchGroup(g, { sort: other.sort }), patchGroup(other, { sort: g.sort })]);
    reload();
  }

  /** กรองก่อนส่งเข้ามุมมอง ทุกมุมมองจึงเห็นชุดเดียวกันเสมอ ไม่ต้องรู้เรื่องตัวกรอง */
  const shown = tasks
    .filter((t) => (who === "all" ? true : who === "none" ? !t.assignee_id : t.assignee_id === who))
    .filter((t) =>
      whichGroup === "all" ? true : whichGroup === "none" ? !t.group_id : t.group_id === whichGroup
    );

  // ยังไม่ได้เลือกเอง = เดาจากว่าโปรเจกต์นี้ตั้งหมวดไว้หรือยัง
  const groupBy = listGroupBy ?? (groups.length > 0 ? "group" : "column");

  /** จำนวนไฟล์แนบต่องาน — ทุกมุมมองใช้ตัวเดียวกัน คิดครั้งเดียวพอ */
  const fileCounts = taskFiles.reduce<Record<string, number>>((acc, f) => {
    if (f.task_id) acc[f.task_id] = (acc[f.task_id] ?? 0) + 1;
    return acc;
  }, {});

  /** ไฟล์ที่งานเจ้าของเดิมหายไปแล้ว — ตาข่ายของ `on delete set null` ใน 0019 */
  const orphanFiles = taskFiles.filter((f) => !f.task_id);

  const viewProps: ViewProps = {
    tasks: shown,
    columns,
    groups,
    people,
    canEdit,
    fileCounts,
    onToggle: toggle,
    onMove: (t, columnId) => patch(t, { column_id: columnId }),
    // เปิดกล่องได้ทุกคน ไม่ใช่เฉพาะคนที่แก้ได้ — คนที่แก้ไม่ได้จะได้หน้าอ่านอย่างเดียว
    // รายละเอียดกับไฟล์แนบเขียนไว้ให้คนอื่นอ่าน ปิดไว้ก็ไม่มีประโยชน์
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

        {/* กรองตามหมวด — โผล่เมื่อมีหมวดแล้วเท่านั้น ไม่งั้นเป็นช่องที่เลือกอะไรไม่ได้ */}
        {groups.length > 0 && (
          <select
            value={whichGroup}
            onChange={(e) => setWhichGroup(e.target.value)}
            aria-label="กรองตามหมวด"
            className="rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.85rem] font-semibold text-ink-muted"
          >
            <option value="all">ทุกหมวด ({tasks.length})</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({tasks.filter((t) => t.group_id === g.id).length})
              </option>
            ))}
            <option value="none">ยังไม่จัดหมวด ({tasks.filter((t) => !t.group_id).length})</option>
          </select>
        )}

        {/* สลับว่ามุมมองรายการจะจัดกลุ่มตามอะไร — มีความหมายเฉพาะมุมมองรายการ */}
        {view === "list" && groups.length > 0 && (
          <label className="flex items-center gap-1.5 text-[0.85rem] text-ink-faint">
            จัดกลุ่มตาม
            <select
              value={groupBy}
              onChange={(e) => setListGroupBy(e.target.value as "column" | "group")}
              className="rounded-xl border border-line bg-surface-overlay px-2.5 py-2 text-[0.85rem] font-semibold text-ink-muted"
            >
              <option value="group">หมวด</option>
              <option value="column">คอลัมน์</option>
            </select>
          </label>
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
            จัดการคอลัมน์และหมวด
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

      {/* กล่องจัดการคอลัมน์และหมวด — ชั้นซ้อนหน้า ไม่ใช่แผงที่ดันเนื้อหาข้างล่างลงไป
          คนที่กำลังดูงานอยู่จะได้ไม่เสียตำแหน่งที่มองอยู่ตอนเปิดแผง */}
      {managing && canEdit && (
        <Modal title="จัดการคอลัมน์และหมวด" onClose={() => setManaging(false)} wide>
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

          {/* ---------- หมวดของงาน ---------- */}
          <h3 className="mb-1 mt-6 border-t border-line pt-5 text-[0.95rem] font-bold">หมวดของงาน</h3>
          <p className="mb-3 max-w-[60ch] text-[0.8rem] text-ink-faint">
            คนละแกนกับคอลัมน์ — คอลัมน์บอกว่างาน<b className="text-ink-muted">อยู่ขั้นไหน</b>{" "}
            หมวดบอกว่างาน<b className="text-ink-muted">เป็นเรื่องอะไร</b> เช่น การทำงานร่วมกัน / ออกแบบ / ติดตั้ง
            งานหนึ่งมีได้ทั้งสองอย่างพร้อมกัน
          </p>

          {groups.length > 0 && (
            <ul className="mb-4 grid gap-2">
              {groups.map((g, i) => (
                <li key={g.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2">
                  <span className={`size-2.5 flex-none rounded-full ${colorOf(g.color).dot}`} />

                  <input
                    defaultValue={g.name}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== g.name) patchGroup(g, { name: v });
                    }}
                    aria-label={`ชื่อหมวด ${g.name}`}
                    className="min-w-[7rem] flex-1 rounded-lg bg-transparent px-1 py-1 text-[0.9rem] font-semibold text-ink outline-none focus:bg-surface-raised"
                  />

                  <select
                    value={g.color}
                    onChange={(e) => patchGroup(g, { color: e.target.value as ColumnColor })}
                    aria-label={`สีของ ${g.name}`}
                    className="rounded-lg border border-line bg-surface-raised px-2 py-1 text-[0.8rem] text-ink-muted"
                  >
                    {COLUMN_COLORS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.label}
                      </option>
                    ))}
                  </select>

                  <span className="text-[0.78rem] text-ink-faint">
                    {tasks.filter((t) => t.group_id === g.id).length} งาน
                  </span>

                  <span className="ml-auto flex flex-none gap-1">
                    <button
                      type="button"
                      onClick={() => moveGroup(g, -1)}
                      disabled={i === 0}
                      aria-label={`ย้าย ${g.name} ขึ้น`}
                      className="rounded px-1.5 py-0.5 text-ink-faint hover:text-ink disabled:opacity-30"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => moveGroup(g, 1)}
                      disabled={i === groups.length - 1}
                      aria-label={`ย้าย ${g.name} ลง`}
                      className="rounded px-1.5 py-0.5 text-ink-faint hover:text-ink disabled:opacity-30"
                    >
                      ›
                    </button>
                    <button
                      type="button"
                      onClick={() => removeGroup(g)}
                      className="rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint hover:text-red-400"
                    >
                      ลบ
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <form action={addGroup} className="flex flex-wrap gap-2">
            <input
              name="name"
              placeholder="ชื่อหมวดใหม่ เช่น การทำงานร่วมกัน, ออกแบบ"
              className={`${field} min-w-[10rem] flex-1`}
            />
            <select name="color" defaultValue="violet" className={field} aria-label="สีหมวด">
              {COLUMN_COLORS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950">
              เพิ่มหมวด
            </button>
          </form>

          <p className="mt-3 text-[0.8rem] text-ink-faint">
            ลบหมวดได้เลยแม้มีงานอยู่ — งานข้างในจะกลับไปเป็น “ยังไม่จัดหมวด” ไม่ถูกลบ
          </p>
        </Modal>
      )}

      {/* ---------- เพิ่มงาน ---------- */}
      {/* React 19 เคลียร์ฟอร์มให้เองหลัง action ทำงานเสร็จ */}
      {canEdit && columns.length > 0 && (
        <form action={addTask} className="mb-4 flex flex-wrap gap-2">
          <input name="title" placeholder={`เพิ่มงานใหม่ลง “${columns[0].name}”…`} className={`${field} min-w-[12rem] flex-1`} />
          {groups.length > 0 && (
            <select
              name="group_id"
              defaultValue={whichGroup !== "all" && whichGroup !== "none" ? whichGroup : ""}
              className={field}
              aria-label="หมวด"
            >
              <option value="">— ไม่ระบุหมวด —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
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
        <ListView {...viewProps} groupBy={groupBy} />
      ) : view === "board" ? (
        <BoardView {...viewProps} />
      ) : view === "table" ? (
        <TableView {...viewProps} />
      ) : view === "calendar" ? (
        <CalendarView {...viewProps} month={month} />
      ) : (
        <TimelineView {...viewProps} />
      )}

      {/* ---------- กล่องรายละเอียดงาน ---------- */}
      {editing && (
        // key = ให้ React สร้างใหม่ทั้งกล่องตอนสลับไปงานอื่น
        // ไม่งั้นข้อความในช่องรายละเอียดของงานเดิมจะค้างมาให้งานใหม่ (state ไม่ถูกล้าง)
        <TaskDialog
          key={editing.id}
          task={editing}
          columns={columns}
          groups={groups}
          people={people}
          me={me}
          canEdit={canEdit}
          projectId={projectId}
          files={taskFiles.filter((f) => f.task_id === editing.id)}
          onSave={(changes) => patch(editing, changes)}
          // ปิดกล่องเฉพาะตอนลบไปจริง — กด "ลบงานนี้" แล้วกดยกเลิกในกล่องยืนยัน
          // ต้องได้กลับมาที่หน้าเดิม ไม่ใช่กล่องปิดไปเฉย ๆ ทั้งที่งานยังอยู่
          onDelete={async () => {
            if (await removeTask(editing)) setEditing(null);
          }}
          onClose={() => setEditing(null)}
          onFilesChanged={reload}
        />
      )}

      {/* ---------- ตาข่ายกันพลาด: ไฟล์แนบที่งานหายไปแล้ว ----------
          ปกติต้องไม่มีอะไรตรงนี้เลย เพราะ removeTask เก็บกวาดให้ครบก่อนลบ
          จะโผล่ก็ต่อเมื่อมีคนลบงานโดยไม่ผ่านหน้าเว็บ (เช่นจาก SQL editor)
          แล้ว `on delete set null` ของ 0019 เด้งไฟล์ออกมาแทนที่จะปล่อยหายเงียบ
          ให้เจ้าของโหลดเก็บหรือลบทิ้งได้ ไม่ใช่ทิ้งขยะไว้ใน Storage ตลอดกาล */}
      {canEdit && orphanFiles.length > 0 && (
        <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <p className="text-[0.85rem] font-bold text-amber-200">
            ไฟล์แนบที่งานถูกลบไปแล้ว {orphanFiles.length} ไฟล์
          </p>
          <p className="mt-1 text-[0.78rem] text-ink-faint">
            ไฟล์พวกนี้ยังกินพื้นที่อยู่ — โหลดเก็บไว้หรือลบทิ้งได้เลย
          </p>
          <ul className="mt-3 grid gap-1">
            {orphanFiles.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-overlay px-3 py-2 text-[0.84rem]">
                <span className="min-w-0 flex-1 truncate text-ink-muted">{f.name}</span>
                <span className="flex-none text-[0.74rem] text-ink-faint">{formatBytes(f.size_bytes)}</span>
                <button
                  type="button"
                  onClick={() => downloadOrphan(f)}
                  className="flex-none rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-brand-400"
                >
                  ดาวน์โหลด
                </button>
                <button
                  type="button"
                  onClick={() => removeOrphan(f)}
                  className="flex-none rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-red-400"
                >
                  ลบ
                </button>
              </li>
            ))}
          </ul>
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
