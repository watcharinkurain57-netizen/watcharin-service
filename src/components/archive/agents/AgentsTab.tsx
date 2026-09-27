"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskNote } from "@/components/archive/tasks/TaskNote";
import { can, type Viewer } from "@/lib/archive-access";
import {
  MAX_TURNS,
  MAX_TURN_CHARS,
  splitLines,
  type AgentEvent,
  type ChatTurn,
  type RunStatus,
  type UsageSummary,
} from "@/lib/agents/protocol";
import type { Proposal } from "@/lib/agents/proposals";
import { roleOf, rolesFor, type RoleId } from "@/lib/agents/roles";
import { ProposalCard, type ProposalView } from "./ProposalCard";
import { RunLog, STATUS_LABEL, usd } from "./RunLog";

/**
 * แท็บ "ผู้ช่วย AI" ของหน้าโปรเจกต์
 *
 * หน้าจอนี้ไม่มีตรรกะของผู้ช่วยเลย — ทั้งหมดอยู่ที่ /api/agents/run (harness ฝั่งเซิร์ฟเวอร์)
 * หน้าที่ของไฟล์นี้มีสามอย่าง:
 *   1) ส่งบทสนทนาไป แล้วอ่านสตรีม NDJSON กลับมาทีละเหตุการณ์ (ดู lib/agents/protocol.ts)
 *   2) แสดงให้เห็นว่าผู้ช่วยกำลังทำอะไร — เครื่องมือที่เรียก งานที่มอบต่อ ร่างที่รอยืนยัน
 *      ผู้ช่วยที่ทำงานเงียบ ๆ แล้วโผล่คำตอบมา คนเชื่อไม่ลง
 *   3) ให้คนกดยืนยัน "ร่าง" — ที่นี่เป็นที่เดียวที่ผลงานของผู้ช่วยกลายเป็นข้อมูลจริง
 */

type ToolLine = { id: string; label: string; status: "start" | "done" | "error"; note?: string };

/** งานที่ผู้ประสานงานมอบให้ผู้ช่วยเฉพาะด้าน — หนึ่งก้อนต่อการมอบหนึ่งครั้ง */
type Branch = {
  id: string;
  to: RoleId;
  task: string;
  status: "start" | "done" | "error";
  text: string;
  tools: ToolLine[];
};

type AssistantItem = {
  kind: "assistant";
  role: RoleId;
  text: string;
  tools: ToolLine[];
  branches: Branch[];
  proposals: ProposalView[];
  notices: string[];
  error?: string;
  /** undefined = ยังทำงานอยู่ */
  status?: RunStatus;
  usage?: UsageSummary;
};

/** `apiText` คือสิ่งที่ส่งให้โมเดลจริง (มีหมายเหตุจากระบบนำหน้าได้) · `text` คือที่โชว์ */
type UserItem = { kind: "user"; text: string; apiText: string };

type Item = UserItem | AssistantItem;

function upsertTool(list: ToolLine[], e: Extract<AgentEvent, { type: "tool" }>): ToolLine[] {
  const line = { id: e.id, label: e.label, status: e.status, note: e.note };
  return list.some((t) => t.id === e.id) ? list.map((t) => (t.id === e.id ? line : t)) : [...list, line];
}

/** ใส่เหตุการณ์หนึ่งตัวลงในคำตอบที่กำลังก่อตัว — ฟังก์ชันบริสุทธิ์ ไม่แตะ state ตรง ๆ */
function applyEvent(a: AssistantItem, e: AgentEvent): AssistantItem {
  switch (e.type) {
    case "text":
      if (e.scope === null) return { ...a, text: a.text + e.delta };
      return { ...a, branches: a.branches.map((b) => (b.id === e.scope ? { ...b, text: b.text + e.delta } : b)) };
    case "tool":
      if (e.scope === null) return { ...a, tools: upsertTool(a.tools, e) };
      return { ...a, branches: a.branches.map((b) => (b.id === e.scope ? { ...b, tools: upsertTool(b.tools, e) } : b)) };
    case "delegate": {
      const exists = a.branches.some((b) => b.id === e.id);
      return {
        ...a,
        branches: exists
          ? a.branches.map((b) => (b.id === e.id ? { ...b, status: e.status } : b))
          : [...a.branches, { id: e.id, to: e.to, task: e.task, status: e.status, text: "", tools: [] }],
      };
    }
    case "proposal":
      return { ...a, proposals: [...a.proposals, { proposal: e.proposal, state: "pending" }] };
    case "notice":
      return { ...a, notices: [...a.notices, e.message] };
    case "error":
      return { ...a, error: e.message };
    case "done":
      return { ...a, status: e.status, usage: e.usage };
    default:
      return a;
  }
}

/**
 * แปลงรายการบนจอเป็นประวัติที่ส่งให้เซิร์ฟเวอร์
 * คำตอบที่ยาวเกินเพดานถูกตัดพร้อมบอกโมเดลตรง ๆ — ไม่ตัดเงียบ
 */
function toHistory(items: Item[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const it of items) {
    if (it.kind === "user") {
      turns.push({ role: "user", text: it.apiText });
    } else if (it.text.trim()) {
      const clipped =
        it.text.length > MAX_TURN_CHARS
          ? `${it.text.slice(0, MAX_TURN_CHARS - 40)}\n…(คำตอบเดิมยาวกว่านี้ ตัดท้ายออก)`
          : it.text;
      turns.push({ role: "assistant", text: clipped });
    }
  }
  return turns;
}

function ToolRow({ t }: { t: ToolLine }) {
  return (
    <li className="flex items-baseline gap-2 text-[0.78rem]">
      <span
        className={`w-3 flex-none text-center font-bold ${
          t.status === "done" ? "text-brand-400" : t.status === "error" ? "text-red-400" : "animate-pulse text-amber-300"
        }`}
        aria-hidden
      >
        {t.status === "done" ? "✓" : t.status === "error" ? "✕" : "•"}
      </span>
      <span className="text-ink-muted">{t.label}</span>
      {t.note && <span className="truncate text-ink-faint">· {t.note}</span>}
    </li>
  );
}

export function AgentsTab({ projectId, viewer }: { projectId: string; viewer: Viewer }) {
  const roles = useMemo(() => rolesFor((cap) => can(viewer, cap)), [viewer]);
  const [role, setRole] = useState<RoleId>(roles[0]?.id ?? "coordinator");
  const [items, setItems] = useState<Item[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  /** หมายเหตุที่จะแนบไปกับข้อความถัดไป เช่น "ผู้ใช้ยืนยันร่างแล้ว" ให้ผู้ช่วยรู้ผล */
  const [notes, setNotes] = useState<string[]>([]);
  const [runsVersion, setRunsVersion] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);

  // ปิดแท็บ/ออกจากหน้ากลางทาง → หยุดผู้ช่วย ไม่จ่ายเงินให้คำตอบที่ไม่มีใครอ่าน
  useEffect(() => () => abortRef.current?.abort(), []);

  // เลื่อนตามคำตอบที่ไหลมา — เฉพาะตอนผู้ใช้อยู่ท้ายสุดอยู่แล้ว ถ้าเลื่อนขึ้นไปอ่านของเก่าก็ไม่ดึงกลับ
  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [items]);

  const current = roleOf(role);
  const history = toHistory(items);
  const full = history.length + 1 > MAX_TURNS;

  /** แก้คำตอบตัวล่าสุด (ตัวที่กำลังทำงาน) */
  const patchLast = useCallback((fn: (a: AssistantItem) => AssistantItem) => {
    setItems((prev) => {
      const last = prev.at(-1);
      if (!last || last.kind !== "assistant") return prev;
      return [...prev.slice(0, -1), fn(last)];
    });
  }, []);

  const patchProposal = useCallback((id: string, fn: (p: ProposalView) => ProposalView) => {
    setItems((prev) =>
      prev.map((it) =>
        it.kind === "assistant" && it.proposals.some((p) => p.proposal.id === id)
          ? { ...it, proposals: it.proposals.map((p) => (p.proposal.id === id ? fn(p) : p)) }
          : it
      )
    );
  }, []);

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || running || full) return;

    const apiText = notes.length > 0 ? `${notes.map((n) => `(ระบบ: ${n})`).join("\n")}\n\n${text}` : text;
    const user: UserItem = { kind: "user", text, apiText };
    const turns = toHistory([...items, user]);

    setItems((prev) => [
      ...prev,
      user,
      { kind: "assistant", role, text: "", tools: [], branches: [], proposals: [], notices: [] },
    ]);
    setInput("");
    setNotes([]);
    setRunning(true);
    stickRef.current = true;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // เหตุการณ์มาถี่มาก (ทีละไม่กี่ตัวอักษร) — รวบเป็นก้อนละเฟรมก่อนค่อยอัปเดตจอ
    // ไม่งั้น React วาดทั้งบทสนทนาใหม่เป็นร้อยครั้งต่อวินาที
    let queue: AgentEvent[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      const batch = queue;
      queue = [];
      if (batch.length > 0) patchLast((a) => batch.reduce(applyEvent, a));
    };
    const push = (e: AgentEvent) => {
      queue.push(e);
      if (!frame) frame = requestAnimationFrame(flush);
    };

    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, role, history: turns }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        patchLast((a) => ({ ...a, error: j?.error ?? `ผู้ช่วยตอบไม่ได้ (รหัส ${res.status})`, status: "error" }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const { lines, rest } = splitLines(buffer);
        buffer = rest;
        for (const line of lines) {
          try {
            push(JSON.parse(line) as AgentEvent);
          } catch {
            // บรรทัดเสีย (ไม่น่าเกิด) — ข้ามไป ดีกว่าทิ้งทั้งคำตอบ
          }
        }
      }
    } catch {
      if (!ctrl.signal.aborted) {
        queue.push({ type: "error", message: "การเชื่อมต่อหลุดกลางทาง ลองใหม่อีกครั้ง" });
      }
    } finally {
      if (frame) cancelAnimationFrame(frame);
      flush();
      // สตรีมจบโดยไม่มี done (ถูกหยุด/หลุด) — ปิดสถานะให้ ไม่ให้ค้างเป็น "กำลังทำงาน"
      patchLast((a) => (a.status ? a : { ...a, status: ctrl.signal.aborted ? "aborted" : "error" }));
      setRunning(false);
      abortRef.current = null;
      setRunsVersion((v) => v + 1);
    }
  }

  async function applyProposal(p: Proposal) {
    patchProposal(p.id, (v) => ({ ...v, state: "saving", message: undefined, failed: false }));
    try {
      const res = await fetch("/api/agents/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind: p.kind, payload: p.payload }),
      });
      const j = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (!res.ok) {
        patchProposal(p.id, (v) => ({ ...v, state: "pending", message: j?.error ?? "บันทึกไม่สำเร็จ", failed: true }));
        return;
      }
      patchProposal(p.id, (v) => ({ ...v, state: "saved", message: j?.message, failed: false }));
      setNotes((n) => [...n, `ผู้ใช้กดยืนยันร่าง "${p.summary}" และบันทึกลงระบบแล้ว`]);
    } catch {
      patchProposal(p.id, (v) => ({ ...v, state: "pending", message: "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง", failed: true }));
    }
  }

  function dismissProposal(p: Proposal) {
    patchProposal(p.id, (v) => ({ ...v, state: "dismissed" }));
    setNotes((n) => [...n, `ผู้ใช้ไม่เอาร่าง "${p.summary}"`]);
  }

  function reset() {
    abortRef.current?.abort();
    setItems([]);
    setNotes([]);
  }

  if (roles.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-6">
      <h2 className="mb-1 text-base font-bold tracking-tight">ผู้ช่วย AI</h2>
      <p className="mb-4 max-w-[62ch] text-[0.85rem] text-ink-muted">
        เลือกผู้ช่วยตามเรื่อง หรือให้ผู้ประสานงานแจกงานให้ · ผู้ช่วยเห็นข้อมูลได้เท่าที่คุณมีสิทธิ์เห็น
        และไม่บันทึกอะไรเอง — ทุกอย่างที่จะเปลี่ยนขึ้นเป็น “ร่าง” ให้คุณกดยืนยันก่อน
      </p>

      {/* ---------- เลือกบทบาท ---------- */}
      <div role="radiogroup" aria-label="เลือกผู้ช่วย" className="mb-2 flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            role="radio"
            aria-checked={role === r.id}
            disabled={running}
            onClick={() => setRole(r.id)}
            className={`rounded-full border px-3 py-1.5 text-[0.84rem] font-bold transition-colors disabled:opacity-60 ${
              role === r.id
                ? "border-brand-500 bg-brand-500/15 text-brand-200"
                : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            <span aria-hidden>{r.icon}</span> {r.label}
          </button>
        ))}
      </div>
      {current && <p className="mb-4 text-[0.8rem] text-ink-faint">{current.blurb}</p>}

      {/* ---------- บทสนทนา ---------- */}
      <div
        ref={logRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="max-h-[36rem] min-h-[12rem] overflow-y-auto rounded-xl bg-surface-overlay px-3 py-3"
        aria-busy={running}
      >
        {items.length === 0 ? (
          <div className="grid gap-3 px-1 py-4">
            <p className="text-[0.85rem] text-ink-faint">ลองถามแบบนี้ก็ได้</p>
            <div className="flex flex-wrap gap-2">
              {current?.examples.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="rounded-xl border border-line bg-surface-raised px-3 py-2 text-left text-[0.84rem] text-ink-muted transition-colors hover:border-brand-500 hover:text-ink"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="grid gap-4">
            {items.map((it, i) =>
              it.kind === "user" ? (
                <li key={i} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand-500/15 px-3.5 py-2 text-[0.9rem] text-ink">
                    {it.text}
                  </p>
                </li>
              ) : (
                <li key={i} className="grid min-w-0 gap-2">
                  <p className="text-[0.76rem] font-bold text-ink-faint">
                    {roleOf(it.role)?.icon} {roleOf(it.role)?.label}
                    {!it.status && <span className="ml-2 animate-pulse font-normal text-amber-300">กำลังทำงาน…</span>}
                  </p>

                  {it.tools.length > 0 && (
                    <ul className="grid gap-0.5 border-l border-line pl-3">
                      {it.tools.map((t) => (
                        <ToolRow key={t.id} t={t} />
                      ))}
                    </ul>
                  )}

                  {it.branches.map((b) => (
                    <details
                      key={b.id}
                      open={b.status === "start"}
                      className="rounded-xl border border-line bg-surface-raised px-3 py-2"
                    >
                      <summary className="cursor-pointer select-none text-[0.8rem] font-bold text-ink-muted">
                        {roleOf(b.to)?.icon} มอบให้{roleOf(b.to)?.label}
                        <span
                          className={`ml-2 font-normal ${
                            b.status === "done" ? "text-brand-400" : b.status === "error" ? "text-red-400" : "animate-pulse text-amber-300"
                          }`}
                        >
                          {b.status === "done" ? "เสร็จแล้ว" : b.status === "error" ? "ไม่สำเร็จ" : "กำลังทำ…"}
                        </span>
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap text-[0.78rem] text-ink-faint">{b.task}</p>
                      {b.tools.length > 0 && (
                        <ul className="mt-2 grid gap-0.5 border-l border-line pl-3">
                          {b.tools.map((t) => (
                            <ToolRow key={t.id} t={t} />
                          ))}
                        </ul>
                      )}
                      {b.text && <TaskNote text={b.text} className="mt-2 text-[0.84rem]" />}
                    </details>
                  ))}

                  {it.text && <TaskNote text={it.text} />}

                  {it.proposals.map((p) => (
                    <ProposalCard
                      key={p.proposal.id}
                      view={p}
                      onApply={() => applyProposal(p.proposal)}
                      onDismiss={() => dismissProposal(p.proposal)}
                    />
                  ))}

                  {it.notices.map((n, j) => (
                    <p key={j} className="rounded-lg bg-amber-400/10 px-3 py-2 text-[0.8rem] text-amber-200">
                      {n}
                    </p>
                  ))}

                  {it.error && (
                    <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[0.84rem] text-red-300">
                      {it.error}
                    </p>
                  )}

                  {it.status && it.usage && (
                    <p className="text-[0.72rem] text-ink-faint">
                      {it.status !== "done" && `${STATUS_LABEL[it.status].label} · `}
                      {usd(it.usage.costUsd)} · {it.usage.steps} รอบคิด · {Math.round(it.usage.durationMs / 1000)} วิ
                    </p>
                  )}
                </li>
              )
            )}
          </ol>
        )}
      </div>

      {/* ---------- ช่องพิมพ์ ---------- */}
      {full ? (
        <p className="mt-3 rounded-xl border border-dashed border-line px-4 py-3 text-[0.85rem] text-ink-muted">
          บทสนทนานี้ยาวถึงเพดานแล้ว (ทุกข้อความถูกส่งให้ผู้ช่วยอ่านใหม่ทุกครั้ง ยิ่งยาวยิ่งช้าและแพง){" "}
          <button type="button" onClick={reset} className="font-bold text-brand-400 hover:underline">
            เริ่มบทสนทนาใหม่
          </button>
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mt-3"
        >
          <textarea
            rows={2}
            value={input}
            maxLength={MAX_TURN_CHARS}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่ — แบบเดียวกับห้องคุยงาน
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={`ถาม${current?.label ?? "ผู้ช่วย"}… (Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่)`}
            className="w-full resize-y rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {running ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="rounded-xl border border-line px-4 py-2 text-[0.9rem] font-bold text-ink hover:border-red-400 hover:text-red-300"
              >
                หยุด
              </button>
            ) : (
              <button
                type="submit"
                disabled={input.trim().length === 0}
                className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 disabled:opacity-40"
              >
                ส่ง
              </button>
            )}
            {items.length > 0 && !running && (
              <button type="button" onClick={reset} className="text-[0.84rem] font-semibold text-ink-faint hover:text-ink">
                เริ่มบทสนทนาใหม่
              </button>
            )}
            {notes.length > 0 && !running && (
              <span className="text-[0.78rem] text-ink-faint">ผู้ช่วยจะรู้ผลการยืนยันร่างในข้อความถัดไป</span>
            )}
          </div>
        </form>
      )}

      <RunLog projectId={projectId} refreshKey={runsVersion} />
    </section>
  );
}
