import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { can, type Viewer } from "@/lib/archive-access";
import { costUsd } from "./pricing";
import { systemPrompt } from "./prompts";
import type { AgentEvent, ChatTurn, RunStatus, Scope, UsageSummary } from "./protocol";
import type { ProposalDraft } from "./proposals";
import { isSpecialist, roleOf, rolesFor, type RoleId, type RoleMeta } from "./roles";
import { DELEGATE_TOOL, TOOL_SPECS, exposedTools, toInputSchema } from "./specs";
import { TOOL_IMPLS, ToolError, bangkokDate, type ToolContext, type ToolOutput } from "./tools.server";

/**
 * Harness ของผู้ช่วย AI — "โครงที่ห่อโมเดล"
 *
 * ---------------------------------------------------------------------------
 * โมเดลภาษาทำได้อย่างเดียวคือ รับข้อความ → ตอบข้อความ (หรือตอบว่า "ขอเรียกเครื่องมือ X")
 * ทุกอย่างที่เหลือที่ทำให้มันกลายเป็น "เอเจนต์" อยู่ในไฟล์นี้:
 *
 *   1) ลูป        เรียกโมเดล → ถ้าขอเครื่องมือ รันให้ → ส่งผลกลับ → วนจนมันตอบจบ
 *   2) เครื่องมือ  ยื่นให้โมเดลเฉพาะตัวที่บทบาทนั้นมี และผู้ใช้คนนั้นมีสิทธิ์
 *   3) รั้วกั้น    จำกัดจำนวนรอบ เวลา และเงินต่อคำถาม · ตรวจ input ทุกครั้ง
 *                 · การเขียนทุกอย่างเป็นแค่ "ร่าง" ให้คนกดยืนยัน
 *   4) มอบงาน     ผู้ประสานงานเรียกผู้ช่วยเฉพาะด้านเป็น "เครื่องมือ" ได้ (delegate)
 *                 ผู้ช่วยที่ถูกมอบงานวิ่งในลูปเดียวกันนี้ แต่มีบริบทของตัวเองแยกขาด
 *   5) บันทึก     นับ token เงิน และเครื่องมือที่ถูกเรียก ส่งให้ route เขียนลง agent_runs
 *
 * เลือกเขียนลูปเอง (manual loop) แทน Tool Runner ของ SDK เพราะต้องแทรกของเหล่านี้
 * ระหว่างรอบ: ตัดเวลา/งบ รอบสรุปแบบห้ามเรียกเครื่องมือ และการมอบงานซ้อนลูป
 * ---------------------------------------------------------------------------
 */

export const DEFAULT_MODEL = "claude-opus-5";

/**
 * รุ่นที่เปิด fallbacks: "default" ได้ — ถ้าตัวกรองความปลอดภัยของรุ่นหลักปฏิเสธคำขอ
 * (เช่นเรื่องระบบ/ความปลอดภัยที่ดูคล้ายงานเจาะระบบ) API จะส่งต่อให้รุ่นสำรองที่เหมาะกับ
 * หมวดนั้นตอบแทนในคำขอเดียวกันเอง แทนที่จะคืนคำปฏิเสธมาให้ผู้ใช้
 */
const FALLBACK_MODELS = new Set(["claude-opus-5", "claude-fable-5-1"]);

/** เพดาน token ต่อการเรียกโมเดลหนึ่งครั้ง (รวมส่วนที่โมเดลคิดในใจ) */
const MAX_TOKENS = 16000;
/** ผลของเครื่องมือยาวเกินนี้ถูกตัด พร้อมบอกโมเดลว่าตัด — กันบริบทบวมจนแพง */
const MAX_TOOL_RESULT_CHARS = 20000;
/** ร่างต่อหนึ่งคำถาม — กันโมเดลวนร่างซ้ำจนการ์ดเต็มจอ */
const MAX_PROPOSALS = 6;
/** เวลาเหลือน้อยกว่านี้ → รอบถัดไปเป็นรอบสรุป (ห้ามเรียกเครื่องมือแล้ว) */
const WRAP_UP_MS = 15_000;
/**
 * เวลาที่กันไว้ให้ผู้ประสานงานสรุป หลังผู้ช่วยที่ถูกมอบงานตอบกลับมา
 * ผู้ช่วยเฉพาะด้านจึงมีเส้นตายเร็วกว่าทั้งรอบเท่านี้ — ไม่งั้นมันใช้เวลาจนหมด
 * แล้วผู้ประสานงานไม่มีเวลาเหลือรวมคำตอบ ผู้ใช้ได้ความว่างเปล่ากลับไป
 */
const SYNTH_RESERVE_MS = 12_000;
/** input ของเครื่องมืออ่านไม่ออก (JSON พัง) ขอรอบเดิมใหม่ได้กี่ครั้งติดกัน */
const MAX_JSON_RETRIES = 2;

type ToolCallLog = { agent: RoleId; name: string; ok: boolean };

export type SessionOptions = {
  role: RoleId;
  history: ChatTurn[];
  projectName: string;
  db: SupabaseClient;
  projectId: string;
  userId: string;
  viewer: Viewer;
  model: string;
  /** เวลาทั้งหมดที่รอบนี้ใช้ได้ นับจากตอนเริ่ม */
  deadlineMs: number;
  /** งบต่อคำถาม (ดอลลาร์) — ถึงแล้วสรุปจากข้อมูลที่มี */
  maxUsd: number;
  emit: (event: AgentEvent) => void;
  /** ยกเลิกเมื่อผู้ใช้กดหยุดหรือปิดหน้า */
  signal: AbortSignal;
};

export type SessionResult = {
  status: RunStatus;
  usage: UsageSummary;
  toolCalls: ToolCallLog[];
  /** รายละเอียดทางเทคนิคไว้ลง agent_runs — ไม่ส่งให้หน้าจอ */
  error?: string;
};

/** เครื่องมือที่ผูกกับรอบนี้แล้ว: สเปกที่โมเดลเห็น + ฟังก์ชันที่รันจริง */
type BoundTool = {
  name: string;
  label: string;
  api: Anthropic.Beta.BetaTool;
  run(input: unknown, toolUseId: string): Promise<ToolOutput>;
};

type LoopResult = { text: string; status: "done" | "limit" | "refused" };

/** เส้นตายของลูปหนึ่งตัว — ผู้ช่วยที่ถูกมอบงานได้เส้นตายที่เร็วกว่าทั้งรอบ */
type Limits = { deadline: number; signal: AbortSignal };

/* ============================================================================
 * สถานะร่วมของทั้งรอบ — ผู้ช่วยทุกตัวในรอบเดียวกันใช้นาฬิกา งบ และตัวนับชุดเดียว
 * ========================================================================== */

class Run {
  readonly client = new Anthropic({ maxRetries: 1 });
  readonly startedAt = Date.now();
  readonly deadline: number;
  /** ยกเลิกได้สองทาง: ผู้ใช้กดหยุด หรือหมดเวลา */
  readonly signal: AbortSignal;
  readonly ctx: ToolContext;

  steps = 0;
  tokens = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  cost = 0;
  costKnown = true;
  toolCalls: ToolCallLog[] = [];
  proposals = 0;
  /** ขึ้นประกาศ "สรุปจากข้อมูลเท่าที่มี" ไปแล้วหรือยัง — ขึ้นครั้งเดียวพอ */
  noticedWrapUp = false;

  readonly o: SessionOptions;

  constructor(o: SessionOptions) {
    this.o = o;
    this.deadline = this.startedAt + o.deadlineMs;
    this.signal = AbortSignal.any([o.signal, AbortSignal.timeout(o.deadlineMs)]);

    const now = new Date(this.startedAt);
    this.ctx = {
      db: o.db,
      projectId: o.projectId,
      userId: o.userId,
      viewer: o.viewer,
      now,
      today: bangkokDate(now),
      propose: (draft) => this.propose(draft),
    };
  }

  emit(event: AgentEvent) {
    this.o.emit(event);
  }

  overBudget() {
    return this.cost >= this.o.maxUsd;
  }

  /** หมดเวลาจริง (ไม่ใช่ผู้ใช้กดหยุด) */
  timedOut() {
    return this.signal.aborted && !this.o.signal.aborted;
  }

  record(msg: Anthropic.Beta.BetaMessage) {
    const u = msg.usage;
    const counts = {
      input: u.input_tokens,
      output: u.output_tokens,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
    };
    this.steps += 1;
    this.tokens.input += counts.input;
    this.tokens.output += counts.output;
    this.tokens.cacheRead += counts.cacheRead;
    this.tokens.cacheWrite += counts.cacheWrite;

    // คิดราคาตามรุ่นที่ตอบจริง — ถ้ามี fallback รุ่นที่ตอบอาจไม่ใช่รุ่นที่ขอ
    const dollars = costUsd(msg.model || this.o.model, counts);
    if (dollars === null) this.costKnown = false;
    else this.cost += dollars;
  }

  propose(draft: ProposalDraft): string {
    if (this.proposals >= MAX_PROPOSALS) {
      throw new ToolError(`ร่างครบ ${MAX_PROPOSALS} ชิ้นต่อคำถามแล้ว ให้ผู้ใช้ตรวจชุดนี้ก่อน`);
    }
    this.proposals += 1;
    const id = crypto.randomUUID();
    this.emit({ type: "proposal", proposal: { ...draft, id } });
    return id;
  }

  summary(): UsageSummary {
    return {
      inputTokens: this.tokens.input,
      outputTokens: this.tokens.output,
      cacheReadTokens: this.tokens.cacheRead,
      cacheWriteTokens: this.tokens.cacheWrite,
      costUsd: this.costKnown ? Math.round(this.cost * 10_000) / 10_000 : null,
      steps: this.steps,
      durationMs: Date.now() - this.startedAt,
    };
  }
}

/* ============================================================================
 * จุดเข้า
 * ========================================================================== */

export async function runAgentSession(o: SessionOptions): Promise<SessionResult> {
  const run = new Run(o);
  const role = roleOf(o.role);
  let status: RunStatus = "done";
  let error: string | undefined;

  run.emit({ type: "start", role: o.role, model: o.model });

  try {
    if (!role) throw new Error(`unknown role ${o.role}`);
    const messages = toMessages(o.history, contextBlock(run, o.projectName));
    const out = await agentLoop(run, role, messages, null, { deadline: run.deadline, signal: run.signal });
    status = out.status;
    if (out.status === "refused") {
      run.emit({ type: "notice", message: "ผู้ช่วยปฏิเสธคำขอนี้ ลองถามใหม่ให้ชัดขึ้นว่าต้องการอะไรในงานของโปรเจกต์" });
    }
  } catch (e) {
    if (run.timedOut()) {
      status = "limit";
      run.emit({ type: "notice", message: "หมดเวลาของรอบนี้ก่อนผู้ช่วยจะตอบจบ ลองถามให้แคบลง หรือเลือกผู้ช่วยเฉพาะด้านโดยตรง" });
    } else if (o.signal.aborted) {
      status = "aborted";
    } else {
      status = "error";
      error = technical(e);
      console.error("[agents] run failed:", e);
      run.emit({ type: "error", message: publicMessage(e) });
    }
  }

  const usage = run.summary();
  run.emit({ type: "done", status, usage });
  return { status, usage, toolCalls: run.toolCalls, error };
}

/* ============================================================================
 * ลูปของผู้ช่วยหนึ่งตัว — ตัวที่ผู้ใช้คุยด้วย (scope = null)
 * และตัวที่ถูกมอบงาน (scope = id ของการเรียก delegate) ใช้ลูปเดียวกันนี้
 * ========================================================================== */

async function agentLoop(
  run: Run,
  role: RoleMeta,
  messages: Anthropic.Beta.BetaMessageParam[],
  scope: Scope,
  limits: Limits
): Promise<LoopResult> {
  const tools = toolsFor(run, role, scope);
  // เรียงตามชื่อทุกครั้ง — ลำดับเครื่องมือเปลี่ยน = prompt cache พังทั้งก้อน
  const apiTools = tools.map((t) => t.api).sort((a, b) => a.name.localeCompare(b.name));
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    // จุดตัด cache ที่ท้าย system: ส่วนที่เหมือนเดิมทุกคำถาม (เครื่องมือ + คำสั่งประจำตัว)
    // จ่ายเต็มครั้งแรก ครั้งต่อ ๆ ไปจ่ายราวสิบเปอร์เซ็นต์
    { type: "text", text: systemPrompt(role.id), cache_control: { type: "ephemeral" } },
  ];

  let limited = false;
  let jsonRetries = 0;
  let spoke = false;

  for (let step = 0; ; step++) {
    // ประกันชั้นสุดท้ายกันลูปไม่รู้จบ — รอบที่ขอใหม่เพราะ JSON พังหรือ pause_turn ก็นับด้วย
    if (step > role.maxSteps + MAX_JSON_RETRIES) throw new Error(`agent loop did not converge (${role.id})`);

    // ---- รอบสรุป: ครบจำนวนรอบ / เวลาใกล้หมด / งบหมด → ห้ามเรียกเครื่องมือ ให้ตอบจากที่มี
    const outOfSteps = step >= role.maxSteps - 1;
    const squeezed = limits.deadline - Date.now() < WRAP_UP_MS || run.overBudget();
    const wrapUp = outOfSteps || squeezed;

    if (wrapUp && messages.length > 1) {
      appendNote(
        messages,
        "(ระบบ: รอบนี้ใช้เครื่องมือต่อไม่ได้แล้ว ให้สรุปคำตอบจากข้อมูลที่ได้มา และบอกผู้ใช้ตรง ๆ ถ้าข้อมูลยังไม่ครบ)"
      );
    }
    if (squeezed) {
      limited = true;
      if (!run.noticedWrapUp) {
        run.noticedWrapUp = true;
        run.emit({ type: "notice", message: "ใกล้หมดเวลาหรืองบของรอบนี้ ผู้ช่วยจะสรุปจากข้อมูลเท่าที่ได้" });
      }
    }

    const stream = run.client.beta.messages.stream(
      {
        model: run.o.model,
        max_tokens: MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: role.effort },
        system,
        tools: apiTools,
        tool_choice: wrapUp ? { type: "none" } : { type: "auto" },
        messages,
        // cache ส่วนท้ายของบทสนทนาอัตโนมัติ — รอบถัดไปในลูปอ่านของรอบก่อนจาก cache
        cache_control: { type: "ephemeral" },
        // id แบบสุ่มของผู้ใช้ (ไม่ใช่อีเมล) ให้ Anthropic แยกได้ว่าคำขอมาจากคนไหน
        metadata: { user_id: run.o.userId },
        ...(FALLBACK_MODELS.has(run.o.model)
          ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
          : {}),
      },
      { signal: limits.signal }
    );

    // ข้อความจากแต่ละรอบต่อกันบนจอ — เว้นบรรทัดระหว่างรอบ ไม่งั้นประโยคติดกันเป็นพืด
    let gap = spoke;
    stream.on("text", (delta) => {
      if (gap) {
        run.emit({ type: "text", scope, delta: "\n\n" });
        gap = false;
      }
      spoke = true;
      run.emit({ type: "text", scope, delta });
    });

    let msg: Anthropic.Beta.BetaMessage;
    try {
      msg = await stream.finalMessage();
      jsonRetries = 0;
    } catch (e) {
      // input ของเครื่องมือที่สตรีมมาเป็น JSON ที่อ่านไม่ออกเลย → ขอรอบนี้ใหม่
      // ความผิดพลาดของ API (401, 429, 5xx) และการยกเลิก ห้ามกลืน โยนต่อทันที
      if (e instanceof Anthropic.APIError || limits.signal.aborted || jsonRetries >= MAX_JSON_RETRIES) throw e;
      jsonRetries += 1;
      continue;
    }

    run.record(msg);

    // ตัวกรองความปลอดภัยปฏิเสธ (หลังลองรุ่นสำรองแล้วด้วย) — อย่ารันเครื่องมือของรอบนี้
    if (msg.stop_reason === "refusal") return { text: textOf(msg), status: "refused" };

    // ฝั่งเซิร์ฟเวอร์พักรอบกลางทาง — ส่งของเดิมกลับไปให้ทำต่อ (เผื่อวันหน้าใส่เครื่องมือฝั่งเซิร์ฟเวอร์)
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      continue;
    }

    const uses = msg.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

    if (uses.length === 0) {
      if (msg.stop_reason === "max_tokens") {
        run.emit({ type: "notice", message: "คำตอบยาวเกินเพดานของรอบเดียว ท้ายข้อความอาจขาดไป" });
      }
      return { text: textOf(msg), status: limited ? "limit" : "done" };
    }

    // input ของเครื่องมือถูกตัดกลางทางที่เพดาน token — ห้ามรันของที่ขาดครึ่ง
    if (msg.stop_reason === "max_tokens") throw new Error("tool input truncated at max_tokens");

    // ต้องส่งคำตอบของโมเดลกลับไปทั้งก้อนตามเดิม (รวมส่วนที่มันคิดและบล็อก fallback)
    // ไม่งั้น API ตรวจความต่อเนื่องไม่ผ่าน
    messages.push({ role: "assistant", content: msg.content });

    // เรียกหลายเครื่องมือในรอบเดียวได้ — รันพร้อมกัน แล้วส่งผลทั้งหมดกลับในข้อความเดียว
    const byName = new Map(tools.map((t) => [t.name, t]));
    const results = await Promise.all(uses.map((u) => execute(run, role, byName.get(u.name), u, scope)));
    messages.push({ role: "user", content: results });
  }
}

/* ============================================================================
 * เครื่องมือ
 * ========================================================================== */

/**
 * เครื่องมือที่บทบาทนี้ได้ในรอบนี้ — ชั้นที่ 1 ของสิทธิ์
 * ตัวที่ผู้ใช้ไม่มีสิทธิ์จะไม่ถูกยื่นให้โมเดลเห็นตั้งแต่แรก
 */
function toolsFor(run: Run, role: RoleMeta, scope: Scope): BoundTool[] {
  const allowed = (cap: Parameters<typeof can>[1]) => can(run.ctx.viewer, cap);

  const tools = exposedTools(role, allowed).map((name) => bindTool(name, run.ctx));

  // มอบงานได้เฉพาะผู้ประสานงานที่ผู้ใช้คุยด้วยตรง ๆ — ผู้ช่วยที่ถูกมอบงานมอบต่อไม่ได้
  // (กันการโยนงานกันไปมาไม่รู้จบ และกันค่าใช้จ่ายทวีคูณ)
  if (role.id === "coordinator" && scope === null) {
    const specialists = rolesFor(allowed).filter(isSpecialist);
    if (specialists.length > 0) tools.push(delegateTool(run, specialists));
  }
  return tools;
}

function bindTool(name: keyof typeof TOOL_SPECS, ctx: ToolContext): BoundTool {
  const spec = TOOL_SPECS[name];
  return {
    name,
    label: spec.label,
    api: {
      name,
      description: spec.description,
      input_schema: toInputSchema(spec.input) as Anthropic.Beta.BetaTool["input_schema"],
      // สตรีม input ของเครื่องมือทันทีที่โมเดลเขียน — แลกกับที่ API ไม่ตรวจ input ให้แล้ว
      // เราจึงตรวจเองทุกครั้งด้วย zod ข้างล่าง
      eager_input_streaming: true,
    },
    async run(input) {
      // ชั้นที่ 2 ของสิทธิ์ — เช็คซ้ำตอนรัน เผื่อโมเดลเรียกชื่อที่ไม่ได้ถูกยื่นให้
      if (!can(ctx.viewer, spec.need)) throw new ToolError("ผู้ใช้คนนี้ไม่มีสิทธิ์ใช้เครื่องมือนี้");

      const parsed = spec.input.safeParse(input);
      if (!parsed.success) {
        throw new ToolError(
          `input ไม่ถูกต้อง: ${parsed.error.issues.map((i) => `${i.path.join(".") || "input"} ${i.message}`).join("; ")}`
        );
      }
      // TS จับคู่ชนิดของ union ข้ามตาราง mapped type ไม่ได้ — schema ด้านบนรับรองแล้ว
      const impl = TOOL_IMPLS[name] as (input: unknown, ctx: ToolContext) => Promise<ToolOutput>;
      return impl(parsed.data, ctx);
    },
  };
}

/**
 * เครื่องมือมอบงาน — ผู้ช่วยเฉพาะด้านทั้งตัวกลายเป็น "เครื่องมือหนึ่งชิ้น" ของผู้ประสานงาน
 *
 * ผู้ช่วยที่รับงานเริ่มจากบริบทว่างเปล่า เห็นแค่ข้อมูลประกอบกับงานที่ถูกมอบ
 * (ไม่เห็นบทสนทนาหลัก) นี่คือข้อดี: บริบทของแต่ละตัวสั้นและตรงเรื่อง
 * ผู้ประสานงานเห็นแค่คำตอบสุดท้าย ไม่ต้องแบกผลเครื่องมือทั้งหมดของทุกคน
 */
function delegateTool(run: Run, specialists: RoleMeta[]): BoundTool {
  const ids = specialists.map((r) => r.id) as [RoleId, ...RoleId[]];
  const input = z.object({
    role: z.enum(ids).describe("ผู้ช่วยที่จะมอบงานให้"),
    task: z
      .string()
      .min(1)
      .max(4000)
      .describe("งานที่มอบ เขียนให้ครบในตัว: ผู้ใช้อยากรู้อะไร อยากได้คำตอบแบบไหน และบริบทที่ต้องรู้"),
  });
  const roster = specialists.map((r) => `- ${r.id}: ${r.label} — ${r.blurb}`).join("\n");

  return {
    name: DELEGATE_TOOL,
    label: "มอบงาน",
    api: {
      name: DELEGATE_TOOL,
      description: `มอบงานให้ผู้ช่วยเฉพาะด้านทำ แล้วรับคำตอบของเขากลับมา ใช้เมื่อเรื่องต้องขุดข้อมูลเฉพาะด้าน เรียกหลายครั้งในรอบเดียวได้ถ้าเรื่องเกี่ยวหลายด้าน (ทำงานพร้อมกัน) · ผู้ช่วยที่รับงานไม่เห็นบทสนทนานี้\nผู้ช่วยที่มี:\n${roster}`,
      input_schema: toInputSchema(input) as Anthropic.Beta.BetaTool["input_schema"],
      eager_input_streaming: true,
    },
    async run(raw, toolUseId) {
      const parsed = input.safeParse(raw);
      if (!parsed.success) throw new ToolError(`input ไม่ถูกต้อง: ${parsed.error.issues[0]?.message ?? ""}`);

      const target = roleOf(parsed.data.role);
      if (!target) throw new ToolError("ไม่มีผู้ช่วยบทบาทนี้");
      const { task } = parsed.data;

      // เส้นตายของผู้ช่วยที่รับงาน = เส้นตายของทั้งรอบ ลบเวลาที่กันไว้ให้ผู้ประสานงานสรุป
      const deadline = run.deadline - SYNTH_RESERVE_MS;
      const room = deadline - Date.now();
      if (room < WRAP_UP_MS / 2) {
        throw new ToolError("เวลาเหลือไม่พอให้มอบงานแล้ว ให้ตอบจากข้อมูลที่มีอยู่");
      }
      const signal = AbortSignal.any([run.signal, AbortSignal.timeout(room)]);

      run.emit({ type: "delegate", id: toolUseId, to: target.id, task, status: "start" });
      try {
        const out = await agentLoop(
          run,
          target,
          [
            {
              role: "user",
              content: [
                { type: "text", text: contextBlock(run, run.o.projectName) },
                { type: "text", text: `งานที่ผู้ประสานงานมอบให้คุณ:\n${task}` },
              ],
            },
          ],
          toolUseId,
          { deadline, signal }
        );
        if (out.status === "refused") throw new ToolError(`${target.label} ปฏิเสธงานนี้ ลองมอบให้แคบลงหรือตอบเอง`);

        run.emit({ type: "delegate", id: toolUseId, to: target.id, task, status: "done" });
        return { content: out.text.trim() || "(ผู้ช่วยไม่ได้ตอบอะไรกลับมา)" };
      } catch (e) {
        // ทั้งรอบถูกยกเลิก/หมดเวลา → ส่งต่อให้หยุดหมด
        if (run.signal.aborted) throw e;
        run.emit({ type: "delegate", id: toolUseId, to: target.id, task, status: "error" });
        // หมดเวลาเฉพาะของผู้ช่วยตัวนี้ → บอกผู้ประสานงานให้สรุปจากที่มี ไม่ล้มทั้งรอบ
        if (signal.aborted) throw new ToolError(`${target.label} ทำไม่ทันเวลา ให้สรุปจากข้อมูลที่มีอยู่`);
        throw e;
      }
    },
  };
}

/** รันเครื่องมือหนึ่งครั้ง — ผิดพลาดแล้วคืนเป็นผลแบบ error ให้โมเดลอ่านแล้วปรับตัว ไม่ล้มทั้งรอบ */
async function execute(
  run: Run,
  role: RoleMeta,
  tool: BoundTool | undefined,
  use: Anthropic.Beta.BetaToolUseBlock,
  scope: Scope
): Promise<Anthropic.Beta.BetaToolResultBlockParam> {
  // การมอบงานมีเหตุการณ์ของตัวเอง (delegate) ไม่ต้องขึ้นบรรทัดเครื่องมือซ้ำ
  const visible = use.name !== DELEGATE_TOOL;
  const label = tool?.label ?? use.name;
  const base = { type: "tool" as const, scope, id: use.id, name: use.name, label };

  if (visible) run.emit({ ...base, status: "start" });

  try {
    if (!tool) throw new ToolError(`ไม่มีเครื่องมือชื่อ ${use.name} ในบทบาทนี้`);
    const out = await tool.run(use.input, use.id);

    if (visible) run.emit({ ...base, status: "done", note: out.note });
    run.toolCalls.push({ agent: role.id, name: use.name, ok: true });
    return { type: "tool_result", tool_use_id: use.id, content: clip(out.content) };
  } catch (e) {
    // ยกเลิก/หมดเวลา ต้องหยุดทั้งรอบ ห้ามกลืนเป็นผลของเครื่องมือ
    if (run.signal.aborted) throw e;

    const message = e instanceof ToolError ? e.message : "เครื่องมือทำงานผิดพลาด";
    if (!(e instanceof ToolError)) console.error(`[agents] tool ${use.name} crashed:`, e);

    if (visible) run.emit({ ...base, status: "error", note: message.slice(0, 140) });
    run.toolCalls.push({ agent: role.id, name: use.name, ok: false });
    return { type: "tool_result", tool_use_id: use.id, content: message, is_error: true };
  }
}

/* ============================================================================
 * ตัวช่วย
 * ========================================================================== */

/**
 * ข้อมูลประกอบที่แปะหน้าข้อความแรก — ของที่เปลี่ยนตามคำขออยู่ตรงนี้ ไม่อยู่ใน system
 * (ดูหัวไฟล์ prompts.ts ว่าทำไม)
 */
function contextBlock(run: Run, projectName: string): string {
  return [
    "ข้อมูลประกอบจากระบบ (ไม่ใช่ข้อความที่ผู้ใช้พิมพ์)",
    `- วันนี้: ${run.ctx.today} (เวลาไทย)`,
    `- โปรเจกต์: ${projectName}`,
    `- ผู้ใช้ที่คุยด้วย: ${run.ctx.viewer.role === "owner" ? "เจ้าของโปรเจกต์" : "ลูกค้าในโปรเจกต์"}`,
  ].join("\n");
}

function toMessages(history: ChatTurn[], context: string): Anthropic.Beta.BetaMessageParam[] {
  return history
    .filter((t) => t.text.trim() !== "")
    .map((t, i) => ({
      role: t.role,
      content:
        i === 0
          ? [
              { type: "text" as const, text: context },
              { type: "text" as const, text: t.text },
            ]
          : [{ type: "text" as const, text: t.text }],
    }));
}

/** แปะหมายเหตุจากระบบท้ายข้อความล่าสุดของฝั่งผู้ใช้ (ต่อท้ายผลเครื่องมือได้) */
function appendNote(messages: Anthropic.Beta.BetaMessageParam[], note: string) {
  const last = messages.at(-1);
  if (!last || last.role !== "user") return;
  const content = typeof last.content === "string" ? [{ type: "text" as const, text: last.content }] : last.content;
  const already = content.some((b) => b.type === "text" && b.text === note);
  if (!already) last.content = [...content, { type: "text", text: note }];
}

function textOf(msg: Anthropic.Beta.BetaMessage): string {
  return msg.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

function clip(text: string): string {
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text;
  return `${text.slice(0, MAX_TOOL_RESULT_CHARS)}\n…(ผลถูกตัดเหลือ ${MAX_TOOL_RESULT_CHARS} ตัวอักษร — ถ้าต้องการส่วนที่เหลือ ให้เรียกใหม่แบบกรองให้แคบลง)`;
}

/** ข้อความที่ผู้ใช้เห็น — ไม่มีรายละเอียดภายใน */
function publicMessage(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "คีย์ Anthropic API ใช้ไม่ได้ — เช็ค ANTHROPIC_API_KEY บนเซิร์ฟเวอร์";
  if (e instanceof Anthropic.PermissionDeniedError) return "คีย์นี้ไม่มีสิทธิ์ใช้รุ่นที่ตั้งไว้ (AGENT_MODEL)";
  if (e instanceof Anthropic.NotFoundError) return "ไม่พบรุ่นของโมเดลที่ตั้งไว้ (AGENT_MODEL)";
  if (e instanceof Anthropic.RateLimitError) return "เรียกใช้ถี่เกินโควตาของ API ลองใหม่อีกสักครู่";
  if (e instanceof Anthropic.BadRequestError) return "คำขอไปยังโมเดลไม่ถูกต้อง (ดูรายละเอียดใน log ของเซิร์ฟเวอร์)";
  if (e instanceof Anthropic.InternalServerError) return "ระบบของ Anthropic ขัดข้องหรือยุ่งอยู่ ลองใหม่อีกครั้ง";
  if (e instanceof Anthropic.APIConnectionError) return "เชื่อมต่อ Anthropic ไม่ได้ ลองใหม่อีกครั้ง";
  return "ผู้ช่วยทำงานผิดพลาด ลองใหม่อีกครั้ง";
}

/** รายละเอียดสั้น ๆ ไว้ลง agent_runs.error — ไม่มีข้อความสนทนา ไม่มีคีย์ */
function technical(e: unknown): string {
  if (e instanceof Anthropic.APIError) return `${e.constructor.name} ${e.status ?? ""}: ${e.message}`.slice(0, 500);
  if (e instanceof Error) return `${e.name}: ${e.message}`.slice(0, 500);
  return String(e).slice(0, 500);
}
