import { z } from "zod";
import type { Capability } from "@/lib/archive-access";

/**
 * "ร่าง" ที่ผู้ช่วย AI ทำให้ — ประตูเดียวที่ผู้ช่วยใช้เปลี่ยนข้อมูลได้
 *
 * ---------------------------------------------------------------------------
 * ⚠️ ผู้ช่วยไม่มีเครื่องมือที่เขียนฐานข้อมูลตรง ๆ แม้แต่ตัวเดียว โดยตั้งใจ
 *
 * เครื่องมือ propose_* แค่ส่ง "ร่าง" ขึ้นจอเป็นการ์ด แล้วบอกโมเดลว่า
 * "ยังไม่ได้บันทึก รอคนกดยืนยัน" · คนกดยืนยันเมื่อไหร่ หน้าจอค่อยยิง
 * /api/agents/apply ซึ่งตรวจร่างซ้ำด้วย schema ในไฟล์นี้ เช็คสิทธิ์ซ้ำ
 * แล้วเขียนด้วย session ของคนกด (RLS กันอีกชั้น)
 *
 * เหตุผล: ข้อมูลที่ผู้ช่วยอ่านมีข้อความที่คนอื่นพิมพ์ปนอยู่ (ห้องคุยงาน
 * รายละเอียดงาน) ถ้าใครสักคนแอบเขียนคำสั่งไว้ในนั้น อย่างมากที่สุดที่เกิดได้คือ
 * "ร่าง" แปลก ๆ โผล่มาให้เห็น — ไม่มีอะไรถูกบันทึกโดยไม่มีคนเห็นก่อน
 * ---------------------------------------------------------------------------
 *
 * ไฟล์นี้ใช้ทั้งฝั่งเซิร์ฟเวอร์ (ตรวจร่าง) และหน้าจอ (ชนิดข้อมูลของการ์ด)
 * ⚠️ หน้าจอต้อง `import type` จากไฟล์นี้เท่านั้น — import ค่าจริงแม้ตัวเดียว
 * zod ทั้งก้อนจะถูกลากไปอยู่ใน bundle ของเบราว์เซอร์
 */

/** ต้องตรงกับ CHECK ของตารางปลายทาง — ด่านสุดท้ายจริงอยู่ที่ฐานข้อมูล */
export const LIMITS = {
  taskTitle: 200,
  taskNote: 2000,
  tasksPerDraft: 10,
  diagramTitle: 120,
  /** MAX_DIAGRAM_CHARS ใน lib/project-diagrams.ts */
  diagramSource: 20000,
  /** COMMENT_MAX ใน lib/project-comments.ts */
  commentBody: 4000,
} as const;

/**
 * วันที่ต้องมีอยู่จริงบนปฏิทิน — เทียบไป-กลับ ไม่ใช่แค่ดูว่า Date แปลงได้
 * เพราะ `new Date("2026-02-30")` ไม่ error แต่ปัดเป็น 2 มี.ค. เงียบ ๆ
 */
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็นรูปแบบ YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "วันที่นี้ไม่มีอยู่จริงบนปฏิทิน");

const nonBlank = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "ห้ามว่าง")
    .max(max, `ยาวได้ไม่เกิน ${max} ตัวอักษร`);

export const DraftTask = z.object({
  title: nonBlank(LIMITS.taskTitle),
  due_on: isoDate.optional(),
  assignee_id: z.uuid().optional(),
  /** ชื่อคนรับงานไว้โชว์บนการ์ด — ตอนบันทึกใช้ assignee_id อย่างเดียว */
  assignee_name: z.string().max(120).optional(),
  note: z.string().trim().max(LIMITS.taskNote).optional(),
});

export const CreateTasksPayload = z.object({
  tasks: z.array(DraftTask).min(1).max(LIMITS.tasksPerDraft),
});

export const CreateDiagramPayload = z.object({
  title: nonBlank(LIMITS.diagramTitle),
  source: nonBlank(LIMITS.diagramSource),
});

export const PostCommentPayload = z.object({
  body: nonBlank(LIMITS.commentBody),
});

export type DraftTask = z.infer<typeof DraftTask>;
export type CreateTasksPayload = z.infer<typeof CreateTasksPayload>;
export type CreateDiagramPayload = z.infer<typeof CreateDiagramPayload>;
export type PostCommentPayload = z.infer<typeof PostCommentPayload>;

export type ProposalKind = "create_tasks" | "create_diagram" | "post_comment";

type ProposalOf<K extends ProposalKind, P> = {
  id: string;
  kind: K;
  /** ประโยคเดียวบนหัวการ์ด เช่น "เพิ่มงาน 3 รายการ" */
  summary: string;
  payload: P;
};

export type Proposal =
  | ProposalOf<"create_tasks", CreateTasksPayload>
  | ProposalOf<"create_diagram", CreateDiagramPayload>
  | ProposalOf<"post_comment", PostCommentPayload>;

/**
 * ร่างก่อนมี id — harness เป็นคนออก id ให้ตอนส่งขึ้นจอ
 * (Omit ทีละชนิดใน union — Omit ตรง ๆ ทั้ง union จะทำให้ kind กับ payload หลุดคู่กัน)
 */
type WithoutId<P> = P extends unknown ? Omit<P, "id"> : never;
export type ProposalDraft = WithoutId<Proposal>;

export const PAYLOAD_SCHEMA = {
  create_tasks: CreateTasksPayload,
  create_diagram: CreateDiagramPayload,
  post_comment: PostCommentPayload,
} as const;

/** สิทธิ์ที่คนกดยืนยันต้องมี — เช็คซ้ำตอนบันทึก ไม่ใช่แค่ตอนร่าง */
export const APPLY_NEED: Record<ProposalKind, Capability> = {
  create_tasks: "project.tasks.manage",
  create_diagram: "project.diagrams.manage",
  post_comment: "project.comments.post",
};

/**
 * บรรทัดแรกของ mermaid ต้องขึ้นต้นด้วยชนิดผังที่รู้จัก
 *
 * ตรวจแค่นี้พอ — ตัวแปลง mermaid ตัวจริงหนักและรันฝั่งเบราว์เซอร์
 * การ์ดร่างจะวาดตัวอย่างให้ดูก่อนกดบันทึกอยู่แล้ว ถ้าเขียนผิดจะเห็นตรงนั้น
 */
const MERMAID_KINDS =
  /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|journey|gantt|pie|mindmap|timeline|quadrantChart|requirementDiagram|gitGraph|C4Context|C4Container|C4Component|block-beta|architecture-beta|kanban|sankey-beta|xychart-beta)\b/;

export function looksLikeMermaid(source: string): boolean {
  const first = source
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l !== "" && !l.startsWith("%%"));
  return !!first && MERMAID_KINDS.test(first);
}
