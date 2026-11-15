import type { Metadata } from "next";
import { shopViewport } from "../meta";
import { ShopAdmin } from "./ShopAdmin";
import "../shop.css";
import "./admin.css";

export const metadata: Metadata = {
  title: "หลังบ้าน แซลดอง กุ้งแช่",
  robots: { index: false, follow: false },
};
export const viewport = shopViewport;

/**
 * หลังบ้านร้าน: ออร์เดอร์ ยอดขาย เมนู ลูกค้า สาขา
 * เข้าด้วยลิงก์ที่ระบบส่งไปที่ไลน์ร้าน (ดู /api/shop/admin/login) — ข้อมูลทั้งหมดโหลดหลังเข้าระบบแล้ว
 * ชื่อ "admin" ชนะ /shop/[branch] เพราะเป็นเส้นทางตายตัว
 */
export default function ShopAdminPage() {
  return <ShopAdmin />;
}
