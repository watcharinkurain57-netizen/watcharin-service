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

export function buildSummary(label: string, rows: SummaryRow[]): string {
  const count = new Map<string, number>();
  let money = 0;
  for (const r of rows) {
    money += r.total;
    for (const i of r.items) count.set(i.name, (count.get(i.name) ?? 0) + i.qty);
  }
  return [
    `📦 สรุปออร์เดอร์ รับ${label}`,
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
    "",
    "เทียบยอดเงินเข้ากับแอปธนาคาร ออร์เดอร์ไหนไม่มีเงินเข้า เปลี่ยนสถานะเป็น cancelled",
  ].join("\n");
}

