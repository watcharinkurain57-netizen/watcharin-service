"use client";

import { useCallback, useEffect, useState } from "react";
import { PREVIEW_HTML_MAX_BYTES, type PreviewItem } from "@/lib/file-preview";

/**
 * กล่องดูไฟล์ — รูป PDF และ HTML
 *
 * ใช้ร่วมกันทั้งแท็บไฟล์ส่งมอบและไฟล์แนบในงาน สองที่นั้นเก็บไฟล์คนละตาราง
 * แต่พอขอ signed URL มาแล้วก็ไม่ต่างกัน กล่องนี้จึงรับแค่รายการที่พร้อมแสดง
 * ไม่รู้จัก Supabase และไม่รู้ว่าไฟล์มาจากตารางไหน
 *
 * เลื่อนดูไฟล์ถัดไปได้ด้วยลูกศรซ้าย/ขวา เพราะเวลาดูภาพหน้าจอชุดหนึ่ง
 * การต้องปิดกล่องแล้วกดไฟล์ถัดไปทีละอันเป็นเรื่องน่ารำคาญที่เลี่ยงได้ง่าย
 */
/**
 * โหลดเนื้อไฟล์ HTML มาเป็นข้อความ เพื่อเอาไปใส่ใน srcdoc
 *
 * ⚠️ ทำไมไม่ชี้ iframe ไปที่ signed URL ตรง ๆ เหมือน PDF
 * เพราะที่เก็บไฟล์อาจส่ง header ที่สั่งให้ "บันทึกลงเครื่อง" แทนที่จะแสดงผล
 * ซึ่งจะได้กรอบว่างเปล่าโดยไม่มีข้อความบอกสาเหตุ — อ่านเนื้อมาเองแล้วใส่ srcdoc
 * ทำให้ผลลัพธ์ไม่ขึ้นกับ header ของที่เก็บไฟล์เลย
 *
 * ⚠️ และเป็นการปิดกั้นชั้นสำคัญด้วย: srcdoc + sandbox ทำให้หน้าที่โหลดมา
 * อยู่คนละ origin กับทุกอย่าง เข้าถึงข้อมูลของเว็บเราหรือของที่เก็บไฟล์ไม่ได้เลย
 */
function useHtmlContent(item: PreviewItem | undefined) {
  const [state, setState] = useState<{ html: string | null; error: string | null }>({
    html: null,
    error: null,
  });

  const url = item?.kind === "html" ? item.url : null;

  // ล้างของไฟล์เก่าตอนเปลี่ยนไฟล์ — ทำระหว่าง render ตามรูปแบบที่ React แนะนำ
  // ถ้าไปสั่งใน effect จะได้เรนเดอร์รอบพิเศษที่คนเห็นเนื้อไฟล์เก่าแวบหนึ่งก่อน
  const [tracked, setTracked] = useState(url);
  if (tracked !== url) {
    setTracked(url);
    setState({ html: null, error: null });
  }

  useEffect(() => {
    if (!url) return;

    // ยกเลิกเมื่อเลื่อนไปไฟล์อื่นก่อนโหลดเสร็จ ไม่งั้นของไฟล์เก่ามาทับของใหม่
    const stop = new AbortController();

    (async () => {
      try {
        const res = await fetch(url, { signal: stop.signal });
        if (!res.ok) throw new Error(`โหลดไฟล์ไม่สำเร็จ (${res.status})`);

        const size = Number(res.headers.get("content-length") ?? 0);
        if (size > PREVIEW_HTML_MAX_BYTES) {
          throw new Error("ไฟล์ใหญ่เกินกว่าจะเปิดดูในเว็บ — ดาวน์โหลดไปเปิดเองได้");
        }

        const text = await res.text();
        if (text.length > PREVIEW_HTML_MAX_BYTES) {
          throw new Error("ไฟล์ใหญ่เกินกว่าจะเปิดดูในเว็บ — ดาวน์โหลดไปเปิดเองได้");
        }
        setState({ html: text, error: null });
      } catch (err) {
        if (stop.signal.aborted) return;
        setState({
          html: null,
          error: err instanceof Error ? err.message : "เปิดไฟล์นี้ไม่สำเร็จ",
        });
      }
    })();

    return () => stop.abort();
  }, [url]);

  return state;
}

export function FileViewer({
  items,
  index,
  onIndex,
  onClose,
  onDownload,
  onAsk,
}: {
  items: PreviewItem[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
  onDownload?: (item: PreviewItem) => void;
  /** ยกเรื่องไฟล์นี้ไปคุยต่อในแท็บคุยงาน — ไม่ส่งมาก็ไม่มีปุ่ม */
  onAsk?: (item: PreviewItem) => void;
}) {
  const current = items[index];
  const many = items.length > 1;
  const doc = useHtmlContent(current);

  const step = useCallback(
    (dir: -1 | 1) => {
      if (items.length === 0) return;
      // วนกลับไปต้น/ท้าย — ดูภาพชุดหนึ่งแล้วเจอทางตันกลางคันทำให้สะดุด
      onIndex((index + dir + items.length) % items.length);
    },
    [index, items.length, onIndex]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  /**
   * ล็อกการเลื่อนของหน้าหลังกล่อง
   *
   * PDF ใน iframe กินการหมุนล้อของตัวเองอยู่แล้ว แต่พอเลื่อนสุดขอบเอกสาร
   * เบราว์เซอร์จะส่งต่อไปเลื่อนหน้าข้างหลังแทน ปิดกล่องมาทีก็เจอว่า
   * หน้าโปรเจกต์เลื่อนไปไหนไม่รู้แล้ว
   */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-black/85 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label={`ดูไฟล์ ${current.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ---------- แถบหัว ---------- */}
      <div className="flex flex-none items-center gap-3 pb-3 text-ink">
        <span className="min-w-0 flex-1 truncate text-[0.9rem] font-bold" title={current.name}>
          {current.name}
        </span>

        {many && (
          <span className="flex-none text-[0.8rem] text-ink-faint">
            {index + 1} / {items.length}
          </span>
        )}

        {/* ปุ่มถามอยู่ก่อนดาวน์โหลด เพราะตอนกำลังดูแบบอยู่ สิ่งที่คนอยากทำต่อ
            คือทักถาม ไม่ใช่โหลดเก็บ */}
        {onAsk && (
          <button
            type="button"
            onClick={() => onAsk(current)}
            className="flex-none rounded-lg border border-brand-500/60 px-3 py-1.5 text-[0.8rem] font-bold text-brand-300 transition-colors hover:bg-brand-500/10"
          >
            ถามเรื่องไฟล์นี้
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={() => onDownload(current)}
            className="flex-none rounded-lg border border-line-strong px-3 py-1.5 text-[0.8rem] font-bold text-ink-muted transition-colors hover:text-brand-400"
          >
            ดาวน์โหลด
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="flex-none rounded-lg border border-line-strong px-3 py-1.5 text-[0.8rem] font-bold text-ink-muted transition-colors hover:text-ink"
        >
          ปิด
        </button>
      </div>

      {/* ---------- ตัวไฟล์ ---------- */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {many && (
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="ไฟล์ก่อนหน้า"
            className="absolute left-0 z-10 grid size-10 place-items-center rounded-full bg-surface-raised/80 text-lg font-bold text-ink transition-colors hover:bg-surface-raised"
          >
            ‹
          </button>
        )}

        {current.kind === "image" ? (
          /* eslint-disable-next-line @next/next/no-img-element -- signed URL อายุสั้นและเปลี่ยนทุกครั้ง ให้ next/image มาแคชไม่ได้ */
          <img
            src={current.url}
            alt={current.name}
            className="max-h-full max-w-full object-contain"
          />
        ) : current.kind === "html" ? (
          doc.error ? (
            <p className="max-w-md text-center text-[0.9rem] text-ink-muted">{doc.error}</p>
          ) : doc.html === null ? (
            <p className="text-[0.9rem] text-ink-faint">กำลังเปิดไฟล์…</p>
          ) : (
            /*
              sandbox ไม่ใส่ allow-same-origin โดยตั้งใจ
              หน้าที่โหลดมาจึงได้ origin ของตัวเองที่ไม่ตรงกับใครเลย อ่าน cookie
              หรือ storage ของเว็บเราไม่ได้ พาหน้าหลักเปลี่ยนที่อยู่ไม่ได้
              และเปิดหน้าต่างใหม่ไม่ได้ — เปิดไฟล์ที่คนอื่นอัปมาได้อย่างปลอดภัย
              (allow-scripts ให้ไว้เพราะเอกสารบางฉบับมีส่วนโต้ตอบ และการให้
               อย่างเดียวโดยไม่มี allow-same-origin ยังถอด sandbox ตัวเองไม่ได้)
            */
            <iframe
              srcDoc={doc.html}
              title={current.name}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              className="size-full rounded-lg border border-line-strong bg-white"
            />
          )
        ) : (
          /*
            PDF ปล่อยให้ตัวอ่านในตัวเบราว์เซอร์จัดการ — มีแถบเลื่อนหน้า ซูม ค้นหา
            พร้อมอยู่แล้วและทำงานถูกทุกเครื่องโดยที่เราไม่ต้องดูแลอะไรเลย
            (signed URL ที่ไม่ได้ขอแบบ download มาพร้อม Content-Type ที่ถูก
             เบราว์เซอร์จึงเปิดอ่าน ไม่ใช่สั่งบันทึกลงเครื่อง)
          */
          <iframe
            src={current.url}
            title={current.name}
            className="size-full rounded-lg border border-line-strong bg-white"
          />
        )}

        {many && (
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="ไฟล์ถัดไป"
            className="absolute right-0 z-10 grid size-10 place-items-center rounded-full bg-surface-raised/80 text-lg font-bold text-ink transition-colors hover:bg-surface-raised"
          >
            ›
          </button>
        )}
      </div>

      {many && (
        <p className="flex-none pt-2 text-center text-[0.74rem] text-ink-faint">
          กดลูกศรซ้าย/ขวาเพื่อเลื่อนดูไฟล์ · Esc เพื่อปิด
        </p>
      )}
    </div>
  );
}
