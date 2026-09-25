import { z } from "zod";
import { can } from "@/lib/archive-access";
import { agentAccess, envNumber } from "@/lib/agents/access.server";
import { DEFAULT_MODEL, runAgentSession } from "@/lib/agents/harness";
import { MAX_TURNS, MAX_TURN_CHARS, type AgentEvent } from "@/lib/agents/protocol";
import { ROLES, roleOf, type RoleId } from "@/lib/agents/roles";

/**
 * ให้ผู้ช่วย AI ทำงานหนึ่งรอบ — ตอบกลับเป็นสตรีม NDJSON (ดู lib/agents/protocol.ts)
 *
 * ด่านที่คำขอต้องผ่านตามลำดับ:
 *   1) เซิร์ฟเวอร์ตั้ง ANTHROPIC_API_KEY แล้ว   ไม่ตั้ง = ปิดทั้งเส้น (503) ไม่ใช่เปิดทิ้ง
 *   2) รูปของคำขอถูกต้อง และบทสนทนาไม่ยาวเกินเพดาน
 *   3) ล็อกอินแล้ว เป็นคนในโปรเจกต์ และมี project.agents.use
 *   4) มีสิทธิ์ใช้บทบาทที่เลือก
 *   5) ยังไม่ชนเพดานรายวัน (นับจากตาราง agent_runs ซึ่งผู้ใช้ลบแถวเองไม่ได้)
 * ผ่านหมดแล้วค่อยเริ่มเรียกโมเดล — ด่านทั้งหมดอยู่ก่อนจุดที่เริ่มเสียเงิน
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * เพดานเวลาของฟังก์ชันบน Vercel (วินาที)
 *
 * 60 ใช้ได้ทุกแพ็กเกจ · ถ้าโปรเจกต์บน Vercel เปิด Fluid Compute อยู่ (ค่าตั้งต้นของ
 * โปรเจกต์ใหม่) ขยายเป็น 300 ได้ ผู้ช่วยจะมีเวลาคิดและมอบงานมากขึ้น
 * ⚠️ ตั้งเกินที่แพ็กเกจยอม Vercel จะ build ไม่ผ่าน — เช็คในหน้า Settings → Functions ก่อน
 * ค่านี้ต้องเป็นตัวเลขตรง ๆ (Next อ่านตอน build) ส่วนเวลาของ harness คิดตามข้างล่างเอง
 */
export const maxDuration = 60;

/** เวลาที่ harness ใช้ได้ — เหลือ 10 วินาทีไว้เขียนบันทึกและปิดสตรีมก่อนถูกตัด */
const DEADLINE_MS = (maxDuration - 10) * 1000;

const ROLE_IDS = ROLES.map((r) => r.id) as [RoleId, ...RoleId[]];

const Body = z.object({
  projectId: z.uuid(),
  role: z.enum(ROLE_IDS),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(MAX_TURN_CHARS),
      })
    )
    .min(1)
    .max(MAX_TURNS),
});

function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return fail(503, "ผู้ช่วย AI ยังไม่ได้ตั้งค่าบนเซิร์ฟเวอร์ (ขาด ANTHROPIC_API_KEY)");
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return fail(400, `คำขอไม่ถูกต้อง หรือบทสนทนายาวเกิน (ไม่เกิน ${MAX_TURNS} ข้อความ ข้อความละ ${MAX_TURN_CHARS} ตัวอักษร) — กดเริ่มบทสนทนาใหม่`);
  }

  const { history } = body;
  if (history[0].role !== "user" || history.at(-1)?.role !== "user" || !history.at(-1)?.text.trim()) {
    return fail(400, "บทสนทนาต้องขึ้นต้นและจบด้วยข้อความของผู้ใช้");
  }

  const access = await agentAccess(body.projectId);
  if (!access.ok) return fail(access.status, access.error);
  const { db, userId, viewer } = access;

  const role = roleOf(body.role);
  if (!role || !can(viewer, role.need)) return fail(403, "บัญชีนี้ใช้ผู้ช่วยบทบาทนี้ไม่ได้");

  const { data: project } = await db.from("projects").select("name").eq("id", body.projectId).maybeSingle();
  if (!project) return fail(404, "ไม่พบโปรเจกต์นี้");

  // ---- เพดานรายวัน ----
  const dailyRuns = envNumber("AGENT_DAILY_RUNS", 40, 1, 10_000);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db
    .from("agent_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if (countError) {
    // ไม่มีตาราง = ยังไม่ได้รัน migration · ปิดไว้ก่อนดีกว่าปล่อยให้ใช้แบบไม่มีเพดาน
    console.error("[agents] cannot read agent_runs:", countError);
    return fail(503, "ผู้ช่วย AI ยังไม่พร้อม — ต้องรัน supabase/migrations/0024_agent_runs.sql ก่อน");
  }
  if ((count ?? 0) >= dailyRuns) {
    return fail(429, `ใช้ผู้ช่วยครบ ${dailyRuns} ครั้งใน 24 ชั่วโมงแล้ว ลองใหม่ภายหลัง`);
  }

  const model = process.env.AGENT_MODEL?.trim() || DEFAULT_MODEL;
  const maxUsd = envNumber("AGENT_MAX_USD_PER_RUN", 1, 0.05, 20);

  // ผู้ใช้กดหยุด/ปิดหน้า → หยุดเรียกโมเดลทันที ไม่จ่ายเงินให้คำตอบที่ไม่มีใครอ่าน
  const stop = new AbortController();
  req.signal.addEventListener("abort", () => stop.abort(), { once: true });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: AgentEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };

      try {
        const result = await runAgentSession({
          role: role.id,
          history,
          projectName: (project as { name: string }).name,
          db,
          projectId: body.projectId,
          userId,
          viewer,
          model,
          deadlineMs: DEADLINE_MS,
          maxUsd,
          emit,
          signal: stop.signal,
        });

        // ---- สมุดบันทึก (metadata อย่างเดียว ไม่มีข้อความที่คุยกัน) ----
        const { error: logError } = await db.from("agent_runs").insert({
          project_id: body.projectId,
          user_id: userId,
          role: role.id,
          status: result.status,
          model,
          iterations: result.usage.steps,
          tool_calls: result.toolCalls.slice(0, 200),
          input_tokens: result.usage.inputTokens,
          output_tokens: result.usage.outputTokens,
          cache_read_tokens: result.usage.cacheReadTokens,
          cache_write_tokens: result.usage.cacheWriteTokens,
          cost_usd: result.usage.costUsd,
          duration_ms: result.usage.durationMs,
          error: result.error ?? null,
        });
        if (logError) console.error("[agents] cannot write agent_runs:", logError);
      } catch (e) {
        console.error("[agents] stream crashed:", e);
        emit({ type: "error", message: "ผู้ช่วยทำงานผิดพลาด ลองใหม่อีกครั้ง" });
      } finally {
        if (open) {
          open = false;
          try {
            controller.close();
          } catch {
            // ปลายทางปิดไปก่อนแล้ว — ไม่มีอะไรต้องทำ
          }
        }
      }
    },
    cancel() {
      stop.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      // บอก proxy ระหว่างทางว่าอย่าเก็บรวมก้อนก่อนส่ง ไม่งั้นข้อความไม่ไหลทีละคำ
      "X-Accel-Buffering": "no",
    },
  });
}
