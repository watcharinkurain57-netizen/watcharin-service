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
  /** สาขาส่งถึงที่เท่านั้น — สาขารับเองเป็น "" */
  delivery_address?: string;
  delivery_phone?: string;
  /** "lat,lng" ถ้าลูกค้ากดใช้ตำแหน่ง */
  delivery_map?: string;
};

/** 0812345678 → 081-234-5678 · 021234567 → 02-123-4567 */
export function formatPhone(p: string): string {
  if (/^0[0-9]{9}$/.test(p)) return `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}`;
  if (/^0[0-9]{8}$/.test(p)) return `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}`;
  return p;
}

/** "lat,lng" → ลิงก์เปิด Google Maps (ในมือถือเปิดแอปแผนที่) */
export function mapLink(pin: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(pin).replace(/%2C/gi, ",")}`;
}

/** ที่อยู่ เบอร์ แผนที่ ใต้บรรทัดออร์เดอร์ — เฉพาะออร์เดอร์ที่มีที่อยู่ */
function deliveryLines(r: SummaryRow, indent = "   "): string[] {
  if (!r.delivery_address) return [];
  return [
    `${indent}📍 ${r.delivery_address}`,
    ...(r.delivery_phone ? [`${indent}📞 ${formatPhone(r.delivery_phone)}`] : []),
    ...(r.delivery_map ? [`${indent}🗺 ${mapLink(r.delivery_map)}`] : []),
  ];
}

/**
 * แจ้งออร์เดอร์ใหม่ทีละออร์เดอร์ (สาขาที่เปิด notify_orders) — สั้นพออ่านจากแจ้งเตือนไลน์
 * label = วันรับ/ส่ง เช่น "วันพุธ 21 ต.ค."
 */
export function buildOrderNotice(r: SummaryRow, label: string, branch: string, delivery = false): string {
  const verb = delivery ? "ส่ง" : "รับ";
  return [
    `${delivery ? "🛵" : "🛍"} ออร์เดอร์ใหม่ สาขา${branch}`,
    `${r.order_no} ${r.nickname}`,
    `${verb}${label} เวลา ${r.pickup_slot}`,
    ...r.items.map((i) => `• ${i.name} x${i.qty}`),
    `ยอด ${r.total.toLocaleString("th-TH")} บ.${r.discount ? " (ใช้แต้ม)" : ""}`,
    ...deliveryLines(r, ""),
    // QR ของร้านเอง = ระบบไม่รู้ว่าเงินเข้าจริงไหม (Omise เช็กให้แล้ว)
    ...(r.total > 0 && !r.payment_checked ? ["", "ลูกค้ากดว่าโอนแล้ว เทียบยอดเงินเข้าในแอปธนาคารก่อน" + verb] : []),
  ].join("\n");
}

/**
 * แบ่งข้อความยาวเป็นหลายข้อความ ตัดที่ขึ้นบรรทัด — ไลน์รับข้อความละไม่เกิน 5,000 ตัว
 * (สาขาส่งถึงที่มีที่อยู่ทุกออร์เดอร์ ข้อความยาวเร็ว)
 */
export function splitText(text: string, max = 4900): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    const piece = line.length > max ? line.slice(0, max) : line;
    if (cur && cur.length + 1 + piece.length > max) {
      out.push(cur);
      cur = piece;
    } else {
      cur = cur ? `${cur}\n${piece}` : piece;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * branch = ชื่อสาขา (มีหลายสาขา สรุปแยกกัน จะได้ไม่สับสนว่าเป็นของที่ไหน)
 * delivery = สาขาส่งถึงที่: "ส่ง" แทน "รับ" และมีที่อยู่ เบอร์ แผนที่ ใต้แต่ละออร์เดอร์
 */
export function buildSummary(label: string, rows: SummaryRow[], branch = "", delivery = false): string {
  const verb = delivery ? "ส่ง" : "รับ";
  const count = new Map<string, number>();
  let money = 0;
  for (const r of rows) {
    money += r.total;
    for (const i of r.items) count.set(i.name, (count.get(i.name) ?? 0) + i.qty);
  }
  return [
    `📦 สรุปออร์เดอร์${branch ? ` สาขา${branch}` : ""} ${verb}${label}`,
    `${rows.length} ออร์เดอร์ · ยอดโอนรวม ${money.toLocaleString("th-TH")} บ.`,
    "",
    "ต้องเตรียม",
    ...[...count].map(([name, n]) => `• ${name} ${n} กล่อง`),
    "",
    `เรียงตามเวลา${verb}`,
    ...rows.flatMap((r, k) => [
      // ออร์เดอร์ส่งถึงที่มีหลายบรรทัด เว้นบรรทัดคั่นให้อ่านง่าย
      ...(k > 0 && r.delivery_address ? [""] : []),
      `${r.pickup_slot}  ${r.order_no} ${r.nickname} : ${r.items.map((i) => `${i.name} x${i.qty}`).join(", ")} (${r.total} บ.${r.discount ? " ใช้แต้ม" : ""})`,
      ...deliveryLines(r),
    ]),
    // จ่ายผ่าน Omise = ระบบเช็กเงินเข้าให้แล้ว เตือนเฉพาะออร์เดอร์ที่ยังไม่ได้เช็ก (QR ของร้านเอง)
    ...(rows.some((r) => !r.payment_checked)
      ? ["", "เทียบยอดเงินเข้ากับแอปธนาคาร ออร์เดอร์ไหนไม่มีเงินเข้า เปลี่ยนสถานะเป็น cancelled"]
      : []),
  ].join("\n");
}

/**
 * ข้อความสำหรับส่งต่อเข้า OpenChat — ไลน์ไม่เปิดให้บอทโพสต์ใน OpenChat เจ้าของร้านจึงกดส่งต่อเอง
 * ไม่มีชื่อลูกค้า ไม่มีที่อยู่ ไม่มียอดเงิน มีแค่จำนวนออร์เดอร์และเมนูยอดนิยม ให้เห็นว่ามีคนสั่งจริง
 */
export function buildCommunityPost(label: string, rows: SummaryRow[], shopLine = "", delivery = false): string {
  const count = new Map<string, number>();
  for (const r of rows) for (const i of r.items) count.set(i.name, (count.get(i.name) ?? 0) + i.qty);
  const top = [...count].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return [
    `📣 ปิดรับรอบ${delivery ? "ส่ง" : "รับของ"}${label} แล้ว`,
    `ขอบคุณ ${rows.length} ออร์เดอร์ค่ะ 🙏`,
    ...(top.length ? ["", "เมนูที่สั่งเยอะสุดรอบนี้", ...top.map(([name, n], k) => `${k + 1}. ${name} (${n} กล่อง)`)] : []),
    "",
    `รอบต่อไปสั่งได้แล้ว ที่ปุ่ม "สั่งอาหาร" ในไลน์ร้าน${shopLine ? ` ${shopLine}` : ""}`,
  ].join("\n");
}

