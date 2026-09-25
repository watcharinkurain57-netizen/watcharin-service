import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import type { Viewer } from "@/lib/archive-access";
import { KIND_LABEL, STATUS_LABEL } from "@/lib/project-archive";
import { COMMENT_SELECT, normalizeComments } from "@/lib/project-comments";
import { COST_SELECT, costCategoryOf, costsByCategory, marginOf, type ProjectCost } from "@/lib/project-costs";
import { DIAGRAM_GROUP_SELECT, type DiagramGroup } from "@/lib/project-diagrams";
import { MEETING_SELECT, endOf, normalizeMeetings } from "@/lib/project-meetings";
import {
  CHARGE_SELECT,
  PAYMENT_SELECT,
  categoryOf,
  statusOf,
  totalsOf,
  type ProjectCharge,
  type ProjectPayment,
} from "@/lib/project-payments";
import {
  COLUMN_SELECT,
  GROUP_SELECT,
  TASK_SELECT,
  personName,
  type Person,
  type Task,
  type TaskColumn,
  type TaskGroup,
} from "@/lib/project-tasks";
import { noteSummary } from "@/lib/task-notes";
import {
  CreateDiagramPayload,
  CreateTasksPayload,
  PostCommentPayload,
  looksLikeMermaid,
  type ProposalDraft,
} from "./proposals";
import type { TOOL_SPECS, ToolName } from "./specs";

/**
 * ตัวทำงานจริงของเครื่องมือ — ส่วนเดียวของผู้ช่วยที่คุยกับฐานข้อมูล
 *
 * กฎของไฟล์นี้:
 *   1) ใช้ `ctx.db` ตัวเดียว ซึ่งเป็น session ของคนที่กดใช้ผู้ช่วย (RLS คุมอยู่)
 *      ห้ามสร้าง client ที่ใช้ service key ในนี้เด็ดขาด
 *   2) ทุก query ต้อง `.eq("project_id", ctx.projectId)` — RLS ยอมให้อ่านทุกโปรเจกต์
 *      ที่ผู้ใช้เป็นสมาชิก แต่ผู้ช่วยถูกเปิดจากหน้าโปรเจกต์เดียว ห้ามล้นไปโปรเจกต์อื่น
 *   3) ไม่เขียนอะไรลงฐานข้อมูล — การเปลี่ยนแปลงทุกอย่างเป็น "ร่าง" ผ่าน ctx.propose
 *   4) ส่งให้โมเดลเฉพาะที่จำเป็น — ไม่ส่งอีเมล ไม่ส่งต้นฉบับยาว ๆ ที่ไม่ได้ขอ
 *
 * ผลลัพธ์เป็น JSON string (โมเดลอ่าน JSON ได้แม่นกว่าข้อความจัดรูป)
 * ส่วน `note` คือคำสั้น ๆ ที่หน้าจอโชว์ข้างชื่อเครื่องมือ
 */

export type ToolContext = {
  db: SupabaseClient;
  projectId: string;
  userId: string;
  viewer: Viewer;
  now: Date;
  /** YYYY-MM-DD ตามเวลาไทย — ไม่ใช่ UTC ของเซิร์ฟเวอร์ */
  today: string;
  /** ส่งร่างขึ้นจอ คืน id ของร่าง */
  propose(draft: ProposalDraft): string;
};

export type ToolOutput = { content: string; note?: string };

/** ความผิดพลาดที่อยากให้โมเดลอ่านแล้วแก้เองได้ — ข้อความนี้ไปถึงโมเดลตรง ๆ */
export class ToolError extends Error {}

type Input<K extends ToolName> = z.output<(typeof TOOL_SPECS)[K]["input"]>;
type Impl<K extends ToolName> = (input: Input<K>, ctx: ToolContext) => Promise<ToolOutput>;

/* ---------------- เวลาแบบไทย ---------------- */

const BKK = "Asia/Bangkok";

function partsIn(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: BKK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), hh: get("hour"), mm: get("minute") };
}

/**
 * วันนี้ตามเวลาไทย
 * ⚠️ ห้ามใช้ toISOString().slice(0, 10) — เซิร์ฟเวอร์อยู่ UTC ช่วงตีหนึ่งถึงเจ็ดโมงเช้า
 * ของไทยจะได้วันที่ของเมื่อวาน แล้วงานที่ครบกำหนดวันนี้จะไม่ถูกนับว่าเลยกำหนดแบบเงียบ ๆ
 */
export function bangkokDate(now: Date): string {
  const p = partsIn(now);
  return `${p.y}-${p.m}-${p.d}`;
}

function bangkokDateTime(iso: string): string {
  const p = partsIn(new Date(iso));
  return `${p.y}-${p.m}-${p.d} ${p.hh}:${p.mm}`;
}

/** จำนวนวันจาก `from` ถึง `to` (YYYY-MM-DD ทั้งคู่) — ติดลบ = ผ่านมาแล้ว */
function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

function clip(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max)}…(ตัดเหลือ ${max} ตัวอักษร)` : text;
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function issuesOf(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
}

/* ---------------- ตัวโหลดที่ใช้ร่วมกัน ---------------- */

type Member = { person: Person; role: "owner" | "client" };

/** คนในโปรเจกต์ — ถ้าอ่านโปรไฟล์ไม่ได้ยังได้ id กับบทบาท ชื่อจะเป็น "ไม่ระบุ" */
async function loadMembers(ctx: ToolContext): Promise<Map<string, Member>> {
  const { data, error } = await ctx.db
    .from("project_members")
    .select("user_id, role, profiles(id, display_name, email, avatar_url)")
    .eq("project_id", ctx.projectId);
  if (error) throw new ToolError(`อ่านรายชื่อคนในโปรเจกต์ไม่สำเร็จ: ${error.message}`);

  const out = new Map<string, Member>();
  for (const r of (data ?? []) as { user_id: string; role: Member["role"]; profiles: unknown }[]) {
    // PostgREST คืน many-to-one เป็น object เดี่ยว แต่บางทีตัวอนุมานชนิดมองเป็น array
    const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as Person | null;
    out.set(r.user_id, {
      person: p ?? { id: r.user_id, display_name: null, email: null, avatar_url: null },
      role: r.role,
    });
  }
  return out;
}

async function loadBoard(ctx: ToolContext) {
  const [t, c, g] = await Promise.all([
    ctx.db.from("project_tasks").select(TASK_SELECT).eq("project_id", ctx.projectId).order("sort"),
    ctx.db.from("project_task_columns").select(COLUMN_SELECT).eq("project_id", ctx.projectId).order("sort"),
    ctx.db.from("project_task_groups").select(GROUP_SELECT).eq("project_id", ctx.projectId).order("sort"),
  ]);
  const error = t.error ?? c.error ?? g.error;
  if (error) throw new ToolError(`อ่านงานไม่สำเร็จ: ${error.message}`);

  return {
    tasks: (t.data ?? []) as Task[],
    columns: (c.data ?? []) as TaskColumn[],
    groups: (g.data ?? []) as TaskGroup[],
  };
}

type Board = Awaited<ReturnType<typeof loadBoard>>;

function describeTask(t: Task, board: Board, members: Map<string, Member>, ctx: ToolContext) {
  const column = board.columns.find((c) => c.id === t.column_id);
  const done = column?.is_done ?? false;
  const dueIn = t.due_on ? daysBetween(ctx.today, t.due_on) : null;

  return {
    id: t.id,
    title: t.title,
    status: column?.name ?? "ไม่ทราบคอลัมน์",
    done,
    group: board.groups.find((g) => g.id === t.group_id)?.name ?? null,
    // วันที่จริงมาก่อน ถ้าไม่มีค่อยใช้ข้อความที่พิมพ์ไว้เอง เช่น "สิ้นเดือน"
    due: t.due_on ?? t.due_label ?? null,
    days_until_due: done ? null : dueIn,
    overdue: !done && dueIn !== null && dueIn < 0,
    started_on: t.started_on,
    assignee: t.assignee_id ? personName(members.get(t.assignee_id)?.person) : null,
    assignee_is_me: t.assignee_id === ctx.userId,
  };
}

function taskCounts(board: Board, ctx: ToolContext) {
  const doneCols = new Set(board.columns.filter((c) => c.is_done).map((c) => c.id));
  const open = board.tasks.filter((t) => !doneCols.has(t.column_id));
  return {
    total: board.tasks.length,
    open: open.length,
    done: board.tasks.length - open.length,
    overdue: open.filter((t) => t.due_on && t.due_on < ctx.today).length,
  };
}

/* ---------------- เครื่องมือ ---------------- */

const getProjectOverview: Impl<"get_project_overview"> = async (_input, ctx) => {
  const { data, error } = await ctx.db
    .from("projects")
    .select("name, tagline, status, status_note, kind, tags, tech, started_label, ended_label, progress, done, next_up")
    .eq("id", ctx.projectId)
    .maybeSingle();
  if (error) throw new ToolError(`อ่านโปรเจกต์ไม่สำเร็จ: ${error.message}`);
  if (!data) throw new ToolError("ไม่พบโปรเจกต์นี้ หรือไม่มีสิทธิ์อ่าน");

  const p = data as {
    name: string;
    tagline: string;
    status: keyof typeof STATUS_LABEL;
    status_note: string | null;
    kind: keyof typeof KIND_LABEL;
    tags: string[] | null;
    tech: string[] | null;
    started_label: string;
    ended_label: string | null;
    progress: number | null;
    done: string[] | null;
    next_up: string[] | null;
  };

  // จำนวนงานเป็นของแถม — ใครไม่มีสิทธิ์ดูงาน RLS จะคืนแถวว่าง ตัวเลขก็เป็นศูนย์ ไม่พัง
  const counts = taskCounts(await loadBoard(ctx), ctx);

  return {
    content: json({
      today: ctx.today,
      name: p.name,
      tagline: p.tagline,
      status: STATUS_LABEL[p.status] ?? p.status,
      status_note: p.status_note,
      kind: KIND_LABEL[p.kind] ?? p.kind,
      period: p.ended_label ? `${p.started_label} – ${p.ended_label}` : `เริ่ม ${p.started_label}`,
      progress_pct: p.progress,
      done: p.done ?? [],
      next_up: p.next_up ?? [],
      tags: p.tags ?? [],
      tech: p.tech ?? [],
      tasks: counts,
    }),
    note: p.name,
  };
};

const listTasks: Impl<"list_tasks"> = async (input, ctx) => {
  const [board, members] = await Promise.all([loadBoard(ctx), loadMembers(ctx)]);
  const search = input.search?.trim().toLowerCase();

  let rows = board.tasks.map((t) => ({ t, d: describeTask(t, board, members, ctx) }));

  if (input.filter === "open") rows = rows.filter((r) => !r.d.done);
  if (input.filter === "done") rows = rows.filter((r) => r.d.done);
  if (input.filter === "overdue") rows = rows.filter((r) => r.d.overdue);
  if (input.assignee === "me") rows = rows.filter((r) => r.t.assignee_id === ctx.userId);
  if (input.assignee === "unassigned") rows = rows.filter((r) => !r.t.assignee_id);
  if (search) rows = rows.filter((r) => r.t.title.toLowerCase().includes(search));

  // งานที่ยังไม่เสร็จเรียงตามความด่วน · ที่เหลือเรียงตามลำดับบนบอร์ด
  if (input.filter === "open" || input.filter === "overdue") {
    rows.sort((a, b) => (a.d.days_until_due ?? Infinity) - (b.d.days_until_due ?? Infinity));
  }

  const matched = rows.length;
  const shown = rows.slice(0, input.limit).map((r) => ({
    ...r.d,
    note: noteSummary(r.t.description, 140) || null,
  }));

  return {
    content: json({
      today: ctx.today,
      counts: taskCounts(board, ctx),
      matched,
      returned: shown.length,
      tasks: shown,
    }),
    note: `${matched} งาน`,
  };
};

const getTask: Impl<"get_task"> = async (input, ctx) => {
  const [{ data, error }, board, members] = await Promise.all([
    ctx.db
      .from("project_tasks")
      .select(TASK_SELECT)
      .eq("project_id", ctx.projectId)
      .eq("id", input.task_id)
      .maybeSingle(),
    loadBoard(ctx),
    loadMembers(ctx),
  ]);
  if (error) throw new ToolError(`อ่านงานไม่สำเร็จ: ${error.message}`);
  if (!data) throw new ToolError("ไม่พบงานนี้ในโปรเจกต์ — ใช้ id จากผลของ list_tasks");

  const t = data as Task;
  return {
    content: json({ ...describeTask(t, board, members, ctx), description: clip(t.description, 8000) }),
    note: t.title,
  };
};

const listMembers: Impl<"list_members"> = async (_input, ctx) => {
  const members = await loadMembers(ctx);
  const people = [...members.entries()].map(([id, m]) => ({
    id,
    name: personName(m.person),
    role: m.role === "owner" ? "เจ้าของโปรเจกต์" : "ลูกค้า",
    is_me: id === ctx.userId,
  }));
  return { content: json({ members: people }), note: `${people.length} คน` };
};

const listMeetings: Impl<"list_meetings"> = async (input, ctx) => {
  const { data, error } = await ctx.db
    .from("project_meetings")
    .select(MEETING_SELECT)
    .eq("project_id", ctx.projectId)
    .order("starts_at");
  if (error) throw new ToolError(`อ่านนัดประชุมไม่สำเร็จ: ${error.message}`);

  const now = ctx.now.getTime();
  let rows = normalizeMeetings(data);
  if (input.when === "upcoming") rows = rows.filter((m) => endOf(m).getTime() >= now);
  if (input.when === "past") rows = rows.filter((m) => endOf(m).getTime() < now).reverse();

  const shown = rows.slice(0, input.limit).map((m) => ({
    title: m.title,
    starts: bangkokDateTime(m.starts_at),
    minutes: m.minutes,
    live_now: new Date(m.starts_at).getTime() <= now && endOf(m).getTime() >= now,
    meet_url: m.meet_url,
    note: clip(m.note, 500),
    created_by: m.profiles ? personName(m.profiles) : null,
  }));

  return {
    content: json({ timezone: "เวลาไทย (UTC+7)", now: bangkokDateTime(ctx.now.toISOString()), meetings: shown }),
    note: `${shown.length} นัด`,
  };
};

async function loadPayments(ctx: ToolContext): Promise<ProjectPayment[]> {
  const { data, error } = await ctx.db
    .from("project_payments")
    .select(PAYMENT_SELECT)
    .eq("project_id", ctx.projectId)
    .order("sort");
  if (error) throw new ToolError(`อ่านงวดจ่ายไม่สำเร็จ: ${error.message}`);
  return (data ?? []) as ProjectPayment[];
}

const getPayments: Impl<"get_payments"> = async (_input, ctx) => {
  const rows = await loadPayments(ctx);
  return {
    content: json({
      currency: "THB",
      installments: rows.map((p) => ({
        label: p.label,
        amount: Number(p.amount),
        status: statusOf(p.status).label,
        due: p.due_label,
        paid_on: p.paid_on,
      })),
      totals: totalsOf(rows),
    }),
    note: `${rows.length} งวด`,
  };
};

const getCharges: Impl<"get_charges"> = async (_input, ctx) => {
  const { data, error } = await ctx.db
    .from("project_charges")
    .select(CHARGE_SELECT)
    .eq("project_id", ctx.projectId)
    .order("sort");
  if (error) throw new ToolError(`อ่านรายการเรียกเก็บไม่สำเร็จ: ${error.message}`);

  const rows = (data ?? []) as ProjectCharge[];
  return {
    content: json({
      currency: "THB",
      items: rows.map((c) => ({
        category: categoryOf(c.category).label,
        label: c.label,
        qty: Number(c.qty),
        unit_amount: Number(c.unit_amount),
        months: c.months,
        total: Number(c.total),
        note: clip(c.note, 300),
      })),
      total: rows.reduce((s, c) => s + Number(c.total), 0),
    }),
    note: `${rows.length} รายการ`,
  };
};

const getCostsAndMargin: Impl<"get_costs_and_margin"> = async (_input, ctx) => {
  const [costsRes, payments] = await Promise.all([
    ctx.db.from("project_costs").select(COST_SELECT).eq("project_id", ctx.projectId).order("sort"),
    loadPayments(ctx),
  ]);
  if (costsRes.error) throw new ToolError(`อ่านต้นทุนไม่สำเร็จ: ${costsRes.error.message}`);

  const costs = (costsRes.data ?? []) as ProjectCost[];
  const totals = totalsOf(payments);

  return {
    content: json({
      currency: "THB",
      // สูตรเดียวกับแผงต้นทุนในแท็บเงิน: มูลค่างาน = ยอดรวมงวดจ่าย · รับแล้ว = งวดที่จ่ายแล้ว
      margin: marginOf(costs, totals.all, totals.paid),
      by_category: costsByCategory(costs).map((c) => ({ category: c.label, total: c.total })),
      items: costs.map((c) => ({
        category: costCategoryOf(c.category).label,
        label: c.label,
        total: Number(c.total),
        paid: !!c.paid_on,
        vendor: c.vendor,
      })),
    }),
    note: `${costs.length} รายการต้นทุน`,
  };
};

const listDiagrams: Impl<"list_diagrams"> = async (_input, ctx) => {
  const [d, g] = await Promise.all([
    ctx.db
      .from("project_diagrams")
      .select("id, title, source, group_id, updated_at")
      .eq("project_id", ctx.projectId)
      .order("sort"),
    ctx.db.from("project_diagram_groups").select(DIAGRAM_GROUP_SELECT).eq("project_id", ctx.projectId),
  ]);
  const error = d.error ?? g.error;
  if (error) throw new ToolError(`อ่านผังไม่สำเร็จ: ${error.message}`);

  const groups = (g.data ?? []) as DiagramGroup[];
  const rows = (d.data ?? []) as {
    id: string;
    title: string;
    source: string;
    group_id: string | null;
    updated_at: string;
  }[];

  return {
    content: json({
      diagrams: rows.map((r) => ({
        id: r.id,
        title: r.title,
        // บรรทัดแรกบอกชนิดผัง (flowchart, sequenceDiagram, …) พอให้เลือกได้โดยไม่ต้องส่งต้นฉบับ
        kind: r.source.trim().split(/\s/)[0] || "(ว่าง)",
        group: groups.find((x) => x.id === r.group_id)?.name ?? null,
        updated: bangkokDateTime(r.updated_at),
        chars: r.source.length,
      })),
    }),
    note: `${rows.length} ผัง`,
  };
};

const getDiagram: Impl<"get_diagram"> = async (input, ctx) => {
  const { data, error } = await ctx.db
    .from("project_diagrams")
    .select("id, title, source")
    .eq("project_id", ctx.projectId)
    .eq("id", input.diagram_id)
    .maybeSingle();
  if (error) throw new ToolError(`อ่านผังไม่สำเร็จ: ${error.message}`);
  if (!data) throw new ToolError("ไม่พบผังนี้ในโปรเจกต์ — ใช้ id จากผลของ list_diagrams");

  const row = data as { id: string; title: string; source: string };
  return { content: json(row), note: row.title };
};

const readChat: Impl<"read_chat"> = async (input, ctx) => {
  let q = ctx.db
    .from("project_comments")
    .select(COMMENT_SELECT)
    .eq("project_id", ctx.projectId)
    .order("created_at", { ascending: false })
    .limit(input.limit);
  if (input.days) q = q.gte("created_at", new Date(ctx.now.getTime() - input.days * 86_400_000).toISOString());

  const [{ data, error }, members] = await Promise.all([q, loadMembers(ctx)]);
  if (error) throw new ToolError(`อ่านห้องคุยงานไม่สำเร็จ: ${error.message}`);

  // ดึงใหม่สุดมาก่อนเพื่อให้ limit ได้ข้อความล่าสุด แล้วกลับลำดับให้อ่านจากเก่าไปใหม่
  const rows = normalizeComments(data).reverse();

  return {
    content: json({
      timezone: "เวลาไทย (UTC+7)",
      messages: rows.map((c) => ({
        at: bangkokDateTime(c.created_at),
        author: c.profiles ? personName(c.profiles) : "บัญชีที่ถูกลบ",
        author_role: c.author_id
          ? members.get(c.author_id)?.role === "owner"
            ? "เจ้าของโปรเจกต์"
            : "ลูกค้า"
          : null,
        from_me: c.author_id === ctx.userId,
        text: clip(c.body, 1500),
      })),
    }),
    note: `${rows.length} ข้อความ`,
  };
};

const proposeTasks: Impl<"propose_tasks"> = async (input, ctx) => {
  const members = await loadMembers(ctx);

  // ตรวจคนรับงานก่อน — ถ้าโมเดลเดา id มา ให้มันรู้ตัวแล้วไปดู list_members ใหม่
  for (const t of input.tasks) {
    if (t.assignee_id && !members.has(t.assignee_id)) {
      throw new ToolError(
        `assignee_id "${t.assignee_id}" ไม่ได้อยู่ในโปรเจกต์นี้ — เรียก list_members แล้วใช้ id จากนั้น หรือเว้นว่างไว้`
      );
    }
  }

  const parsed = CreateTasksPayload.safeParse({
    tasks: input.tasks.map((t) => ({
      title: t.title,
      due_on: t.due_on || undefined,
      assignee_id: t.assignee_id || undefined,
      assignee_name: t.assignee_id ? personName(members.get(t.assignee_id)?.person) : undefined,
      note: t.note || undefined,
    })),
  });
  if (!parsed.success) throw new ToolError(`ร่างงานไม่ผ่าน: ${issuesOf(parsed.error)}`);

  const n = parsed.data.tasks.length;
  const id = ctx.propose({ kind: "create_tasks", summary: `เพิ่มงาน ${n} รายการ`, payload: parsed.data });
  return {
    content: json({ status: "drafted", proposal_id: id, message: "ร่างขึ้นการ์ดให้ผู้ใช้ตรวจแล้ว ยังไม่ได้บันทึก" }),
    note: `ร่าง ${n} งาน`,
  };
};

const proposeDiagram: Impl<"propose_diagram"> = async (input, ctx) => {
  if (!looksLikeMermaid(input.source)) {
    throw new ToolError("ต้นฉบับต้องขึ้นต้นด้วยชนิดผัง เช่น `flowchart LR` หรือ `sequenceDiagram`");
  }
  const parsed = CreateDiagramPayload.safeParse(input);
  if (!parsed.success) throw new ToolError(`ร่างผังไม่ผ่าน: ${issuesOf(parsed.error)}`);

  const id = ctx.propose({ kind: "create_diagram", summary: `ผังใหม่: ${parsed.data.title}`, payload: parsed.data });
  return {
    content: json({ status: "drafted", proposal_id: id, message: "ร่างผังขึ้นการ์ดพร้อมภาพตัวอย่างแล้ว ยังไม่ได้บันทึก" }),
    note: parsed.data.title,
  };
};

const proposeChatMessage: Impl<"propose_chat_message"> = async (input, ctx) => {
  const parsed = PostCommentPayload.safeParse(input);
  if (!parsed.success) throw new ToolError(`ร่างข้อความไม่ผ่าน: ${issuesOf(parsed.error)}`);

  const id = ctx.propose({ kind: "post_comment", summary: "ข้อความถึงห้องคุยงาน", payload: parsed.data });
  return {
    content: json({ status: "drafted", proposal_id: id, message: "ร่างข้อความขึ้นการ์ดแล้ว ยังไม่ได้ส่ง" }),
    note: `${parsed.data.body.length} ตัวอักษร`,
  };
};

export const TOOL_IMPLS: { [K in ToolName]: Impl<K> } = {
  get_project_overview: getProjectOverview,
  list_tasks: listTasks,
  get_task: getTask,
  list_members: listMembers,
  list_meetings: listMeetings,
  get_payments: getPayments,
  get_charges: getCharges,
  get_costs_and_margin: getCostsAndMargin,
  list_diagrams: listDiagrams,
  get_diagram: getDiagram,
  read_chat: readChat,
  propose_tasks: proposeTasks,
  propose_diagram: proposeDiagram,
  propose_chat_message: proposeChatMessage,
};
