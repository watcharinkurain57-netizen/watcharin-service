import type { Metadata } from "next";
import { OperatorTablet } from "@/components/coresync/OperatorTablet";
import "./operator.css";

export const metadata: Metadata = {
  title: "แท็บเล็ตคนขับ — CoreSync (โหมดทดลอง)",
  description:
    "หน้าจอคนขับสำหรับโหมดทดลอง — แตะบัตร RFID จากเครื่องอ่าน USB เข้าใช้งาน แล้วเห็นระดับไซโลจากข้อมูลจริงที่ส่งเข้ามา",
  alternates: { canonical: "/coresync/operator" },
  // หน้านี้เปิดจากลิงก์เฉพาะกิจของ session ไม่ใช่หน้าที่ควรถูกค้นเจอ
  robots: { index: false, follow: false },
};

export default function OperatorPage() {
  return (
    <div id="main-content">
      <OperatorTablet />
    </div>
  );
}
