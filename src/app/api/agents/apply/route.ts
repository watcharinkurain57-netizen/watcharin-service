import { z } from "zod";
import { can } from "@/lib/archive-access";
import { agentAccess } from "@/lib/agents/access.server";
import { ApplyError, applyProposal } from "@/lib/agents/apply.server";
import { APPLY_NEED, PAYLOAD_SCHEMA } from "@/lib/agents/proposals";

/**
 * บันทึก "ร่าง" ที่ผู้ช่วยทำไว้ หลังคนกดยืนยันบนการ์ด
 *
 * ⚠️ ร่างถูกส่งกลับมาจากเบราว์เซอร์ — ถือว่าเป็นข้อมูลที่ใครจะแก้มาก็ได้
 * จึงตรวจด้วย schema ชุดเดียวกับตอนร่าง และเช็คสิทธิ์ใหม่ทั้งหมดที่นี่
 * (ต่อให้มีคนยิงเส้นนี้ตรง ๆ ก็ทำได้ไม่เกินที่บัญชีนั้นทำเองจากหน้าเว็บได้อยู่แล้ว)
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  projectId: z.uuid(),
  kind: z.enum(["create_tasks", "create_diagram", "post_comment"]),
  payload: z.unknown(),
});

function reply(status: number, data: Record<string, unknown>) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return reply(400, { error: "คำขอไม่ถูกต้อง" });
  }

  const access = await agentAccess(body.projectId);
  if (!access.ok) return reply(access.status, { error: access.error });

  if (!can(access.viewer, APPLY_NEED[body.kind])) {
    return reply(403, { error: "บัญชีนี้บันทึกร่างชนิดนี้ไม่ได้" });
  }

  const parsed = PAYLOAD_SCHEMA[body.kind].safeParse(body.payload);
  if (!parsed.success) {
    return reply(400, { error: `ร่างไม่ถูกต้อง: ${parsed.error.issues[0]?.message ?? ""}` });
  }

  try {
    const message = await applyProposal(
      { db: access.db, projectId: body.projectId },
      body.kind,
      parsed.data
    );
    return reply(200, { ok: true, message });
  } catch (e) {
    if (e instanceof ApplyError) return reply(400, { error: e.message });
    console.error("[agents] apply crashed:", e);
    return reply(500, { error: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง" });
  }
}
