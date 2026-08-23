"use client";

import { useEffect, useRef, useState } from "react";

/**
 * อ่านบัตรจากเครื่องอ่าน RFID ที่เสียบพอร์ต USB
 *
 * เครื่องอ่านที่สถาปัตยกรรมกำหนดไว้เป็นแบบ **USB keyboard-wedge** ซึ่งระบบปฏิบัติการ
 * มองว่าเป็นคีย์บอร์ด — แตะบัตรแล้วมัน "พิมพ์" เลขบัตรรวดเดียวจบด้วย Enter
 * ⇒ หน้าเว็บดักด้วย keydown ได้ตรง ๆ **ไม่ต้องลง driver ไม่ต้องใช้ WebUSB/WebHID
 * และไม่ต้องขอสิทธิ์อะไรจากผู้ใช้เลย** ซึ่งสำคัญมากกับเครื่องในโรงงานที่ลงอะไรไม่ได้
 *
 * ⚠️ ต้องแยกให้ออกระหว่าง "เครื่องอ่านยิงบัตร" กับ "คนพิมพ์คีย์บอร์ด"
 * ไม่งั้นการพิมพ์อะไรก็ตามจะกลายเป็นการแตะบัตร เกณฑ์ที่ใช้มี 3 ข้อพร้อมกัน:
 *   1. อักขระต้องมาติด ๆ กัน (ห่างกันไม่เกิน GAP_MS) — คนพิมพ์ไม่เร็วขนาดนี้
 *   2. ต้องจบด้วย Enter
 *   3. ความยาวต้องอยู่ในช่วงที่เป็นไปได้ของเลขบัตร
 * ถ้าข้อไหนไม่ผ่าน ทิ้งทั้งชุด ไม่เดา
 */

/** ระยะห่างสูงสุดระหว่างอักขระที่ยังนับว่ามาจากเครื่องอ่านเดียวกัน */
const GAP_MS = 60;
/** ทั้งชุดต้องจบภายในเวลานี้ ไม่งั้นถือว่าเป็นคนพิมพ์ */
const TOTAL_MS = 1500;
const MIN_LEN = 4;
const MAX_LEN = 32;

export type CardReaderState = {
  /** เคยอ่านบัตรได้อย่างน้อยหนึ่งครั้ง — ใช้บอกผู้ใช้ว่าเครื่องอ่านใช้ได้จริง */
  seenReader: boolean;
  lastCode: string | null;
};

/**
 * @param onScan เรียกเมื่ออ่านบัตรได้ครบชุด — ต้องเป็นฟังก์ชันที่อ้างอิงค่าล่าสุดเอง
 * @param enabled ปิดได้เมื่อหน้าจอไม่ได้รอรับบัตร
 */
export function useCardReader(onScan: (code: string) => void, enabled = true): CardReaderState {
  const [state, setState] = useState<CardReaderState>({ seenReader: false, lastCode: null });

  // เก็บ callback ไว้ใน ref เพื่อไม่ต้องถอด/ใส่ listener ใหม่ทุกครั้งที่ component เรนเดอร์
  const handler = useRef(onScan);
  useEffect(() => {
    handler.current = onScan;
  }, [onScan]);

  const buffer = useRef("");
  const lastKeyAt = useRef(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      // ปล่อยให้ช่องกรอกข้อความทำงานตามปกติ — ไม่ไปแย่งคีย์ของผู้ใช้
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const now = Date.now();

      if (event.key === "Enter") {
        const code = buffer.current;
        buffer.current = "";
        const fastEnough = now - startedAt.current <= TOTAL_MS;
        if (code.length >= MIN_LEN && code.length <= MAX_LEN && fastEnough) {
          event.preventDefault();
          setState({ seenReader: true, lastCode: code });
          handler.current(code);
        }
        return;
      }

      // สนใจเฉพาะอักขระเดี่ยว — ปุ่มควบคุม (Shift, Tab, F5) ไม่ใช่ส่วนหนึ่งของเลขบัตร
      if (event.key.length !== 1) return;

      // ห่างจากตัวก่อนหน้ามากเกินไป = เริ่มชุดใหม่ ไม่ใช่ต่อจากของเดิม
      if (now - lastKeyAt.current > GAP_MS) {
        buffer.current = "";
        startedAt.current = now;
      }
      lastKeyAt.current = now;
      if (buffer.current.length < MAX_LEN) buffer.current += event.key;
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  return state;
}
