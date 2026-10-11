import type { Metadata, Viewport } from "next";
import { ShopOrder } from "./ShopOrder";
import "./shop.css";

export const metadata: Metadata = {
  title: "สั่งแซลดอง กุ้งแช่",
  description: "พรีออเดอร์แซลมอนดอง กุ้งดอง กุ้งแช่น้ำปลา ซาชิมิ สั่งก่อน 19:00 รับของวันถัดไป",
  // ร้านในตึก ลูกค้ามาจากปุ่มในไลน์ร้าน ไม่ต้องให้ค้นเจอ
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * หน้าสั่งอาหารของร้านแซลดอง กุ้งแช่ — เปิดจากปุ่ม Rich Menu ของ LINE OA
 * เลือกเมนู → สแกน QR พร้อมเพย์ (ยอดขึ้นเอง) → กดยืนยัน จบ
 *
 * ไม่ต้องล็อกอิน ตัวตนลูกค้าคือ token ที่มือถือจำไว้ (ดู 0024_shop_orders)
 */
export default function ShopPage() {
  return <ShopOrder />;
}
