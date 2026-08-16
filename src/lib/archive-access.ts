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

export type ViewerRole = "public" | "owner";

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
 */
export function getViewer(): Viewer {
  return { role: "public" };
}
