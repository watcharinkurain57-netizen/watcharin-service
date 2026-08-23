"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  OPERATOR_EVENT,
  READINGS_EVENT,
  channelFor,
  type OperatorEvent,
  type Reading,
  type ReadingsEvent,
} from "./contract";

export type ChannelStatus = "idle" | "connecting" | "listening" | "error";

export type DemoChannelState = {
  status: ChannelStatus;
  /** เวลาที่ได้รับข้อมูลชุดล่าสุด (epoch ms) — null คือยังไม่เคยได้รับ */
  lastAt: number | null;
  /** เวลาที่ได้รับชุดแรก — ใช้คำนวณอัตราการส่งจริงในสรุปผลการทดลอง */
  firstAt: number | null;
  totalReadings: number;
  batches: number;
  /** ชื่อ tag ที่เคยเห็น เรียงตามลำดับที่เจอครั้งแรก */
  tags: string[];
  /** ค่าล่าสุดของแต่ละ tag — ใช้เป็นแหล่งข้อมูลของหน้าจอ */
  latest: Record<string, Reading>;
  /** ค่าตัวเลขย้อนหลังของแต่ละ tag ไว้วาดกราฟเส้นเล็ก — เก็บเฉพาะที่เป็นตัวเลข */
  history: Record<string, number[]>;
  /** ไม่กี่ค่าล่าสุดตามลำดับเวลา ใช้โชว์ให้เห็นว่าเราตีความข้อมูลถูก */
  recent: Reading[];
  /** เหตุการณ์จากแท็บเล็ตคนขับ ใหม่สุดอยู่บน — จอ CCR ใช้ดูว่าใครรับงานไหน */
  events: OperatorEvent[];
  error: string | null;
};

const EMPTY: DemoChannelState = {
  status: "idle",
  lastAt: null,
  firstAt: null,
  totalReadings: 0,
  batches: 0,
  tags: [],
  latest: {},
  history: {},
  recent: [],
  events: [],
  error: null,
};

const CONNECTING: DemoChannelState = { ...EMPTY, status: "connecting" };
const RECENT_KEPT = 8;
/** เหตุการณ์จากแท็บเล็ตที่เก็บไว้แสดง */
const EVENTS_KEPT = 12;
/** จำนวนจุดต่อ tag ที่เก็บไว้วาดกราฟ — พอให้เห็นแนวโน้ม โดยไม่ให้หน่วยความจำโตเรื่อย ๆ */
const HISTORY_KEPT = 30;

/**
 * ฟังข้อมูลของ session ทดลองหนึ่งอัน
 *
 * ⚠️ ตัวนับทั้งหมดอยู่ในเบราว์เซอร์ ไม่ได้อยู่ที่เซิร์ฟเวอร์
 * นี่คือเหตุผลที่โหมดทดลองไม่ต้องมีฐานข้อมูลเลย — หน้าจอนับสิ่งที่ตัวเองได้รับ
 * ผลที่ตามมาคือรีเฟรชหน้าแล้วตัวเลขเริ่มใหม่ ซึ่งยอมรับได้และต้องบอกผู้ใช้ให้ชัด
 */
export function useDemoChannel(sessionId: string | null): DemoChannelState {
  const [state, setState] = useState<DemoChannelState>(sessionId ? CONNECTING : EMPTY);
  const [tracked, setTracked] = useState(sessionId);

  // รีเซ็ตเมื่อเปลี่ยน session — ปรับ state ระหว่าง render ตามรูปแบบที่ React รองรับ
  // ไม่ทำใน effect เพราะจะกลายเป็น render รอบพิเศษที่ผู้ใช้เห็นค่าเก่าแวบหนึ่งก่อน
  if (tracked !== sessionId) {
    setTracked(sessionId);
    setState(sessionId ? CONNECTING : EMPTY);
  }

  useEffect(() => {
    if (!sessionId) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(channelFor(sessionId));

    channel.on("broadcast", { event: READINGS_EVENT }, ({ payload }) => {
      const incoming = (payload as ReadingsEvent | undefined)?.readings;
      if (!Array.isArray(incoming) || incoming.length === 0) return;

      // ต่อยอดจากค่าก่อนหน้าผ่าน updater — ไม่ต้องเก็บ ref คู่ขนานไว้ให้หลุดกัน
      setState((prev) => {
        const tags = prev.tags.slice();
        const latest = { ...prev.latest };
        const history = { ...prev.history };
        for (const reading of incoming) {
          if (!(reading.tag in latest)) tags.push(reading.tag);
          latest[reading.tag] = reading;
          // เก็บประวัติเฉพาะค่าที่เป็นตัวเลข — สถานะ running/stopped วาดเป็นเส้นไม่ได้
          if (typeof reading.value === "number") {
            const past = history[reading.tag] ?? [];
            history[reading.tag] = [...past, reading.value].slice(-HISTORY_KEPT);
          }
        }
        const now = Date.now();
        return {
          status: "listening",
          lastAt: now,
          firstAt: prev.firstAt ?? now,
          totalReadings: prev.totalReadings + incoming.length,
          batches: prev.batches + 1,
          tags,
          latest,
          history,
          recent: [...incoming, ...prev.recent].slice(0, RECENT_KEPT),
          events: prev.events,
          error: null,
        };
      });
    });

    // เหตุการณ์จากแท็บเล็ตคนขับมาคนละ event เพราะเป็นการกระทำของคน ไม่ใช่ค่าที่วัดได้
    // ⚠️ ต้องไม่ไปแตะ lastAt/totalReadings ไม่งั้นตัวเลข "รับข้อมูลล่าสุดเมื่อไหร่"
    // จะดูเหมือนโรงงานยังส่งอยู่ทั้งที่หยุดไปแล้ว เหลือแค่คนกดบนแท็บเล็ต
    channel.on("broadcast", { event: OPERATOR_EVENT }, ({ payload }) => {
      const event = payload as OperatorEvent | undefined;
      if (!event?.kind || !event.vehicle) return;
      setState((prev) => ({ ...prev, events: [event, ...prev.events].slice(0, EVENTS_KEPT) }));
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setState((prev) => ({ ...prev, status: "listening", error: null }));
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setState((prev) => ({
          ...prev,
          status: "error",
          error:
            status === "TIMED_OUT"
              ? "เชื่อมต่อช่องรับข้อมูลไม่ทัน — ลองรีเฟรชหน้านี้"
              : "เชื่อมต่อช่องรับข้อมูลไม่ได้ — ตรวจว่าเปิด Realtime ในโปรเจกต์ Supabase แล้ว",
        }));
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return state;
}

/**
 * วินาทีที่ผ่านไปนับจากได้รับข้อมูลล่าสุด
 *
 * เก็บ "เวลาปัจจุบัน" ไว้ใน state แล้วให้ตัวจับเวลาเป็นคนอัปเดต
 * ถ้าเรียก Date.now() ตอน render ค่าจะเปลี่ยนทุกครั้งที่ component เรนเดอร์
 * ด้วยเหตุอื่น ทำให้ผลลัพธ์ไม่คงที่และ React เตือนว่าเป็นฟังก์ชันไม่บริสุทธิ์
 */
export function useSecondsSince(at: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (at === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [at]);

  return at === null ? null : Math.max(0, Math.round((now - at) / 1000));
}
