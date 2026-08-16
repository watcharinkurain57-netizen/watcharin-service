/**
 * สิทธิ์การมองเห็นในคลังโปรเจกต์
 *
 * วันนี้มีสองบทบาท: เจ้าของ กับ คนทั่วไป
 * แต่ตั้งใจเขียนให้เพิ่มบทบาทที่สามได้โดยไม่ต้องไล่แก้หน้าจอ
 *
 * ⚠️ บทเรียนจาก tang-tee: ตอนนั้นผ่อนสิทธิ์ที่ฐานข้อมูลให้ collaborator แล้ว
 * แต่หน้าเว็บยังเช็ค `isOwner` อยู่ เลยยังกดไม่ได้ ต้องตามแก้ทีหลัง
 * เพราะ `isOwner` แบบจริง/เท็จมันกระจายอยู่ทั่วโค้ด
 *
 * กฎของไฟล์นี้:
 *   ✅ ถามว่า "ทำสิ่งนี้ได้ไหม"  → can(viewer, "project.finance.view")
 *   ❌ อย่าถามว่า "เป็นเจ้าของไหม" → viewer.role === "owner" && ...
 *
 * เพิ่มบทบาทใหม่ = เพิ่มบรรทัดใน CAPABILITIES ที่เดียว
 */

/**
 * public = ยังไม่ล็อกอิน หรือล็อกอินแล้วแต่ไม่ได้อยู่ในโปรเจกต์นี้
 * client = ลูกค้าที่ล็อกอินแล้วและเป็นคนในโปรเจกต์นี้
 * owner  = เจ้าของโปรเจกต์
 *
 * หมายเหตุ: client เห็นหน้าตาแบบเดียวกับ public ไม่ใช่ "มุมมองที่สาม"
 * ต่างกันที่เห็นไฟล์ส่งมอบของตัวเองได้ และมีรายการ "โปรเจกต์ของฉัน"
 */
export type ViewerRole = "public" | "client" | "owner";

export type Capability =
  | "project.view"
  | "project.progress.view"
  | "project.tasks.view"
  | "project.finance.view"
  | "project.files.view"
  | "project.members.view";

const PUBLIC_CAPS: Capability[] = ["project.view", "project.progress.view"];

const CAPABILITIES: Record<ViewerRole, readonly Capability[]> = {
  // ความคืบหน้าเปิดให้ทุกคนเห็นตั้งใจ — มันคือหลักฐานว่างานเดินอยู่จริง
  public: PUBLIC_CAPS,

  // ลูกค้าเห็นงานของตัวเองได้เกือบหมด ยกเว้นเรื่องเงินฝั่งเรา
  client: [...PUBLIC_CAPS, "project.tasks.view", "project.files.view", "project.members.view"],

  owner: [
    ...PUBLIC_CAPS,
    "project.tasks.view",
    "project.finance.view",
    "project.files.view",
    "project.members.view",
  ],
};

export type Viewer = { role: ViewerRole };

export function can(viewer: Viewer, capability: Capability): boolean {
  return CAPABILITIES[viewer.role].includes(capability);
}

/**
 * ยังไม่มีระบบล็อกอิน ทุกคนจึงเป็น "คนทั่วไป"
 *
 * พอทำล็อกอินแล้ว ที่ต้องแก้คือฟังก์ชันนี้ฟังก์ชันเดียว:
 * อ่าน session แล้วเทียบกับตาราง project_members(project_id, user_id, role)
 * — หน้าจอทุกหน้าที่เรียก can() ไม่ต้องแก้อะไรเลย
 *
 * ต้องรับ projectId ด้วยตอนนั้น เพราะคนคนเดียวกันเป็น client ในโปรเจกต์หนึ่ง
 * แต่เป็น public ในอีกโปรเจกต์หนึ่งได้
 */
export function getViewer(): Viewer {
  return { role: "public" };
}
