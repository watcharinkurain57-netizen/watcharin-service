"use client";

import { useRef, useState } from "react";
import {
  MAX_NOTE_CHARS,
  bulletLines,
  fenceBlock,
  wrapInline,
  type NoteEdit,
} from "@/lib/task-notes";
import { TaskNote } from "./TaskNote";

/**
 * ช่องเขียนรายละเอียดงาน — ช่องข้อความธรรมดา + แป้นเครื่องมือ + แท็บดูตัวอย่าง
 *
 * ตั้งใจให้ยังเป็น <textarea> จริง ๆ ไม่ใช่ contentEditable ที่ทำให้เหมือนกระดาษ
 * เพราะของที่พิมพ์ลงไปส่วนใหญ่คือโค้ด และช่องข้อความธรรมดาคือที่เดียว
 * ที่การกด Home/End, ลากเลือกเป็นบล็อก, และวางโค้ดยาว ๆ ทำงานถูกทุกเบราว์เซอร์
 * แป้นเครื่องมือแค่แทรกเครื่องหมายให้ ไม่ได้เข้าไปยึดการพิมพ์
 */

/** ภาษาที่เลือกบ่อยในงานนี้ — st คือ Structured Text ของ PLC */
const LANGS = ["", "sql", "ts", "js", "python", "bash", "json", "yaml", "xml", "csharp", "st"];

const toolBtn =
  "rounded-lg border border-line px-2.5 py-1 text-[0.76rem] font-semibold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300";

export function TaskNoteEditor({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [lang, setLang] = useState("");

  /**
   * ลงมือแก้ตามที่ตัวช่วยคำนวณมา
   *
   * ใช้ execCommand ก่อนเสมอ ทั้งที่มันถูกประกาศเลิกใช้แล้ว เพราะเป็นทางเดียว
   * ที่การแทรกข้อความยัง **ย้อนด้วย Ctrl+Z ได้** การ set value ตรง ๆ
   * ล้างประวัติของช่องข้อความทิ้งทั้งกอง คนที่กดปุ่มโค้ดผิดจะกู้ของเดิมไม่ได้เลย
   * ถ้าเบราว์เซอร์ไหนไม่รองรับแล้วค่อยตกไปทางที่สอง (เสียประวัติ แต่ยังทำงานได้)
   */
  function apply(edit: NoteEdit) {
    const el = ref.current;
    if (!el) return;

    el.focus();
    el.setSelectionRange(edit.from, edit.to);

    let ok = false;
    try {
      ok = document.execCommand("insertText", false, edit.insert);
    } catch {
      ok = false;
    }
    if (!ok) onChange(value.slice(0, edit.from) + edit.insert + value.slice(edit.to));

    // รอให้ค่าใหม่ลงไปใน DOM ก่อน ไม่งั้นตำแหน่งที่สั่งจะถูกเขียนทับตอน re-render
    requestAnimationFrame(() => el.setSelectionRange(edit.selStart, edit.selEnd));
  }

  function run(fn: (v: string, s: number, e: number) => NoteEdit) {
    const el = ref.current;
    if (!el) return;
    apply(fn(el.value, el.selectionStart, el.selectionEnd));
  }

  const over = value.length > MAX_NOTE_CHARS;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex rounded-lg border border-line p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-2.5 py-1 text-[0.76rem] font-semibold transition-colors ${
                tab === t ? "bg-surface-overlay text-ink" : "text-ink-faint hover:text-ink-muted"
              }`}
            >
              {t === "write" ? "เขียน" : "ดูตัวอย่าง"}
            </button>
          ))}
        </div>

        {tab === "write" && (
          <>
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            <button type="button" onClick={() => run((v, s, e) => wrapInline(v, s, e, "**"))} className={toolBtn}>
              ตัวหนา
            </button>
            <button type="button" onClick={() => run((v, s, e) => wrapInline(v, s, e, "`"))} className={toolBtn}>
              โค้ดในบรรทัด
            </button>
            <button type="button" onClick={() => run((v, s, e) => bulletLines(v, s, e))} className={toolBtn}>
              รายการ
            </button>

            {/* ปุ่มบล็อกโค้ดกับช่องเลือกภาษาติดกันเป็นชิ้นเดียว
                เพราะเลือกภาษาไว้เฉย ๆ โดยไม่กดปุ่มไม่ได้ทำอะไรเลย */}
            <span className="flex overflow-hidden rounded-lg border border-line">
              <button
                type="button"
                onClick={() => run((v, s, e) => fenceBlock(v, s, e, lang))}
                className="px-2.5 py-1 text-[0.76rem] font-semibold text-brand-300 transition-colors hover:bg-surface-overlay"
              >
                + บล็อกโค้ด
              </button>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                aria-label="ภาษาของบล็อกโค้ด"
                className="border-l border-line bg-transparent py-1 pl-1.5 pr-0.5 text-[0.72rem] text-ink-faint outline-none"
              >
                {LANGS.map((l) => (
                  <option key={l} value={l}>
                    {l === "" ? "ไม่ระบุภาษา" : l}
                  </option>
                ))}
              </select>
            </span>
          </>
        )}
      </div>

      {tab === "write" ? (
        <textarea
          id={id}
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={"อธิบายงานนี้ · เลือกข้อความแล้วกดปุ่มด้านบนเพื่อทำเป็นโค้ด\n\nเช่น\nดึงค่าจาก OPC UA แล้วเก็บลง `plant_tags`\n```sql\nselect tag, value from plant_tags order by ts desc limit 20;\n```"}
          className="min-h-40 w-full resize-y rounded-xl border border-line bg-surface-overlay px-3 py-2.5 font-mono text-[0.84rem] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500"
        />
      ) : (
        <div className="min-h-40 rounded-xl border border-line bg-surface-overlay px-3 py-2.5">
          {value.trim() ? (
            <TaskNote text={value} />
          ) : (
            <p className="text-[0.85rem] text-ink-faint">ยังไม่ได้เขียนอะไร</p>
          )}
        </div>
      )}

      <p className={`text-right text-[0.72rem] ${over ? "font-bold text-red-400" : "text-ink-faint"}`}>
        {over
          ? `ยาวเกิน ${MAX_NOTE_CHARS.toLocaleString("th-TH")} ตัวอักษร — ของยาวขนาดนี้เก็บเป็นไฟล์แนบดีกว่า`
          : `${value.length.toLocaleString("th-TH")} / ${MAX_NOTE_CHARS.toLocaleString("th-TH")}`}
      </p>
    </div>
  );
}
