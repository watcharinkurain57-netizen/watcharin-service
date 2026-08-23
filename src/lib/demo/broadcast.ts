import "server-only";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { READINGS_EVENT, channelFor, type ReadingsEvent } from "./contract";

/**
 * ส่งข้อมูลออกไปหาเบราว์เซอร์ผ่าน Supabase Realtime Broadcast
 *
 * ⚠️ ทำไมยิงเป็น HTTP ไม่ใช่เปิด channel ด้วย supabase-js:
 * API route บน Vercel เป็น serverless — จบเป็นครั้ง ๆ ถ้าเปิด websocket
 * ทุกครั้งที่มีคำขอเข้ามา จะเสียเวลา handshake ทุกครั้งและปิดทิ้งทันที
 * Realtime มีเส้น HTTP สำหรับ broadcast อยู่แล้ว ซึ่งเข้ากับ serverless พอดี
 *
 * ⚠️ และทำไม broadcast ไม่ใช่เขียนลงตาราง:
 * โหมดทดลองประกาศว่าไม่เก็บข้อมูล — broadcast คือข้อความที่ผ่านไปเฉย ๆ
 * ไม่มีตารางรองรับ ไม่มีอะไรค้าง ตรงกับที่บอกผู้ใช้ไว้จริง ๆ
 */
export async function broadcastReadings(
  sessionId: string,
  payload: ReadingsEvent
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`${SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          topic: channelFor(sessionId),
          event: READINGS_EVENT,
          payload,
        },
      ],
    }),
  });

  if (!res.ok) {
    // อ่านข้อความจริงจาก Supabase มาด้วย ไม่งั้นเวลาพังจะเห็นแค่เลข status
    const detail = await res.text().catch(() => "");
    return { ok: false, error: `Realtime ตอบกลับ ${res.status} ${detail}`.trim() };
  }

  return { ok: true };
}
