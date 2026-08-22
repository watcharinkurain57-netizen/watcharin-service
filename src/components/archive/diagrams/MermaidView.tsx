"use client";

import { useEffect, useId, useRef, useState } from "react";
import { diagramErrorMessage } from "@/lib/project-diagrams";

/**
 * แปลงต้นฉบับ mermaid เป็นภาพ
 *
 * ---------------------------------------------------------------------------
 * ⚠️ ที่นี่คือข้อยกเว้นของกฎ "ไม่มี innerHTML" ที่ตั้งไว้ตอนทำรายละเอียดงาน
 *
 * mermaid คืนผลเป็นสายอักขระ SVG ก้อนเดียว ไม่ใช่โครงสร้างที่เอาไปประกอบ
 * เป็น element ทีละชิ้นได้ จึงต้องยัดลง DOM ทั้งก้อน — ไม่มีทางอื่น
 *
 * ตัวที่กันคือ `securityLevel: "strict"` ซึ่งสั่งให้ mermaid ล้าง label
 * ด้วย DOMPurify ก่อนประกอบ SVG และไม่รับคำสั่ง `click` ที่ผูก callback
 *
 * วัดจริงกับ mermaid 11.17.0 (2026-08-22) ป้อน label ที่มี
 * `<img onerror>`, `<script>`, `<b onmouseover>`, `javascript:` เข้าไป:
 *   - onerror / onmouseover / <script> / javascript: → **ถูกล้างทิ้งหมด**
 *   - `<img src="x">` → เหลือรอด แต่ไม่มี event handler ติดมาด้วย
 *
 * ⚠️ ข้อควรรู้ที่ตามมาจากผลข้อสอง: label ใส่ `<img src="https://...">` ได้
 * ซึ่งแปลว่าคนเขียนผังยิงคำขอออกนอกได้ตอนคนอื่นเปิดดู (แบบ tracking pixel)
 * รับได้เพราะคนที่เขียนผังได้คือ **เจ้าของโปรเจกต์** เท่านั้น (policy ใน 0020)
 * ไม่ใช่ลูกค้าหรือคนนอก ถ้าวันหนึ่งเปิดให้ลูกค้าเขียนผังด้วย ต้องกลับมาคิดข้อนี้ใหม่
 *
 * (เคยเขียนไว้ว่า 'loose' จะทำให้ข้อความกลายเป็น markup ที่ทำงานได้ทันที
 *  — ลองแล้วไม่จริงในเวอร์ชันนี้ 'loose' ก็โดนล้างเหมือนกัน ยังตั้ง strict ต่อไป
 *  เพราะเป็นค่าที่แคบที่สุดและไม่ต้องพึ่งว่า DOMPurify จะยังทำงานแบบนี้ตลอดไป)
 *
 * ต่างจากรายละเอียดงานตรงที่ตรงนั้นเรา *เขียนตัวแปลงเอง* จึงเลี่ยง innerHTML ได้
 * ส่วนตรงนี้เรารับผลจาก library ก้อนหนึ่งมาแสดง
 * ---------------------------------------------------------------------------
 *
 * โหลด mermaid แบบ dynamic เพราะสองเหตุผล
 *   1) มันแตะ document ตั้งแต่ตอน import ถ้า import ปกติ SSR จะพัง
 *   2) เป็นก้อนใหญ่ คนที่ไม่เคยเปิดแท็บไดอะแกรมไม่ควรต้องโหลดติดไปด้วย
 */

/** สีของผัง — ยกค่ามาจาก token ใน globals.css เพราะ SVG ที่ mermaid สร้างอยู่นอกขอบเขต CSS ของเรา */
const THEME = {
  background: "#101514",
  primaryColor: "#161d1b",
  primaryTextColor: "#eef2f0",
  primaryBorderColor: "#33423e",
  lineColor: "#82948f",
  secondaryColor: "#0f2b22",
  tertiaryColor: "#161d1b",
  fontSize: "14px",
};

type State =
  | { status: "loading" }
  | { status: "ok"; svg: string }
  | { status: "error"; message: string };

export function MermaidView({ source, className = "" }: { source: string; className?: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const holder = useRef<HTMLDivElement>(null);
  // id ต้องไม่ซ้ำกันในหน้าเดียว เพราะ mermaid เอาไปตั้งเป็น id ของ element ที่สร้าง
  const rawId = useId();
  const id = `mmd${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  // "ยังไม่ได้เขียน" ตัดสินจาก props ตรง ๆ ไม่ต้องผ่าน state
  // ค่าที่คำนวณจาก props ได้ ไม่ควรถูกคัดลอกไปเก็บใน state ให้มีสองแหล่งความจริง
  const trimmed = source.trim();

  useEffect(() => {
    if (!trimmed) return;
    let alive = true;

    /*
      ไม่ตั้งสถานะ "กำลังวาด" ตอนเริ่ม — ตั้งใจ
      ระหว่างพิมพ์ effect นี้วิ่งทุกตัวอักษร ถ้าล้างภาพทิ้งก่อนทุกครั้ง
      ผังจะกระพริบหายทั้งที่ของใหม่มาแทนภายในไม่กี่มิลลิวินาที
      ปล่อยให้ภาพเดิมค้างไว้จนกว่าของใหม่จะพร้อม แล้วค่อยสลับทีเดียว
    */
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict", // ค่าที่แคบที่สุด — อ่านคอมเมนต์หัวไฟล์ก่อนเปลี่ยน
          theme: "base",
          themeVariables: THEME,
          fontFamily: "inherit",
        });

        // ตรวจไวยากรณ์ก่อน render — ถ้าข้ามขั้นนี้ mermaid จะยัด SVG รูป
        // ระเบิดสีแดงของมันเองลง DOM แทน ซึ่งอ่านไม่รู้เรื่องและลบทิ้งยาก
        await mermaid.parse(trimmed);

        const { svg } = await mermaid.render(id, trimmed);
        if (alive) setState({ status: "ok", svg });
      } catch (err) {
        if (alive) setState({ status: "error", message: diagramErrorMessage(err) });
      }
    })();

    return () => {
      alive = false;
    };
  }, [trimmed, id]);

  useEffect(() => {
    if (!holder.current) return;
    // ล้างของเดิมเสมอ ไม่ใช่แค่ตอนมี svg ใหม่ — ไม่งั้นผังเก่าค้างอยู่
    // ตอนที่ต้นฉบับเพิ่งพิมพ์ผิด ซึ่งทำให้เข้าใจผิดว่ายังใช้ได้อยู่
    holder.current.innerHTML = state.status === "ok" ? state.svg : "";
  }, [state]);

  if (!trimmed) {
    return (
      <p className={`rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint ${className}`}>
        ยังไม่ได้เขียนผังนี้
      </p>
    );
  }

  if (state.status === "error") {
    return (
      <div className={`rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 ${className}`}>
        <p className="text-[0.85rem] font-bold text-amber-200">{state.message}</p>
        <p className="mt-1 text-[0.78rem] text-ink-faint">
          ผังก่อนหน้ายังอยู่ในช่องเขียน แก้แล้วภาพจะกลับมาเอง
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-auto rounded-xl border border-line bg-surface-raised p-4 ${className}`}>
      {state.status === "loading" ? (
        <p className="py-8 text-center text-sm text-ink-faint">กำลังวาดผัง…</p>
      ) : (
        // [&_svg]:mx-auto — mermaid ให้ svg ความกว้างคงที่มา จัดกลางเองไม่ได้
        <div ref={holder} className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" />
      )}
    </div>
  );
}

/** ดึง SVG ที่ render แล้วออกมาเป็นไฟล์ — เอาไปแปะในข้อเสนอหรือเอกสารส่งมอบได้ */
export async function renderToSvg(source: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: THEME,
    fontFamily: "inherit",
  });
  await mermaid.parse(source);
  const { svg } = await mermaid.render(`mmdexport${Date.now()}`, source);
  return svg;
}
