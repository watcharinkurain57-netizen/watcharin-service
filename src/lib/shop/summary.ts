/** ข้อความสรุปออร์เดอร์ 19:00 — แยกจาก route เพื่อทดสอบได้ */
export type SummaryItem = { name: string; qty: number };
export type SummaryRow = {
  order_no: string;
  nickname: string;
  pickup_slot: string;
  items: SummaryItem[];
  total: number;
  discount: number;
  payment_checked: boolean;
};

/** branch = ชื่อสาขา (มีหลายสาขา สรุปแยกกัน จะได้ไม่สับสนว่าเป็นของที่ไหน) */
export function buildSummary(label: string, rows: SummaryRow[], branch = ""): string {
  const count = new Map<string, number>();
  let money = 0;
  for (const r of rows) {
    money += r.total;
    for (const i of r.items) count.set(i.name, (count.get(i.name) ?? 0) + i.qty);
  }
  return [
    `📦 สรุปออร์เดอร์${branch ? ` สาขา${branch}` : ""} รับ${label}`,
    `${rows.length} ออร์เดอร์ · ยอดโอนรวม ${money.toLocaleString("th-TH")} บ.`,
    "",
    "ต้องเตรียม",
    ...[...count].map(([name, n]) => `• ${name} ${n} กล่อง`),
    "",
    "เรียงตามเวลารับ",
    ...rows.map(
      (r) =>
        `${r.pickup_slot}  ${r.order_no} ${r.nickname} : ${r.items.map((i) => `${i.name} x${i.qty}`).join(", ")} (${r.total} บ.${r.discount ? " ใช้แต้ม" : ""})`,
    ),
    // จ่ายผ่าน Omise = ระบบเช็กเงินเข้าให้แล้ว เตือนเฉพาะออร์เดอร์ที่ยังไม่ได้เช็ก (QR ของร้านเอง)
    ...(rows.some((r) => !r.payment_checked)
      ? ["", "เทียบยอดเงินเข้ากับแอปธนาคาร ออร์เดอร์ไหนไม่มีเงินเข้า เปลี่ยนสถานะเป็น cancelled"]
      : []),
  ].join("\n");
}

/**
 * ข้อความสำหรับส่งต่อเข้า OpenChat — ไลน์ไม่เปิดให้บอทโพสต์ใน OpenChat เจ้าของร้านจึงกดส่งต่อเอง
 * ไม่มีชื่อลูกค้า ไม่มียอดเงิน มีแค่จำนวนออร์เดอร์และเมนูยอดนิยม ให้เห็นว่ามีคนสั่งจริง
 */
export function buildCommunityPost(label: string, rows: SummaryRow[], shopLine = ""): string {
  const count = new Map<string, number>();
  for (const r of rows) for (const i of r.items) count.set(i.name, (count.get(i.name) ?? 0) + i.qty);
  const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return [
    `📣 ปิดรับรอบรับของ${label} แล้ว`,
    `ขอบคุณ ${rows.length} ออร์เดอร์ค่ะ 🙏`,
    ...(top.length ? ["", "เมนูที่สั่งเยอะสุดรอบนี้", ...top.map(([name, n], k) => `${k + 1}. ${name} (${n} กล่อง)`)] : []),
    "",
    `รอบต่อไปสั่งได้แล้ว ที่ปุ่ม "สั่งอาหาร" ในไลน์ร้าน${shopLine ? ` ${shopLine}` : ""}`,
  ].join("\n");
}

