import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // เวลาที่สร้างเว็บ Preview (ฝังตอน build) — หน้าทดสอบไลน์โชว์ไว้ เจ้าของร้านจะรู้ว่าค่าที่แก้ใน Vercel มีผลกับเว็บนี้หรือยัง
  // เฉพาะ Preview: ตัวจริงไม่ต้องใช้ และไม่อยากให้ค่าที่เปลี่ยนทุกครั้งไปกวนแคชตอน build
  env: process.env.VERCEL_ENV === "preview" ? { SHOP_BUILT_AT: new Date().toISOString() } : {},
};

export default nextConfig;
