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
  /** ตารางงวดจ่ายของโปรเจกต์นี้ — จ่ายแล้วเท่าไหร่ เหลือเท่าไหร่ ครบกำหนดเมื่อไหร่ */
  | "project.invoice.view"
  /** ตัวเลขฝั่งเรา — ต้นทุน กำไร เรทที่คิดจริง คนละเรื่องกับ invoice */
  | "project.finance.view"
  | "project.files.view"
  /** ผังของระบบที่วาดไว้ในโปรเจกต์ — ลูกค้าต้องอ่านได้ เพราะวาดไว้ให้เขาเข้าใจระบบตัวเอง */
  | "project.diagrams.view"
  | "project.members.view"
  /**
   * ห้องคุยงาน — ต่างจาก capability อื่นตรงที่ `post` เปิดให้ลูกค้าด้วย
   * ห้องที่พูดได้ข้างเดียวไม่ใช่ห้องคุย · `moderate` = ลบข้อความของคนอื่น เจ้าของเท่านั้น
   * (ลบข้อความ *ของตัวเอง* ไม่ต้องมี capability ทุกคนทำได้อยู่แล้ว กันที่ policy)
   */
  | "project.comments.view"
  | "project.comments.post"
  | "project.comments.moderate"
  /**
   * สิทธิ์ลงมือทำ — คนละชั้นกับ *.view
   *
   * แยกออกมาเพราะวันหน้าจะมีบทบาทที่ "เห็นแต่แก้ไม่ได้" หรือ
   * "แก้งานได้แต่ยุ่งกับไฟล์ส่งมอบไม่ได้" ซึ่งเป็นคนละเส้นกัน
   */
  | "project.tasks.manage"
  | "project.files.manage"
  | "project.diagrams.manage"
  | "project.members.manage"
  /**
   * แก้ตารางงวดจ่าย — เจ้าของเท่านั้น
   * ⚠️ อย่าสับสนกับ `project.finance.view` ที่เป็นต้นทุน/กำไรฝั่งเรา
   * อันนี้คือยอดที่เรียกเก็บซึ่งลูกค้าเห็นอยู่แล้ว แค่แก้ไม่ได้
   */
  | "project.invoice.manage";

const PUBLIC_CAPS: Capability[] = ["project.view", "project.progress.view"];

const CAPABILITIES: Record<ViewerRole, readonly Capability[]> = {
  // ความคืบหน้าเปิดให้ทุกคนเห็นตั้งใจ — มันคือหลักฐานว่างานเดินอยู่จริง
  public: PUBLIC_CAPS,

  // ลูกค้าเห็นงานและตารางงวดจ่ายของตัวเองได้ แต่ไม่เห็นต้นทุน/กำไรฝั่งเรา
  client: [
    ...PUBLIC_CAPS,
    "project.tasks.view",
    "project.invoice.view",
    "project.files.view",
    "project.diagrams.view",
    "project.members.view",
    // ลูกค้าพิมพ์ได้ด้วย — ไม่ใช่แค่อ่าน
    "project.comments.view",
    "project.comments.post",
  ],

  owner: [
    ...PUBLIC_CAPS,
    "project.tasks.view",
    "project.invoice.view",
    "project.finance.view",
    "project.files.view",
    "project.diagrams.view",
    "project.members.view",
    "project.comments.view",
    "project.comments.post",
    "project.comments.moderate",
    "project.tasks.manage",
    "project.files.manage",
    "project.diagrams.manage",
    "project.members.manage",
    "project.invoice.manage",
  ],
};

export type Viewer = { role: ViewerRole };

export function can(viewer: Viewer, capability: Capability): boolean {
  return CAPABILITIES[viewer.role].includes(capability);
}

/**
 * ผู้ชมที่ยังไม่รู้ว่าเป็นใคร
 *
 * ใช้กับหน้าที่เรนเดอร์ล่วงหน้า (static) ซึ่งตอนสร้างหน้ายังไม่มี request
 * จึงไม่มีทางรู้ว่าใครจะเปิด — หน้าพวกนี้จึงแสดงได้แค่ข้อมูลสาธารณะ
 *
 * ถ้าต้องรู้ว่าใครเปิดจริง ๆ ให้ใช้ getViewer() ใน archive-access.server.ts
 * แต่ต้องยอมแลกกับการที่หน้านั้นกลายเป็น dynamic
 */
export const PUBLIC_VIEWER: Viewer = { role: "public" };
