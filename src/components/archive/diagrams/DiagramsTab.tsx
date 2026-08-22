"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DIAGRAM_SELECT,
  DIAGRAM_TEMPLATES,
  MAX_DIAGRAM_CHARS,
  type ProjectDiagram,
} from "@/lib/project-diagrams";
import { MermaidView, renderToSvg } from "./MermaidView";

/**
 * แท็บไดอะแกรม — ผังของโปรเจกต์ เก็บเป็นข้อความ วาดเป็นภาพให้อัตโนมัติ
 *
 * คนในโปรเจกต์เปิดดูได้ทุกผัง · เจ้าของเพิ่ม/แก้/ลบได้
 * ตัวที่กันจริงคือ policy ใน 0020 ปุ่มในนี้แค่ไม่เอาของที่กดไม่ได้มาให้เกะกะ
 *
 * โหมดแก้ไขวางช่องเขียนกับภาพไว้ข้างกัน แล้วอัปเดตภาพระหว่างพิมพ์
 * เพราะ mermaid เป็นภาษาที่คนส่วนใหญ่ไม่เคยเขียน การเห็นผลทันทีคือ
 * สิ่งเดียวที่ทำให้เดาไวยากรณ์ถูกโดยไม่ต้องเปิดคู่มือ
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

function friendly(code: string | undefined, fallback: string, action: string) {
  if (code === "42501") return `${action}ได้เฉพาะเจ้าของโปรเจกต์`;
  if (code === "23514") return `ผังยาวเกิน ${MAX_DIAGRAM_CHARS.toLocaleString("th-TH")} ตัวอักษร`;
  return fallback;
}

export function DiagramsTab({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const [items, setItems] = useState<ProjectDiagram[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", source: "" });
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_diagrams")
      .select(DIAGRAM_SELECT)
      .eq("project_id", projectId)
      .order("sort");
    return { rows: (data ?? []) as ProjectDiagram[], error: e };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await load();
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setItems(r.rows);
      // เปิดผังแรกให้เลย — เข้ามาเจอรายการที่ต้องกดอีกทีก่อนจะเห็นอะไรนั้นเสียเวลาเปล่า
      setCurrentId((cur) => cur ?? r.rows[0]?.id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function reload(keepId?: string) {
    const r = await load();
    if (r.error) {
      setError(r.error.message);
      return;
    }
    setItems(r.rows);
    if (keepId) setCurrentId(keepId);
    else if (!r.rows.some((d) => d.id === currentId)) setCurrentId(r.rows[0]?.id ?? null);
  }

  const current = items?.find((d) => d.id === currentId) ?? null;

  /* ---------- เพิ่ม / แก้ / ลบ ---------- */

  async function add(template: (typeof DIAGRAM_TEMPLATES)[number]) {
    setPicking(false);
    const { data, error: e } = await supabase
      .from("project_diagrams")
      .insert({
        project_id: projectId,
        title: template.label,
        source: template.source,
        sort: Math.max(0, ...(items ?? []).map((d) => d.sort)) + 1,
      })
      .select(DIAGRAM_SELECT)
      .single();

    if (e || !data) {
      setError(friendly(e?.code, e?.message ?? "เพิ่มผังไม่สำเร็จ", "เพิ่มผัง"));
      return;
    }

    const row = data as ProjectDiagram;
    await reload(row.id);
    // เข้าโหมดแก้ทันที — คนที่เพิ่งกดเพิ่มย่อมตั้งใจจะแก้ชื่อกล่องต่อ
    setDraft({ title: row.title, source: row.source });
    setEditing(true);
  }

  async function save() {
    if (!current || saving) return;
    const title = draft.title.trim();
    if (!title) {
      setError("ตั้งชื่อผังก่อน");
      return;
    }

    setSaving(true);
    const { error: e } = await supabase
      .from("project_diagrams")
      .update({ title, source: draft.source })
      .eq("id", current.id);
    setSaving(false);

    if (e) {
      setError(friendly(e.code, e.message, "บันทึกผัง"));
      return;
    }
    setEditing(false);
    await reload(current.id);
  }

  async function remove() {
    if (!current) return;
    if (!confirm(`ลบผัง “${current.title}”?`)) return;

    const { error: e } = await supabase.from("project_diagrams").delete().eq("id", current.id);
    if (e) {
      setError(friendly(e.code, e.message, "ลบผัง"));
      return;
    }
    setEditing(false);
    setCurrentId(null);
    await reload();
  }

  /** บันทึกภาพลงเครื่อง — เอาไปแปะในข้อเสนอหรือเอกสารส่งมอบ */
  async function downloadSvg() {
    if (!current) return;
    try {
      const svg = await renderToSvg(current.source);
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${current.title.replace(/[\\/:*?"<>|]/g, "-")}.svg`;
      a.click();
      // ปล่อยคืนทีหลัง ถ้าเพิกถอนทันทีบางเบราว์เซอร์จะโหลดไม่ทัน
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError("ผังยังเขียนไม่ถูก เลยยังบันทึกเป็นภาพไม่ได้");
    }
  }

  /* ---------- หน้าตา ---------- */

  if (items === null) {
    return <p className="py-8 text-center text-sm text-ink-faint">กำลังโหลดผัง…</p>;
  }

  const tooLong = draft.source.length > MAX_DIAGRAM_CHARS;

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

      {/* ---------- แถบเลือกผัง ---------- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {items.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              setCurrentId(d.id);
              setEditing(false);
            }}
            aria-pressed={d.id === currentId}
            className={`rounded-xl px-3 py-1.5 text-[0.85rem] font-bold transition-colors ${
              d.id === currentId ? "bg-brand-500 text-brand-950" : "bg-surface-overlay text-ink-muted hover:text-ink"
            }`}
          >
            {d.title}
          </button>
        ))}

        {canEdit && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              className="rounded-xl border border-line px-3 py-1.5 text-[0.85rem] font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300"
            >
              + เพิ่มผัง
            </button>

            {/* เลือกแบบตั้งต้นแทนที่จะเปิดช่องเปล่า — คนส่วนใหญ่ไม่เคยเขียน mermaid
                ช่องเปล่าคือหน้าจอที่ไม่มีใครได้ใช้ */}
            {picking && (
              <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-line bg-surface-raised p-1.5 shadow-xl">
                {DIAGRAM_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => add(t)}
                    className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-overlay"
                  >
                    <span className="block text-[0.85rem] font-bold text-ink">{t.label}</span>
                    <span className="block text-[0.76rem] text-ink-faint">{t.hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!current ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint">
          {canEdit
            ? "ยังไม่มีผังในโปรเจกต์นี้ — กด “เพิ่มผัง” แล้วเลือกแบบตั้งต้นมาแก้ต่อได้เลย"
            : "ยังไม่มีผังในโปรเจกต์นี้"}
        </p>
      ) : editing ? (
        /* ---------- โหมดแก้ ---------- */
        <div className="grid gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            aria-label="ชื่อผัง"
            className={field}
          />

          {/* จอเล็กวางบนล่าง จอใหญ่วางข้างกัน — เห็นภาพเปลี่ยนตอนพิมพ์คือหัวใจของหน้านี้ */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="grid gap-1.5">
              <textarea
                value={draft.source}
                onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                rows={18}
                spellCheck={false}
                aria-label="ต้นฉบับผัง"
                className="min-h-80 w-full resize-y rounded-xl border border-line bg-surface-overlay px-3 py-2.5 font-mono text-[0.82rem] leading-relaxed text-ink outline-none transition-colors focus:border-brand-500"
              />
              <p className={`text-right text-[0.72rem] ${tooLong ? "font-bold text-red-400" : "text-ink-faint"}`}>
                {tooLong
                  ? `ยาวเกิน ${MAX_DIAGRAM_CHARS.toLocaleString("th-TH")} ตัวอักษร — ซอยเป็นหลายผังดีกว่า`
                  : `${draft.source.length.toLocaleString("th-TH")} / ${MAX_DIAGRAM_CHARS.toLocaleString("th-TH")}`}
              </p>
            </div>

            <MermaidView source={draft.source} />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              disabled={tooLong || saving}
              className="rounded-full bg-brand-500 px-5 py-2.5 text-[0.9rem] font-bold text-brand-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full bg-surface-overlay px-5 py-2.5 text-[0.9rem] font-bold text-ink"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={remove}
              className="ml-auto rounded-full border border-red-500/40 px-4 py-2.5 text-[0.9rem] font-bold text-red-300 hover:bg-red-500/10"
            >
              ลบผังนี้
            </button>
          </div>
        </div>
      ) : (
        /* ---------- โหมดดู ---------- */
        <div className="grid gap-3">
          <MermaidView source={current.source} />

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraft({ title: current.title, source: current.source });
                  setEditing(true);
                }}
                className="rounded-full bg-surface-overlay px-5 py-2.5 text-[0.9rem] font-bold text-ink"
              >
                แก้ผังนี้
              </button>
            )}
            <button
              type="button"
              onClick={downloadSvg}
              className="rounded-full border border-line px-4 py-2.5 text-[0.9rem] font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300"
            >
              บันทึกเป็นภาพ SVG
            </button>
            <span className="text-[0.78rem] text-ink-faint">
              แก้ล่าสุด {new Date(current.updated_at).toLocaleDateString("th-TH-u-ca-gregory", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
