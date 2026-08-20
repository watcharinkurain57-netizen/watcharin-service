import { LIMITS } from "@/lib/demo/contract";
import { createToken, isDemoConfigured } from "@/lib/demo/token";

export const runtime = "nodejs";

/**
 * ขอโทเคนสำหรับโหมดทดลอง
 *
 * ไม่ต้องล็อกอิน — จุดประสงค์ของโหมดทดลองคือให้ลองได้ทันที
 * ที่กันการใช้เกินคือ อายุโทเคนสั้น กับเพดานต่อคำขอที่ /api/demo/ingest
 */
export async function POST() {
  if (!isDemoConfigured()) {
    return Response.json(
      { error: "โหมดทดลองยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์ (ขาด DEMO_TOKEN_SECRET)" },
      { status: 503 }
    );
  }

  const created = createToken();
  if (!created) {
    return Response.json({ error: "สร้างโทเคนไม่สำเร็จ" }, { status: 500 });
  }

  return Response.json(
    {
      token: created.token,
      sessionId: created.session.sessionId,
      expiresAt: new Date(created.session.expiresAt).toISOString(),
      limits: LIMITS,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
