"use client";

import { useState } from "react";
import { parseNote, type NoteSpan } from "@/lib/task-notes";

/**
 * แสดงรายละเอียดของงาน
 *
 * ⚠️ ทุกอย่างในไฟล์นี้ออกมาเป็น element ของ React ไม่มี dangerouslySetInnerHTML
 * ข้อความของผู้ใช้จึงเป็นได้แค่ตัวหนังสือเสมอ ต่อให้พิมพ์ tag อะไรลงไปก็ตาม
 * ถ้าวันหลังมีคนอยากเพิ่มรูปแบบใหม่ ให้เพิ่มที่ parseNote แล้วมา render ตรงนี้
 * อย่าลัดด้วยการแปลงเป็น HTML string เด็ดขาด
 */

function Spans({ spans }: { spans: NoteSpan[] }) {
  return (
    <>
      {spans.map((s, i) => {
        if (s.kind === "code") {
          return (
            <code
              key={i}
              className="rounded bg-surface-overlay px-1.5 py-0.5 font-mono text-[0.85em] text-brand-300"
            >
              {s.text}
            </code>
          );
        }
        if (s.kind === "bold") {
          return (
            <strong key={i} className="font-bold text-ink">
              {s.text}
            </strong>
          );
        }
        return <span key={i}>{s.text}</span>;
      })}
    </>
  );
}

function CodeBlock({ lang, code }: { lang: string | null; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // คลิปบอร์ดถูกปฏิเสธ (บางเบราว์เซอร์ต้อง https หรือผู้ใช้ปิดไว้)
      // ไม่ต้องเด้งอะไรบอก โค้ดยังลากเลือกเองได้อยู่แล้ว
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-ink-faint">
          {lang ?? "โค้ด"}
        </span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto rounded px-1.5 py-0.5 text-[0.72rem] font-semibold text-ink-faint transition-colors hover:text-brand-400"
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </button>
      </div>
      {/*
        โค้ดยาวต้องเลื่อนในกล่องของตัวเอง ไม่ใช่ดันกล่องแก้งานให้กว้างตาม
        min-w-0 ที่ตัวแม่คือของคู่กัน ถ้าไม่มี grid จะขยายตามลูกจนหน้าล้น
      */}
      <pre className="overflow-x-auto px-3 py-2.5">
        <code className="font-mono text-[0.8rem] leading-relaxed text-ink-muted">{code}</code>
      </pre>
    </div>
  );
}

export function TaskNote({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseNote(text);
  if (blocks.length === 0) return null;

  return (
    <div className={`grid min-w-0 gap-3 text-[0.9rem] leading-relaxed text-ink-muted ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === "code") return <CodeBlock key={i} lang={b.lang} code={b.code} />;

        if (b.kind === "bullets") {
          return (
            <ul key={i} className="grid list-disc gap-1 pl-5 marker:text-ink-faint">
              {b.items.map((spans, j) => (
                <li key={j}>
                  <Spans spans={spans} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap break-words">
            {b.lines.map((spans, j) => (
              <span key={j}>
                {j > 0 && "\n"}
                <Spans spans={spans} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
