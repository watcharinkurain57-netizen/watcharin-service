import { shopMetadata, shopViewport } from "./meta";
import { ShopOrder } from "./ShopOrder";
import "./shop.css";

export const metadata = shopMetadata;
export const viewport = shopViewport;

/**
 * หน้าสั่งอาหารของร้านแซลดอง กุ้งแช่ — ไม่ระบุสาขา
 * มีสาขาเดียว = เปิดสาขานั้นเลย · หลายสาขา = ให้เลือกสาขา
 * ปกติลูกค้าเข้า /shop/<สาขา> จากปุ่ม "สั่งอาหาร" ในไลน์ของสาขานั้น
 *
 * ไม่ต้องล็อกอิน ตัวตนลูกค้าคือ token ที่มือถือจำไว้ (ดู 0024_shop_orders)
 */
export default function ShopPage() {
  return <ShopOrder />;
}
