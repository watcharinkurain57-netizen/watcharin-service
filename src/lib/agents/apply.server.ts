import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateDiagramPayload, CreateTasksPayload, PostCommentPayload, ProposalKind } from "./proposals";

/**
 * บันทึก "ร่าง" ของผู้ช่วยหลังคนกดยืนยัน — ขั้นเดียวที่ข้อมูลเปลี่ยนจริง
 *
 * ฝั่งที่เรียก (/api/agents/apply) ตรวจร่างด้วย schema และเช็คสิทธิ์มาแล้ว
 * ไฟล์นี้แค่เขียนด้วย `db` ที่เป็น session ของคนกด — RLS กันเป็นด่านสุดท้าย
 * ค่าที่เขียนเลียนแบบปุ่มเพิ่มของแต่ละแท็บ (ลำดับต่อท้าย คอลัมน์แรก ฯลฯ)
 * ของที่ผู้ช่วยสร้างจึงหน้าตาเหมือนของที่คนเพิ่มเองทุกอย่าง
 */

export class ApplyError extends Error {}

type Ctx = { db: SupabaseClient; projectId: string };

/** รหัสของ Postgres ที่แปลว่า RLS ไม่ยอม */
function friendly(error: { code?: string; message: string }, action: string): ApplyError {
  if (error.code === "42501") return new ApplyError(`${action}ไม่ได้ — บัญชีนี้ไม่มีสิทธิ์`);
  console.error(`[agents] apply ${action} failed:`, error);
  return new ApplyError(`${action}ไม่สำเร็จ ลองใหม่อีกครั้ง`);
}

async function nextSort(ctx: Ctx, table: string): Promise<number> {
  const { data } = await ctx.db
    .from(table)
    .select("sort")
    .eq("project_id", ctx.projectId)
    .order("sort", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ((data as { sort: number } | null)?.sort ?? 0) + 1;
}

async function createTasks(ctx: Ctx, p: CreateTasksPayload): Promise<string> {
  const { data: cols, error } = await ctx.db
    .from("project_task_columns")
    .select("id, is_done, sort")
    .eq("project_id", ctx.projectId)
    .order("sort");
  if (error) throw friendly(error, "อ่านคอลัมน์งาน");

  // ลงคอลัมน์แรกที่ยังไม่ใช่ "เสร็จแล้ว" — เหมือนปุ่มเพิ่มงานในแท็บงาน
  const columns = (cols ?? []) as { id: string; is_done: boolean }[];
  const column = columns.find((c) => !c.is_done) ?? columns[0];
  if (!column) throw new ApplyError("โปรเจกต์นี้ยังไม่มีคอลัมน์งาน สร้างคอลัมน์ในแท็บงานก่อน");

  let sort = await nextSort(ctx, "project_tasks");
  const rows = p.tasks.map((t) => ({
    project_id: ctx.projectId,
    column_id: column.id,
    title: t.title,
    due_on: t.due_on ?? null,
    assignee_id: t.assignee_id ?? null,
    description: t.note ?? null,
    sort: sort++,
  }));

  const { error: e } = await ctx.db.from("project_tasks").insert(rows);
  if (e) throw friendly(e, "เพิ่มงาน");
  return `เพิ่มงาน ${rows.length} รายการแล้ว — ดูได้ที่แท็บงาน`;
}

async function createDiagram(ctx: Ctx, p: CreateDiagramPayload): Promise<string> {
  const { error } = await ctx.db.from("project_diagrams").insert({
    project_id: ctx.projectId,
    title: p.title,
    source: p.source,
    group_id: null,
    sort: await nextSort(ctx, "project_diagrams"),
  });
  if (error) throw friendly(error, "บันทึกผัง");
  return `บันทึกผัง “${p.title}” แล้ว — ดูได้ที่แท็บไดอะแกรม`;
}

async function postComment(ctx: Ctx, p: PostCommentPayload): Promise<string> {
  // author_id ไม่ต้องส่ง — ค่าตั้งต้นของคอลัมน์คือ auth.uid() และ policy บังคับให้ตรงอยู่แล้ว
  const { error } = await ctx.db.from("project_comments").insert({ project_id: ctx.projectId, body: p.body });
  if (error) throw friendly(error, "ส่งข้อความ");
  return "ส่งข้อความในห้องคุยงานแล้ว";
}

export async function applyProposal(
  ctx: Ctx,
  kind: ProposalKind,
  payload: CreateTasksPayload | CreateDiagramPayload | PostCommentPayload
): Promise<string> {
  switch (kind) {
    case "create_tasks":
      return createTasks(ctx, payload as CreateTasksPayload);
    case "create_diagram":
      return createDiagram(ctx, payload as CreateDiagramPayload);
    case "post_comment":
      return postComment(ctx, payload as PostCommentPayload);
  }
}
