import { broadcastReadings } from "@/lib/demo/broadcast";
import { LIMITS, validateReadings, type IngestBody } from "@/lib/demo/contract";
import { isDemoConfigured, verifyToken } from "@/lib/demo/token";

export const runtime = "nodejs";

/**
 * รับข้อมูลจากตัวเชื่อมต่อที่ลูกค้ารันในเครื่องตัวเอง แล้วส่งต่อไปที่หน้าจอ
 *
 * ⚠️ ไม่มีการเก็บข้อมูลลงที่ใดเลย — รับ ตรวจ แล้วกระจายออก จบ
 * นี่คือคำสัญญาของโหมดทดลองที่เขียนไว้บนหน้าจอ ไม่ใช่แค่คำโฆษณา
 *
 * ⚠️ ตัวเชื่อมต่อต้องสะสมค่าแล้วส่งเป็นชุด ไม่ใช่ยิงทีละค่าทุกวินาที
 * ยิงทุก 1 วินาที = ~2.6 ล้านคำขอต่อเดือนต่อหนึ่งเครื่อง ซึ่งชนเพดานแผน
 * ที่ใช้อยู่ได้ในเวลาไม่นาน — เพดาน readingsPerBatch บังคับพฤติกรรมนี้อยู่แล้ว
 */
export async function POST(req: Request) {
  if (!isDemoConfigured()) {
    return Response.json(
      { error: "โหมดทดลองยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์" },
      { status: 503 }
    );
  }

  // ดูขนาดก่อนอ่าน จะได้ไม่ต้องดึงของใหญ่เข้าหน่วยความจำเปล่า ๆ
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > LIMITS.bodyBytes) {
    return Response.json(
      { error: `ข้อมูลก้อนใหญ่เกิน ${Math.round(LIMITS.bodyBytes / 1024)} KB` },
      { status: 413 }
    );
  }

  const raw = await req.text();
  if (raw.length > LIMITS.bodyBytes) {
    return Response.json(
      { error: `ข้อมูลก้อนใหญ่เกิน ${Math.round(LIMITS.bodyBytes / 1024)} KB` },
      { status: 413 }
    );
  }

  let body: IngestBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "อ่าน JSON ไม่ได้ — ตรวจรูปแบบข้อมูลที่ส่งมา" }, { status: 400 });
  }

  // โทเคนอยู่ใน body หรือใน Authorization ก็ได้ ให้ตัวเชื่อมต่อเลือกวิธีที่ถนัด
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const verified = verifyToken(body?.token ?? bearer);
  if (!verified.ok) {
    return Response.json({ error: verified.error }, { status: 401 });
  }

  const checked = validateReadings(body?.readings);
  if (!checked.ok) {
    return Response.json({ error: checked.error }, { status: 400 });
  }

  const sent = await broadcastReadings(verified.session.sessionId, {
    readings: checked.readings,
    receivedAt: new Date().toISOString(),
  });
  if (!sent.ok) {
    return Response.json({ error: sent.error }, { status: 502 });
  }

  return Response.json(
    {
      ok: true,
      accepted: checked.readings.length,
      expiresAt: new Date(verified.session.expiresAt).toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
