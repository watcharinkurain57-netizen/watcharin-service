/**
 * รูปที่ขึ้นตอนแชร์ลิงก์ของทั้งเว็บ — ตัวรูปวาดใน src/app/opengraph-image.tsx
 *
 * ⚠️ หน้าที่ประกาศ openGraph ของตัวเองต้องใส่ `images: [SHARE_IMAGE]` ด้วย
 * Next เอา openGraph ของหน้าไปแทนของ layout ทั้งก้อน รูปจากไฟล์ opengraph-image จึงหายไปด้วย
 * (หน้าที่ไม่ได้ประกาศเอง เช่น /studio ได้รูปนี้ตามปกติ)
 */
export const SHARE_IMAGE = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: "watcharin-service — ปรึกษา และทำร่วมกันได้",
};
