import { lineChannels, lineCustomer, readLineToken, verifyLineUser } from "@/lib/shop/line-user.server";
import { closed, readToken, shopDb } from "@/lib/shop/shop.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

/**
 * หน้าร้านเปิดจากปุ่มในไลน์ (LIFF) — เรียกตอนเปิดหน้า เพื่อหาบัตรลูกค้าของบัญชีไลน์นี้
 * header: x-line-token (access token จาก LIFF) · x-shop-token (บัตรที่มือถือจำไว้ ถ้ามี)
 *
 * ตอบ { line: false } = เช็กกับไลน์ไม่ผ่าน → หน้าร้านใช้แบบเดิม (มือถือจำ)
 * ตอบ { line: true, name, customer, token }
 *   name     = ชื่อที่แสดงในไลน์ (เติมช่องชื่อเล่นให้ลูกค้าใหม่)
 *   customer = บัตรของไลน์นี้ (null = ยังไม่เคยสั่ง จะผูกตอนสั่งครั้งแรก)
 *   token    = รหัสบัตรให้มือถือจำแทนของเดิม (เปลี่ยนมือถือก็ได้บัตรเดิมกลับมา)
 */
export async function POST(req: Request) {
  const db = shopDb();
  if (!db) return closed();
  const user = await verifyLineUser(readLineToken(req), await lineChannels(db));
  if (!user) return Response.json({ line: false }, NO_STORE);

  try {
    const customer = await lineCustomer(db, user.uid, readToken(req));
    return Response.json(
      {
        line: true,
        name: user.name,
        customer: customer ? { code: customer.code, nickname: customer.nickname, points: customer.points } : null,
        token: customer?.token ?? null,
      },
      NO_STORE,
    );
  } catch (e) {
    console.error("[shop] line customer:", (e as Error).message);
    return Response.json({ line: false }, NO_STORE);
  }
}
