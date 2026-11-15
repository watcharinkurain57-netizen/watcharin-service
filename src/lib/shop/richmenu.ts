/**
 * เมนูไลน์ (Rich menu) ของแต่ละสาขา — หน้าตาตามรูป public/shop/line/richmenu.jpg (2500×843)
 * ซ้าย "สั่งอาหาร" กว้าง 1666 → เปิดหน้าร้านของสาขา · ขวา "ทักแอดมิน" → ส่งข้อความทักร้าน
 * รูปสร้างจาก shop/brand/สคริปต์ริชเมนู.py ในโฟลเดอร์ไฟล์ของโปรเจกต์ (SPLIT ต้องตรงกับในสคริปต์)
 */

export const SITE = "https://watcharin-service.com";
export const RICH_MENU_IMAGE = `${SITE}/shop/line/richmenu.jpg`;

const W = 2500;
const H = 843;
const SPLIT = 1666;

export const ADMIN_TEXT = "ขอสอบถามค่ะ/ครับ";

type Branch = { slug: string; liff_id: string | null };

/** ชื่อเมนูในระบบของไลน์ — ใช้หาเมนูเก่าของสาขาเดียวกันไว้ลบตอนตั้งใหม่ */
export const richMenuName = (slug: string) => `shop-${slug}`;

/** ปุ่มสั่งอาหารเปิดลิงก์ไหน: มี LIFF = ผ่าน LIFF (เติมชื่อจากไลน์ให้) ไม่มี = หน้าร้านของสาขาตรง ๆ */
export function orderLink(b: Branch): string {
  const liff = b.liff_id?.trim();
  return liff ? `https://liff.line.me/${encodeURIComponent(liff)}` : `${SITE}/shop/${b.slug}`;
}

export function richMenuFor(b: Branch) {
  return {
    size: { width: W, height: H },
    selected: true, // เปิดเมนูค้างไว้ตอนเข้าแชท
    name: richMenuName(b.slug),
    chatBarText: "สั่งอาหาร",
    areas: [
      {
        bounds: { x: 0, y: 0, width: SPLIT, height: H },
        action: { type: "uri", label: "สั่งอาหาร", uri: orderLink(b) },
      },
      {
        bounds: { x: SPLIT, y: 0, width: W - SPLIT, height: H },
        action: { type: "message", label: "ทักแอดมิน", text: ADMIN_TEXT },
      },
    ],
  };
}
