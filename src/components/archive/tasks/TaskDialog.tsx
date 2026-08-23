"use client";

import { useEffect, useRef, useState } from "react";
import {
  colorOf,
  dueText,
  personName,
  type Person,
  type Task,
  type TaskColumn,
  type TaskFile,
  type TaskGroup,
} from "@/lib/project-tasks";
import { MAX_NOTE_CHARS } from "@/lib/task-notes";
import { TaskAttachments } from "./TaskAttachments";
import { TaskNote } from "./TaskNote";
import { TaskNoteEditor } from "./TaskNoteEditor";

/**
 * กล่องรายละเอียดงาน — เป็นทั้งหน้าแก้ไขและหน้าอ่านอย่างเดียว
 *
 * ที่ต้องเปิดให้ลูกค้าอ่านด้วย เพราะรายละเอียดกับไฟล์แนบคือของที่เขียนไว้ "ให้คนอื่นอ่าน"
 * ถ้าเปิดได้เฉพาะเจ้าของ ก็เท่ากับเขียนใส่สมุดตัวเองแล้วเรียกว่าการสื่อสาร
 * สิทธิ์จริงกันที่ policy (0002 งาน · 0019 ไฟล์แนบ) ไม่ใช่ที่ปุ่มในนี้
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

const labelCls = "grid gap-1 text-[0.8rem] text-ink-muted";

export function TaskDialog({
  task,
  columns,
  groups,
  people,
  me,
  canEdit,
  projectId,
  files,
  onSave,
  onDelete,
  onClose,
  onFilesChanged,
}: {
  task: Task;
  columns: TaskColumn[];
  groups: TaskGroup[];
  people: Person[];
  me: string | null;
  canEdit: boolean;
  projectId: string;
  files: TaskFile[];
  onSave: (changes: Partial<Task>) => Promise<void> | void;
  onDelete: () => void;
  onClose: () => void;
  onFilesChanged: () => Promise<void> | void;
}) {
  const [note, setNote] = useState(task.description ?? "");
  const [saving, setSaving] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);

  // ปิดด้วย Esc — ในกล่องนี้มีทั้งช่องพิมพ์ยาวและปุ่มเยอะ
  // การต้องเล็งกากบาทหรือคลิกพื้นหลังให้โดนเป็นเรื่องน่ารำคาญโดยไม่จำเป็น
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const column = columns.find((c) => c.id === task.column_id);
  const group = groups.find((g) => g.id === task.group_id);
  const assignee = people.find((p) => p.id === task.assignee_id);
  const noteTooLong = note.length > MAX_NOTE_CHARS;

  async function save(form: HTMLFormElement) {
    if (noteTooLong || saving) return;
    const f = new FormData(form);
    setSaving(true);
    await onSave({
      title: String(f.get("title") ?? "").trim() || task.title,
      column_id: String(f.get("column_id")),
      group_id: String(f.get("group_id") ?? "") || null,
      assignee_id: String(f.get("assignee_id") ?? "") || null,
      due_on: String(f.get("due_on") ?? "") || null,
      started_on: String(f.get("started_on") ?? "") || null,
      due_label: String(f.get("due_label") ?? "").trim() || null,
      description: note.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={canEdit ? `แก้ไขงาน ${task.title}` : `รายละเอียดงาน ${task.title}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* min-w-0 คู่กับกล่องโค้ดที่เลื่อนในตัวเอง — ถ้าไม่มี โค้ดบรรทัดยาวจะดันกล่องจนล้นจอ */}
      <div ref={shellRef} className="my-auto w-full min-w-0 max-w-2xl rounded-2xl border border-line bg-surface-raised p-5">
        {canEdit ? (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save(e.currentTarget);
            }}
          >
            <h3 className="text-base font-bold">แก้ไขงาน</h3>

            <div className="grid gap-3">
              <input name="title" defaultValue={task.title} className={field} aria-label="ชื่องาน" />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelCls}>
                  คอลัมน์
                  <select name="column_id" defaultValue={task.column_id} className={field}>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={labelCls}>
                  ผู้รับผิดชอบ
                  <select name="assignee_id" defaultValue={task.assignee_id ?? ""} className={field}>
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

              {groups.length > 0 && (
                <label className={labelCls}>
                  หมวด
                  <select name="group_id" defaultValue={task.group_id ?? ""} className={field}>
                    <option value="">— ยังไม่จัดหมวด —</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelCls}>
                  วันเริ่ม
                  <input name="started_on" type="date" defaultValue={task.started_on ?? ""} className={field} />
                </label>
                <label className={labelCls}>
                  กำหนดส่ง
                  <input name="due_on" type="date" defaultValue={task.due_on ?? ""} className={field} />
                </label>
              </div>

              <label className={labelCls}>
                หมายเหตุกำหนดส่ง
                <input
                  name="due_label"
                  defaultValue={task.due_label ?? ""}
                  placeholder="เช่น รอลูกค้าตอบ — ใช้ตอนยังไม่มีวันแน่นอน"
                  className={field}
                />
              </label>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="task-note" className="text-[0.8rem] text-ink-muted">
                รายละเอียด
              </label>
              <TaskNoteEditor id="task-note" value={note} onChange={setNote} />
            </div>

            <TaskAttachments
              projectId={projectId}
              taskId={task.id}
              canEdit
              files={files}
              onChanged={onFilesChanged}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={noteTooLong || saving}
                className="rounded-full bg-brand-500 px-5 py-2.5 text-[0.9rem] font-bold text-brand-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก…" : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-surface-overlay px-5 py-2.5 text-[0.9rem] font-bold text-ink"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="ml-auto rounded-full border border-red-500/40 px-4 py-2.5 text-[0.9rem] font-bold text-red-300 hover:bg-red-500/10"
              >
                ลบงานนี้
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-4">
            <h3 className="text-base font-bold text-ink">{task.title}</h3>

            <div className="flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-faint">
              {column && (
                <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${colorOf(column.color).chip}`}>
                  {column.name}
                </span>
              )}
              {group && (
                <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${colorOf(group.color).chip}`}>
                  {group.name}
                </span>
              )}
              {assignee && <span>ผู้รับผิดชอบ: {personName(assignee)}</span>}
              {dueText(task) && <span>กำหนดส่ง: {dueText(task)}</span>}
            </div>

            {task.description ? (
              <TaskNote text={task.description} />
            ) : (
              <p className="text-[0.85rem] text-ink-faint">ยังไม่มีรายละเอียดของงานนี้</p>
            )}

            <TaskAttachments
              projectId={projectId}
              taskId={task.id}
              canEdit={false}
              files={files}
              onChanged={onFilesChanged}
            />

            <div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-surface-overlay px-5 py-2.5 text-[0.9rem] font-bold text-ink"
              >
                ปิด
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
