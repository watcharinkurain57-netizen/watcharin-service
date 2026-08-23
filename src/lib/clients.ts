/**
 * ลูกค้า — ชนิดข้อมูลและตัวช่วย
 *
 * ⚠️ ข้อมูลในนี้เป็นของภายในทั้งหมด เปิดให้แอดมินอ่านคนเดียว (policy ใน 0022)
 * ห้ามเอาไปแสดงในหน้าที่คนนอกหรือลูกค้าเปิดได้ ไม่ว่าจะฟิลด์ไหน
 */

export type Client = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  tax_id: string | null;
  address: string | null;
  note: string | null;
  updated_at: string;
};

export const CLIENT_SELECT =
  "id, name, contact_name, contact_email, contact_phone, tax_id, address, note, updated_at";

/** โปรเจกต์เท่าที่หน้าจัดลูกค้าต้องรู้ — ไม่ต้องลากทั้งแถวมา */
export type ClientProject = {
  id: string;
  slug: string;
  name: string;
  status: "building" | "shipped" | "sunset";
};

export const CLIENT_PROJECT_SELECT = "id, slug, name, status";

export const STATUS_LABEL: Record<ClientProject["status"], string> = {
  building: "กำลังทำ",
  shipped: "ส่งมอบแล้ว",
  sunset: "ปิดโครงการ",
};

/** ฟิลด์ที่แก้ได้ในฟอร์ม — คู่กับชื่อ input ในหน้าจัดลูกค้า */
export const CLIENT_FIELDS: { name: keyof Client; label: string; placeholder?: string }[] = [
  { name: "contact_name", label: "ผู้ติดต่อ", placeholder: "ชื่อคนที่คุยด้วยเป็นหลัก" },
  { name: "contact_email", label: "อีเมล" },
  { name: "contact_phone", label: "เบอร์โทร" },
  { name: "tax_id", label: "เลขผู้เสียภาษี", placeholder: "ใช้ตอนออกใบเสนอราคา" },
];

/**
 * จับโปรเจกต์เข้าลูกค้าที่มันสังกัด
 *
 * `assign` คือความเชื่อมโยงจากตาราง project_clients (project_id -> client_id)
 * คืนถังท้ายของโปรเจกต์ที่ยังไม่ได้จัดด้วยเสมอ ไม่ว่าจะว่างหรือไม่ —
 * ต่างจาก bucketBy ตรงที่หน้านี้ต้องเห็นเสมอว่าเหลืออะไรยังไม่ได้จัด
 * ถ้าซ่อนตอนว่าง คนใช้จะไม่รู้ว่าจัดครบแล้วหรือแค่ไม่มีถังให้ดู
 */
export function groupProjectsByClient(
  projects: ClientProject[],
  clients: Client[],
  assign: Record<string, string>
): { client: Client | null; items: ClientProject[] }[] {
  const known = new Set(clients.map((c) => c.id));

  const buckets = [...clients]
    .sort((a, b) => a.name.localeCompare(b.name, "th"))
    .map((client) => ({
      client: client as Client | null,
      items: projects.filter((p) => assign[p.id] === client.id),
    }));

  // เงื่อนไขที่สอง (ชี้ลูกค้าที่หาไม่เจอ) สำคัญเท่าเงื่อนไขแรก
  // ถ้าเช็คแค่ว่าไม่มีใน assign โปรเจกต์ที่ชี้ลูกค้าซึ่งโหลดมาไม่ครบจะหายไปเงียบ ๆ
  const loose = projects.filter((p) => !assign[p.id] || !known.has(assign[p.id]));
  buckets.push({ client: null, items: loose });

  return buckets;
}
