import { shopMetadata, shopViewport } from "../meta";
import { ShopOrder } from "../ShopOrder";
import "../shop.css";

export const metadata = shopMetadata;
export const viewport = shopViewport;

type Props = { params: Promise<{ branch: string }> };

/**
 * หน้าร้านของสาขา — เปิดจากปุ่ม "สั่งอาหาร" ในไลน์ร้านของสาขานั้น (แต่ละสาขามี LINE OA ของตัวเอง)
 * เมนู เวลาปิดรับ วันเปิด รอบรับของ โหลดตามสาขาจาก /api/shop/config?branch=<slug>
 */
export default async function ShopBranchPage({ params }: Props) {
  const { branch } = await params;
  return <ShopOrder branch={branch} />;
}
