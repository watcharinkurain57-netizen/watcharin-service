import { UUID_RE, adminGuard, badRequest, json } from "@/lib/shop/admin.server";

/**
 * POST /api/shop/admin/menu/image?id=<เมนู> — body = ไฟล์รูป (หน้าหลังบ้านย่อเป็น JPEG ไม่เกิน 1200px ก่อนส่ง)
 * เก็บใน Storage bucket "shop-menu" (public, 0025) แล้วใส่ลิงก์ใน shop_menu.image_url · ลบรูปเก่าของเมนูนั้นทิ้ง
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "shop-menu";
const MAX = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** ไฟล์เป็นรูปตามที่บอกจริงไหม (ดูไบต์แรก ๆ) */
function looksLike(type: string, b: Uint8Array): boolean {
  if (type === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (type === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  // RIFF....WEBP
  return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
}

export async function POST(req: Request) {
  const g = await adminGuard(req);
  if (g instanceof Response) return g;
  const { db } = g;
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!UUID_RE.test(id)) return badRequest("ข้อมูลไม่ถูกต้อง");
  const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return badRequest("ใช้ได้เฉพาะรูป JPG PNG หรือ WEBP");
  if (Number(req.headers.get("content-length") ?? 0) > MAX) return json({ error: "รูปใหญ่เกิน 2 MB" }, 413);
  const bytes = new Uint8Array(await req.arrayBuffer());
  if (!bytes.byteLength) return badRequest("ไม่มีรูป");
  if (bytes.byteLength > MAX) return json({ error: "รูปใหญ่เกิน 2 MB" }, 413);
  if (!looksLike(type, bytes)) return badRequest("ไฟล์นี้ไม่ใช่รูป");

  const { data: item } = await db.from("shop_menu").select("id, image_url").eq("id", id).maybeSingle();
  if (!item) return json({ error: "ไม่พบเมนูนี้" }, 404);

  const path = `menu/${id}-${Date.now()}.${ext}`;
  const store = db.storage.from(BUCKET);
  const { error: upError } = await store.upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
  if (upError) {
    console.error("[shop] admin menu image upload:", upError.message);
    return json({ error: "อัปโหลดรูปไม่สำเร็จ" }, 502);
  }
  const url = store.getPublicUrl(path).data.publicUrl;
  const { error } = await db.from("shop_menu").update({ image_url: url }).eq("id", id);
  if (error) {
    console.error("[shop] admin menu image save:", error.message);
    await store.remove([path]);
    return json({ error: "บันทึกรูปไม่สำเร็จ" }, 500);
  }
  // รูปเก่าที่หลังบ้านเคยอัปโหลด (รูปในโค้ดเว็บ /shop/menu/… ไม่ยุ่ง)
  const old = String(item.image_url ?? "").split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (old?.startsWith("menu/")) await store.remove([decodeURIComponent(old)]);
  return json({ image_url: url });
}
