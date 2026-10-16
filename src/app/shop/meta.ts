import type { Metadata, Viewport } from "next";

export const shopMetadata: Metadata = {
  title: "สั่งแซลดอง กุ้งแช่",
  description: "พรีออเดอร์แซลมอนดอง กุ้งดอง กุ้งแช่น้ำปลา ซาชิมิ สั่งล่วงหน้า รับของวันถัดไป",
  // ร้านในตึก ลูกค้ามาจากปุ่มในไลน์ร้าน ไม่ต้องให้ค้นเจอ
  robots: { index: false, follow: false },
};

export const shopViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
