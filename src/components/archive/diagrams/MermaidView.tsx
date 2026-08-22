"use client";

import { useEffect, useId, useState } from "react";
import { diagramErrorMessage } from "@/lib/project-diagrams";
import { PanZoom } from "./PanZoom";

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
  const [expanded, setExpanded] = useState(false);
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
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    // ล็อกการเลื่อนของหน้าข้างหลัง เหมือนกล่องซ้อนหน้าอื่น ๆ ในคลังโปรเจกต์
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

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

  if (state.status === "loading") {
    return (
      <div className={`grid h-[26rem] place-items-center rounded-xl border border-line bg-surface-raised ${className}`}>
        <p className="text-sm text-ink-faint">กำลังวาดผัง…</p>
      </div>
    );
  }

  return (
    <>
      <div className={`relative ${className}`}>
        <PanZoom svg={state.svg} className="h-[26rem]" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 rounded-lg border border-line bg-surface/80 px-2.5 py-1.5 text-[0.72rem] font-bold text-ink-muted backdrop-blur transition-colors hover:border-brand-500 hover:text-brand-300"
        >
          ขยายเต็มจอ
        </button>
      </div>

      {/* เต็มจอ — ผังสถาปัตยกรรมของงานจริงต้องการพื้นที่มากกว่ากล่องในหน้า
          key ที่ต่างกันบังคับให้ PanZoom ตัวในสร้างใหม่ จะได้จัดพอดีจอของตัวเอง
          ไม่ใช่รับมุมมองที่คำนวณจากขนาดกล่องเล็กมาใช้ */}
      {expanded && (
        <div
          className="fixed inset-0 z-60 flex flex-col bg-black/90 p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="ผังแบบเต็มจอ"
        >
          <div className="mb-3 flex flex-none items-center gap-3">
            <span className="text-[0.85rem] font-bold text-ink-muted">
              ลากเพื่อเลื่อน · ล้อเพื่อซูม · สองนิ้วหุบเข้าออกบนมือถือ
            </span>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="ml-auto rounded-lg border border-line-strong px-3 py-1.5 text-[0.8rem] font-bold text-ink-muted transition-colors hover:text-ink"
            >
              ปิด
            </button>
          </div>
          <PanZoom key="full" svg={state.svg} immersive className="min-h-0 flex-1" />
        </div>
      )}
    </>
  );
}

const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * แปลง SVG ที่ mermaid ให้มา ให้เป็นไฟล์ที่เอาไปเปิดที่อื่นได้จริง
 *
 * ---------------------------------------------------------------------------
 * ปัญหาที่ฟังก์ชันนี้แก้ (เจอจากของจริง 2026-08-23)
 *
 * mermaid วาด label ของ flowchart เป็น HTML ใน <foreignObject> ไม่ใช่ <text>
 * ซึ่งบนหน้าเว็บไม่มีปัญหาเลย แต่พอบันทึกเป็นไฟล์ .svg แล้วเปิด:
 *
 *   1) **ไฟล์พังทั้งไฟล์** — ข้างในมี <br> กับ <p> แบบ HTML ที่ไม่ปิด tag
 *      ซึ่งเป็น HTML ที่ถูก แต่ .svg ถูกอ่านแบบ XML ที่เข้มกว่า
 *      เบราว์เซอร์ขึ้น "Opening and ending tag mismatch: br line 1 and p"
 *      แล้วหยุดวาดตรงนั้น (นี่คืออาการที่เจ้าของรายงานมา)
 *
 *   2) **ต่อให้ XML ถูก ก็ยังเอาไปแปะที่อื่นไม่ได้** — SVG ที่มี foreignObject
 *      ไม่ render ตอนอยู่ใน <img> ซึ่งเป็นบริบทที่ Word/PowerPoint/Illustrator ใช้
 *      ตัวหนังสือจะหายหมดเหลือแต่กล่องเปล่า
 *      วัดแล้ว: ไฟล์เดิมโหลดเข้า <img> ไม่ขึ้นเลย · หลังแปลงได้ขนาดจริงออกมา
 *
 * ลองปิด foreignObject ที่ต้นทางแล้วไม่ได้ผล — `htmlLabels: false` ทั้งระดับ
 * config, ระดับ flowchart และผ่าน directive `%%{init}%%` ถูก mermaid 11.17
 * เมินทั้งหมด (renderer ใหม่ของ flowchart ใช้ foreignObject เสมอ)
 * จึงต้องแปลงเองหลังจากได้ผลลัพธ์มา
 * ---------------------------------------------------------------------------
 */
function toPortableSvg(svg: string): string {
  // ต้องแปะลง DOM จริงก่อน เพราะต้องถาม getComputedStyle ว่าตัวอักษรขนาดเท่าไหร่สีอะไร
  // (ซ่อนไว้นอกจอแทนที่จะใช้ display:none เพราะ display:none ไม่มีการคำนวณ layout)
  const stage = document.createElement("div");
  stage.style.cssText = "position:fixed;left:-99999px;top:0;pointer-events:none;";
  stage.innerHTML = svg;
  document.body.appendChild(stage);

  try {
    const root = stage.querySelector("svg");
    if (!root) return svg;

    for (const fo of Array.from(root.querySelectorAll("foreignObject"))) {
      const holder = fo.firstElementChild;
      if (!holder) {
        fo.remove();
        continue;
      }

      // <br> คือตัวขึ้นบรรทัดใหม่ ต้องแปลงเป็นตัวขึ้นบรรทัดก่อนอ่าน textContent
      // ไม่งั้นสองบรรทัดจะติดกันเป็นคำเดียว เช่น "SCADA / PLCKK1-6"
      const clone = holder.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("br").forEach((b) => b.replaceWith(document.createTextNode("\n")));
      const lines = clone.textContent?.split("\n").map((l) => l.trim()).filter(Boolean) ?? [];

      if (lines.length === 0) {
        fo.remove();
        continue;
      }

      const probe = holder.querySelector("span, p, div") ?? holder;
      const cs = getComputedStyle(probe);
      const size = parseFloat(cs.fontSize) || 14;
      const lineHeight = size * 1.25;

      const box = holder.getBoundingClientRect();
      const w = parseFloat(fo.getAttribute("width") ?? "") || box.width;
      const h = parseFloat(fo.getAttribute("height") ?? "") || box.height;

      const text = document.createElementNS(SVG_NS, "text");
      text.setAttribute("x", String(w / 2));
      // จัดกึ่งกลางแนวตั้ง: ยกขึ้นครึ่งหนึ่งของความสูงรวมทุกบรรทัด
      text.setAttribute("y", String(h / 2 - ((lines.length - 1) * lineHeight) / 2));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "central");
      text.setAttribute("font-size", `${size}px`);
      // ใส่สีตรง ๆ ไม่พึ่ง class เพราะ <style> ของ mermaid เล็ง .nodeLabel
      // ซึ่งเป็นของ foreignObject ที่กำลังจะถูกลบไป
      text.setAttribute("fill", cs.color || "#eef2f0");

      lines.forEach((line, i) => {
        const ts = document.createElementNS(SVG_NS, "tspan");
        ts.setAttribute("x", String(w / 2));
        if (i > 0) ts.setAttribute("dy", String(lineHeight));
        ts.textContent = line;
        text.appendChild(ts);
      });

      const g = document.createElementNS(SVG_NS, "g");
      g.setAttribute("transform", `translate(${fo.getAttribute("x") ?? 0}, ${fo.getAttribute("y") ?? 0})`);
      g.appendChild(text);
      fo.replaceWith(g);
    }

    // ไฟล์เดี่ยวต้องบอกขนาดของตัวเอง — mermaid ตั้ง width เป็น 100%
    // ซึ่งแปลว่า "เท่ากับกล่องที่ใส่อยู่" พอไม่มีกล่องก็ไม่รู้จะกว้างเท่าไหร่
    const viewBox = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    if (viewBox.length === 4 && viewBox[2] > 0) {
      root.setAttribute("width", String(Math.round(viewBox[2])));
      root.setAttribute("height", String(Math.round(viewBox[3])));
      root.removeAttribute("style");

      // พื้นหลังทึบ ให้ไฟล์หน้าตาเหมือนตอนอยู่ในเว็บ ไม่ใช่โปร่งใสแล้วไปเจอ
      // พื้นขาวของเอกสารจนตัวหนังสือสีอ่อนอ่านไม่ออก
      const bg = document.createElementNS(SVG_NS, "rect");
      bg.setAttribute("x", String(viewBox[0]));
      bg.setAttribute("y", String(viewBox[1]));
      bg.setAttribute("width", String(viewBox[2]));
      bg.setAttribute("height", String(viewBox[3]));
      bg.setAttribute("fill", THEME.background);
      root.insertBefore(bg, root.firstChild);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(root)}`;
  } finally {
    stage.remove();
  }
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
  return toPortableSvg(svg);
}
