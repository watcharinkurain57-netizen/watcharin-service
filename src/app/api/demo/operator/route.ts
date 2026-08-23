import { broadcastOperator } from "@/lib/demo/broadcast";
import { LIMITS, validateOperatorEvent } from "@/lib/demo/contract";
import { isDemoConfigured, verifyToken } from "@/lib/demo/token";

export const runtime = "nodejs";

/**
 * รับเหตุการณ์จากแท็บเล็ตคนขับ แล้วส่งต่อให้ทุกจอที่ฟัง session เดียวกัน
 *
 * ⚠️ ไม่เก็บลงที่ใดเช่นเดียวกับ /api/demo/ingest — รับ ตรวจ กระจาย จบ
 *
 * ⚠️ ที่นี่ไม่ใช่ตัวตัดสินสิทธิ์การจองไซโล
 * ระบบจริงตัดสินใน transaction เดียวที่ฐานข้อมูล (ล็อกไซโล + ปิดงานเดิม + audit)
 * เส้นนี้เป็นแค่การ "ประกาศให้จออื่นรู้" ซึ่งพอสำหรับเดโมและต้องบอกผู้ใช้ตามนั้น
 */
export async function POST(req: Request) {
  if (!isDemoConfigured()) {
    return Response.json({ error: "โหมดทดลองยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์" }, { status: 503 });
  }

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > LIMITS.bodyBytes) {
    return Response.json({ error: "ข้อมูลก้อนใหญ่เกินกำหนด" }, { status: 413 });
  }

  let body: { token?: unknown; event?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "อ่าน JSON ไม่ได้" }, { status: 400 });
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const verified = verifyToken(body?.token ?? bearer);
  if (!verified.ok) {
    return Response.json({ error: verified.error }, { status: 401 });
  }

  const checked = validateOperatorEvent(body?.event);
  if (!checked.ok) {
    return Response.json({ error: checked.error }, { status: 400 });
  }

  const sent = await broadcastOperator(verified.session.sessionId, checked.event);
  if (!sent.ok) {
    return Response.json({ error: sent.error }, { status: 502 });
  }

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
