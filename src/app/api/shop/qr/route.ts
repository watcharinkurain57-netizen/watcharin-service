import QRCode from "qrcode";
import { closed, readSettings, shopDb } from "@/lib/shop/shop.server";
import { promptpayPayload } from "@/lib/shop/promptpay";

export const runtime = "nodejs";

/**
 * รูป QR พร้อมเพย์ตามยอด — PNG เพราะแอปธนาคาร "สแกนจากรูป" อ่าน SVG ไม่ได้
 * และลูกค้าที่สั่งกับโอนบนมือถือเครื่องเดียวกันต้องกดค้างบันทึกรูปได้
 *
 * รับแค่ยอดเงิน เลขพร้อมเพย์อ่านจาก shop_settings เสมอ
 * ให้ผู้เรียกส่งเลขบัญชีมาเองไม่ได้ ไม่งั้นใครก็ทำ QR หน้าตาร้านเราแต่โอนเข้าบัญชีอื่น
 */
export async function GET(req: Request) {
  const amount = Number(new URL(req.url).searchParams.get("amount"));
  if (!Number.isInteger(amount) || amount < 1 || amount > 100_000) {
    return new Response("ยอดเงินไม่ถูกต้อง", { status: 400 });
  }
  const db = shopDb();
  if (!db) return closed();
  const settings = await readSettings(db);
  if (!settings?.promptpay_id) return closed();

  const png = await QRCode.toBuffer(promptpayPayload(settings.promptpay_id, amount), {
    type: "png",
    width: 480,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=600" },
  });
}
