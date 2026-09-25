import type { Capability } from "@/lib/archive-access";

/**
 * บทบาทของผู้ช่วย AI — ทะเบียนเดียวของทั้งระบบ
 *
 * ---------------------------------------------------------------------------
 * หลักคิดของไฟล์นี้: "บทบาท" คือการตั้งค่า ไม่ใช่โปรแกรมแยก
 *
 * ผู้ช่วยทุกตัววิ่งบน harness ตัวเดียวกัน (src/lib/agents/harness.ts) — ลูปเดียว
 * ตัวเช็คสิทธิ์ชุดเดียว ตัวนับเงินตัวเดียว สิ่งที่ทำให้ "ผู้จัดการงาน" ต่างจาก
 * "ผู้ดูแลการเงิน" มีแค่สามอย่าง:
 *   1) คำสั่งประจำตัว (system prompt · src/lib/agents/prompts.ts)
 *   2) เครื่องมือที่หยิบได้ (`tools` ข้างล่าง · สเปกอยู่ src/lib/agents/specs.ts)
 *   3) สิทธิ์ที่ต้องมีถึงจะใช้บทบาทนี้ได้ (`need`)
 *
 * เพิ่มบทบาทใหม่ = เพิ่มแถวในไฟล์นี้ + คำสั่งใน prompts.ts ไม่ต้องแตะ harness
 * ---------------------------------------------------------------------------
 *
 * ไฟล์นี้ใช้ได้ทั้งฝั่งเบราว์เซอร์และเซิร์ฟเวอร์ (หน้าจอเอาไปทำแถบเลือกบทบาท)
 * จึงไม่มีคำสั่งประจำตัวอยู่ในนี้ — ของพวกนั้นอยู่ฝั่งเซิร์ฟเวอร์อย่างเดียว
 * และตั้งใจไม่ import อะไรตอนรัน (มีแต่ import type) เพื่อให้
 * scripts/audit-agents.ts โหลดตรง ๆ ด้วย node ได้
 */

export type RoleId = "coordinator" | "pm" | "finance" | "architect" | "comms";

/**
 * ความพยายามในการคิดของโมเดล — ตัวคุมหลักระหว่าง "คิดละเอียด" กับ "เร็วและถูก"
 * low พอสำหรับงานแจกงาน/สรุป · medium สำหรับงานที่ต้องวิเคราะห์ข้อมูลจริง
 */
export type Effort = "low" | "medium" | "high";

export type RoleMeta = {
  id: RoleId;
  label: string;
  icon: string;
  /** บรรทัดเดียว บอกว่าบทบาทนี้ช่วยเรื่องอะไร */
  blurb: string;
  /** ต้องมีสิทธิ์นี้ในโปรเจกต์ถึงจะเห็นและใช้บทบาทนี้ได้ */
  need: Capability;
  /** ชื่อเครื่องมือใน specs.ts — harness กรองซ้ำตาม capability ของผู้ใช้อีกชั้น */
  tools: readonly string[];
  effort: Effort;
  /** จำนวนรอบเรียกโมเดลสูงสุดของบทบาทนี้ในหนึ่งคำถาม กันลูปวนไม่รู้จบ */
  maxSteps: number;
  /** ตัวอย่างคำถาม — หน้าจอเปล่าที่ไม่รู้จะพิมพ์อะไรคือหน้าจอที่ไม่มีใครใช้ */
  examples: readonly string[];
};

export const ROLES: readonly RoleMeta[] = [
  {
    id: "coordinator",
    label: "ผู้ประสานงาน",
    icon: "🧭",
    blurb: "รับเรื่องทุกแบบ แล้วแจกให้ผู้ช่วยเฉพาะด้านทำ รวมคำตอบกลับมาให้",
    need: "project.agents.use",
    // เครื่องมือ delegate (มอบงาน) ไม่อยู่ในรายการนี้ — harness สร้างให้เอง
    // เพราะตัวเลือกของมันขึ้นกับว่าผู้ใช้คนนี้ใช้ผู้ช่วยตัวไหนได้บ้าง
    tools: ["get_project_overview"],
    effort: "low",
    maxSteps: 4,
    examples: [
      "สรุปสถานะโปรเจกต์นี้ให้หน่อย ทั้งงานค้างและเรื่องเงิน",
      "สัปดาห์นี้ควรโฟกัสอะไรก่อน",
    ],
  },
  {
    id: "pm",
    label: "ผู้จัดการงาน",
    icon: "📋",
    blurb: "ดูงานค้าง งานเลยกำหนด ใครทำอะไร แตกงานใหญ่เป็นงานย่อยให้",
    need: "project.tasks.view",
    tools: [
      "get_project_overview",
      "list_tasks",
      "get_task",
      "list_members",
      "list_meetings",
      "propose_tasks",
    ],
    effort: "medium",
    maxSteps: 6,
    examples: [
      "งานไหนเลยกำหนดแล้วบ้าง",
      "แตกงาน 'เชื่อมใบสั่งงานกับ ERP' เป็นงานย่อยให้หน่อย",
    ],
  },
  {
    id: "finance",
    label: "ผู้ดูแลการเงิน",
    icon: "💰",
    blurb: "งวดจ่าย ยอดค้างรับ ต้นทุน กำไร และเงินสดในมือ",
    need: "project.invoice.view",
    tools: ["get_project_overview", "get_payments", "get_charges", "get_costs_and_margin"],
    effort: "medium",
    maxSteps: 5,
    examples: ["ลูกค้าจ่ายมาแล้วเท่าไหร่ เหลืออีกเท่าไหร่", "โปรเจกต์นี้กำไรกี่เปอร์เซ็นต์"],
  },
  {
    id: "architect",
    label: "สถาปนิกระบบ",
    icon: "🏗️",
    blurb: "อธิบายผังระบบที่มีอยู่ และร่างผังใหม่เป็น mermaid ให้",
    need: "project.diagrams.view",
    tools: ["get_project_overview", "list_diagrams", "get_diagram", "list_tasks", "propose_diagram"],
    effort: "medium",
    maxSteps: 6,
    examples: ["อธิบายผังที่มีอยู่ให้ฟังหน่อย", "วาดผังการไหลของข้อมูลจากงานที่มีอยู่"],
  },
  {
    id: "comms",
    label: "ผู้ช่วยสื่อสาร",
    icon: "💬",
    blurb: "สรุปห้องคุยงาน ดูนัดประชุม ร่างข้อความตอบลูกค้า",
    need: "project.comments.view",
    tools: ["get_project_overview", "read_chat", "list_meetings", "list_members", "propose_chat_message"],
    effort: "medium",
    maxSteps: 5,
    examples: ["สรุปห้องคุยงานสัปดาห์นี้", "ร่างข้อความแจ้งลูกค้าเรื่องนัดประชุมครั้งหน้า"],
  },
];

export function roleOf(id: string): RoleMeta | undefined {
  return ROLES.find((r) => r.id === id);
}

/** ผู้ช่วยเฉพาะด้าน = ทุกบทบาทยกเว้นผู้ประสานงาน (คนที่ผู้ประสานงานแจกงานให้ได้) */
export function isSpecialist(r: RoleMeta): boolean {
  return r.id !== "coordinator";
}

/**
 * บทบาทที่ผู้ใช้คนนี้ใช้ได้ — รับฟังก์ชันเช็คสิทธิ์เข้ามาแทนการ import `can`
 * เพื่อให้ไฟล์นี้ไม่ต้องพึ่งไฟล์อื่นตอนรัน (ดูหัวไฟล์)
 *
 * ต้องมี project.agents.use ก่อนเสมอ ไม่งั้นไม่ได้สักบทบาท
 */
export function rolesFor(allowed: (cap: Capability) => boolean): RoleMeta[] {
  if (!allowed("project.agents.use")) return [];
  return ROLES.filter((r) => allowed(r.need));
}
