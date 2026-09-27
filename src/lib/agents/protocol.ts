import type { Proposal } from "./proposals";
import type { RoleId } from "./roles";

/**
 * สัญญาระหว่าง /api/agents/run กับหน้าจอ — ใช้ร่วมกันสองฝั่ง
 *
 * คำตอบของเส้นนั้นเป็น NDJSON: บรรทัดละหนึ่ง JSON ส่งทยอยมาเรื่อย ๆ
 * เลือกแบบนี้แทน SSE เพราะคำขอเป็น POST (ต้องส่งประวัติบทสนทนาไปด้วย)
 * ซึ่ง EventSource ของเบราว์เซอร์ทำไม่ได้ ส่วน fetch + อ่านทีละบรรทัดทำได้ทุกที่
 */

/** ประวัติบทสนทนาที่หน้าจอส่งมา — เก็บแค่ข้อความ ไม่เก็บการเรียกเครื่องมือของรอบก่อน */
export type ChatTurn = { role: "user" | "assistant"; text: string };

/**
 * เพดานของบทสนทนาหนึ่งสาย — เกินแล้วให้เริ่มสายใหม่ ไม่ตัดของเก่าทิ้งเงียบ ๆ
 * เพราะผู้ช่วยที่ลืมต้นเรื่องไปโดยไม่บอก อันตรายกว่าผู้ช่วยที่บอกว่า "เริ่มใหม่นะ"
 * (ทุกข้อความถูกส่งกลับไปให้โมเดลอ่านใหม่ทุกครั้ง = ยิ่งยาวยิ่งแพง)
 */
export const MAX_TURNS = 24;
export const MAX_TURN_CHARS = 8000;

/** ต้องตรงกับ CHECK ของ agent_runs.status ใน migration 0024 — scripts/audit-agents.ts เทียบให้ */
export const RUN_STATUSES = ["done", "limit", "refused", "error", "aborted"] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  /** ประมาณการ · null = ไม่รู้ราคาของรุ่นที่ใช้ */
  costUsd: number | null;
  /** จำนวนครั้งที่เรียกโมเดล รวมผู้ช่วยทุกตัวในรอบนี้ */
  steps: number;
  durationMs: number;
};

/**
 * `scope` บอกว่าเหตุการณ์นี้เป็นของใคร
 *   null      = ผู้ช่วยตัวที่ผู้ใช้คุยด้วยตรง ๆ
 *   "toolu_…" = ผู้ช่วยเฉพาะด้านที่ถูกมอบงานผ่านการเรียก delegate ครั้งนั้น
 * ต้องแยกด้วย id ของการมอบงาน ไม่ใช่ชื่อบทบาท เพราะผู้ประสานงานมอบงาน
 * ให้บทบาทเดียวกันสองเรื่องพร้อมกันได้ ข้อความสองสายจะได้ไม่ปนกัน
 */
export type Scope = string | null;

export type AgentEvent =
  | { type: "start"; role: RoleId; model: string }
  | { type: "text"; scope: Scope; delta: string }
  | {
      type: "tool";
      scope: Scope;
      id: string;
      name: string;
      label: string;
      status: "start" | "done" | "error";
      /** ผลย่อ ๆ ไว้โชว์ข้างชื่อเครื่องมือ เช่น "12 งาน" */
      note?: string;
    }
  | {
      type: "delegate";
      id: string;
      to: RoleId;
      task: string;
      status: "start" | "done" | "error";
    }
  | { type: "proposal"; proposal: Proposal }
  /** เรื่องที่ผู้ใช้ควรรู้แต่ไม่ใช่ความผิดพลาด เช่น หมดเวลา สรุปจากข้อมูลเท่าที่ได้ */
  | { type: "notice"; message: string }
  | { type: "done"; status: RunStatus; usage: UsageSummary }
  | { type: "error"; message: string };

/**
 * ตัดข้อความที่ไหลมาเป็นบรรทัด — ก้อนที่อ่านได้แต่ละครั้งอาจจบกลางบรรทัด
 * คืนบรรทัดที่ครบแล้ว กับเศษที่ต้องรอก้อนถัดไปมาต่อ
 */
export function splitLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  return { lines: parts.filter((l) => l.trim() !== ""), rest };
}
