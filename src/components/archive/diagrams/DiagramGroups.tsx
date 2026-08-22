"use client";

import { COLUMN_COLORS, colorOf, type ColumnColor } from "@/lib/project-tasks";
import type { DiagramGroup } from "@/lib/project-diagrams";
import { Modal } from "../Modal";

/**
 * แผงจัดการหมวดของผัง — เพิ่ม เปลี่ยนชื่อ เปลี่ยนสี สลับลำดับ ลบ
 *
 * แยกออกมาจาก DiagramsTab เพราะเป็นของที่เปิดใช้นาน ๆ ครั้ง
 * และปนอยู่ในไฟล์เดียวกันแล้วตัวแท็บอ่านยากขึ้นโดยไม่ได้อะไรกลับมา
 *
 * รูปแบบเดียวกับแผงจัดการคอลัมน์และหมวดงานในแท็บงาน ตั้งใจให้เหมือนกัน
 * คนที่เคยจัดหมวดงานเป็นแล้วต้องไม่ต้องเรียนรู้ใหม่
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

export function DiagramGroups({
  groups,
  countOf,
  onAdd,
  onPatch,
  onMove,
  onRemove,
  onClose,
}: {
  groups: DiagramGroup[];
  /** จำนวนผังในหมวดนั้น — ใช้เตือนตอนกดลบ */
  countOf: (groupId: string) => number;
  onAdd: (name: string, color: ColumnColor) => void;
  onPatch: (g: DiagramGroup, changes: Partial<DiagramGroup>) => void;
  onMove: (g: DiagramGroup, dir: -1 | 1) => void;
  onRemove: (g: DiagramGroup) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="จัดการหมวดของผัง" onClose={onClose}>
      <ul className="mb-3 grid gap-1.5">
        {groups.map((g, i) => (
          <li key={g.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2">
            <span className={`size-2.5 flex-none rounded-full ${colorOf(g.color).dot}`} aria-hidden="true" />

            <input
              defaultValue={g.name}
              aria-label={`ชื่อหมวด ${g.name}`}
              // เปลี่ยนชื่อตอนออกจากช่อง ไม่ใช่ทุกตัวอักษร — ยิงอัปเดตทุกคีย์
              // ทำให้ชื่อครึ่ง ๆ กลาง ๆ ลงฐานข้อมูลและชนกับ unique ระหว่างพิมพ์
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== g.name) onPatch(g, { name });
                else e.target.value = g.name;
              }}
              className={`${field} min-w-0 flex-1`}
            />

            <select
              value={g.color}
              aria-label={`สีของหมวด ${g.name}`}
              onChange={(e) => onPatch(g, { color: e.target.value as ColumnColor })}
              className={`${field} flex-none`}
            >
              {COLUMN_COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>

            <span className="flex flex-none items-center gap-0.5">
              <button
                type="button"
                onClick={() => onMove(g, -1)}
                disabled={i === 0}
                aria-label={`ย้าย ${g.name} ขึ้น`}
                className="rounded px-1.5 py-1 text-[0.85rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => onMove(g, 1)}
                disabled={i === groups.length - 1}
                aria-label={`ย้าย ${g.name} ลง`}
                className="rounded px-1.5 py-1 text-[0.85rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onRemove(g)}
                className="rounded px-1.5 py-1 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-red-400"
              >
                ลบ
              </button>
            </span>

            <span className="w-full text-[0.74rem] text-ink-faint sm:w-auto">
              {countOf(g.id)} ผัง
            </span>
          </li>
        ))}

        {groups.length === 0 && (
          <li className="text-[0.85rem] text-ink-faint">
            ยังไม่มีหมวด — ผังทั้งหมดจะอยู่รวมกันใต้ “ไม่มีหมวด”
          </li>
        )}
      </ul>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const name = String(f.get("name") ?? "").trim();
          if (!name) return;
          onAdd(name, String(f.get("color") ?? "sky") as ColumnColor);
          e.currentTarget.reset();
        }}
      >
        <input name="name" placeholder="หมวดใหม่ เช่น ฝั่งหน้างาน" className={`${field} min-w-0 flex-1`} aria-label="ชื่อหมวดใหม่" />
        <select name="color" defaultValue="sky" className={field} aria-label="สีของหมวดใหม่">
          {COLUMN_COLORS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950">
          เพิ่ม
        </button>
      </form>
    </Modal>
  );
}
