/**
 * QR พร้อมเพย์ (มาตรฐาน EMVCo ของ ธปท.) — ใส่ยอดเงินไว้ในตัว
 * ลูกค้าสแกนแล้วยอดขึ้นเอง ไม่ต้องพิมพ์
 *
 * id: เบอร์มือถือ 10 หลัก / เลขบัตรประชาชน 13 หลัก / e-wallet 15 หลัก
 */
function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

/** CRC16-CCITT (0x1021, เริ่ม 0xFFFF) — ค่าตรวจ "123456789" = 29B1 */
export function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function promptpayPayload(id: string, amount?: number): string {
  const digits = id.replace(/\D/g, "");
  const account =
    digits.length >= 15
      ? tlv("03", digits)
      : digits.length >= 13
        ? tlv("02", digits)
        : tlv("01", ("66" + digits.replace(/^0/, "")).padStart(13, "0"));
  let payload =
    tlv("00", "01") +
    tlv("01", amount ? "12" : "11") +
    tlv("29", tlv("00", "A000000677010111") + account) +
    tlv("58", "TH") +
    tlv("53", "764");
  if (amount) payload += tlv("54", amount.toFixed(2));
  payload += "6304";
  return payload + crc16(payload);
}
