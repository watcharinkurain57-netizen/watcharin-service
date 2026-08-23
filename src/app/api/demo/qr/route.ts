import QRCode from "qrcode";
import { WATCH_PARAM } from "@/lib/demo/contract";

export const runtime = "nodejs";

/**
 * QR ของลิงก์ดูอย่างเดียว — ให้คนในห้องประชุมสแกนแล้วเห็นข้อมูลบนเครื่องตัวเอง
 *
 * ทำฝั่งเซิร์ฟเวอร์เพราะไม่อยากลากไลบรารีวาด QR ลงไปอยู่ใน bundle ของเบราว์เซอร์
 * ทั้งที่ใช้แค่หน้าเดียว — คืนเป็น SVG ให้ <img> เรียกตรง ๆ
 *
 * ⚠️ ประกอบ URL จาก header ไม่ใช่รับมาจากผู้เรียก
 * ถ้าให้ผู้เรียกส่ง URL เต็มมาได้ ใครก็ทำ QR ที่หน้าตาเหมือนของเราแต่ชี้ไปที่อื่นได้
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const sessionId = params.get(WATCH_PARAM)?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(sessionId)) {
    return new Response("session id ไม่ถูกต้อง", { status: 400 });
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  if (!host) return new Response("ไม่รู้จักโดเมนของตัวเอง", { status: 400 });
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  // โหมด op = ลิงก์แท็บเล็ตคนขับ ซึ่งพกโทเคนไปด้วยเพื่อให้ส่งเหตุการณ์กลับมาได้
  //
  // ⚠️ โทเคนเข้ามาทาง query จึงติดไปใน log ของเซิร์ฟเวอร์ได้
  // ยอมรับได้เพราะหน้าเชื่อมต่อแสดงโทเคนเป็นข้อความอยู่แล้ว (ในคำสั่ง curl ที่ให้ก๊อป)
  // และโทเคนมีอายุ 2 ชั่วโมงกับทำได้อย่างเดียวคือส่งเข้า channel ของตัวเอง
  // แต่ **ห้ามแคช** ไม่งั้นโทเคนไปค้างอยู่ตามชั้นแคชระหว่างทาง
  const token = params.get("t")?.trim() ?? "";
  const operator = params.get("m") === "op" && token.includes(".");
  const base = `${proto}://${host}`;
  const target = operator
    ? `${base}/coresync/operator?${WATCH_PARAM}=${encodeURIComponent(sessionId)}#t=${encodeURIComponent(token)}`
    : `${base}/coresync?${WATCH_PARAM}=${encodeURIComponent(sessionId)}`;

  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    // พื้นขาวเสมอแม้เว็บเป็นธีมมืด — QR บนพื้นเข้มกล้องมือถืออ่านพลาดบ่อย
    color: { dark: "#0b1220", light: "#ffffff" },
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // ผูกกับ sessionId ที่สุ่มมาอยู่แล้ว จึงแคชได้ยาว ๆ โดยไม่ปนกัน
      // ยกเว้นแบบที่มีโทเคนอยู่ในภาพ — อันนั้นห้ามค้างที่ไหนทั้งสิ้น
      "Cache-Control": operator ? "no-store" : "public, max-age=3600, immutable",
    },
  });
}
