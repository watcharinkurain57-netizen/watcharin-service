"use client";

import { useState } from "react";
import { MermaidView } from "@/components/archive/diagrams/MermaidView";
import { TaskNote } from "@/components/archive/tasks/TaskNote";
import type { Proposal, ProposalKind } from "@/lib/agents/proposals";
import { thaiDate } from "@/lib/project-tasks";

/**
 * การ์ด "ร่าง" ของผู้ช่วย — จุดเดียวที่ผลงานของผู้ช่วยกลายเป็นข้อมูลจริง
 *
 * ปุ่มยืนยันบอกผลที่จะเกิดตรง ๆ ("เพิ่มงานเหล่านี้") ไม่ใช่ "ตกลง"
 * เพราะคนต้องรู้ก่อนกดว่ากดแล้วอะไรจะเปลี่ยน ที่ไหน
 */

export type ProposalView = {
  proposal: Proposal;
  state: "pending" | "saving" | "saved" | "dismissed";
  /** ผลจากเซิร์ฟเวอร์หลังบันทึก หรือเหตุผลที่บันทึกไม่ได้ */
  message?: string;
  failed?: boolean;
};

const APPLY_LABEL: Record<ProposalKind, string> = {
  create_tasks: "เพิ่มงานเหล่านี้",
  create_diagram: "บันทึกผังนี้",
  post_comment: "ส่งในห้องคุยงาน",
};

function Body({ proposal }: { proposal: Proposal }) {
  const [showSource, setShowSource] = useState(false);

  if (proposal.kind === "create_tasks") {
    return (
      <ul className="grid gap-1.5">
        {proposal.payload.tasks.map((t, i) => (
          <li key={i} className="rounded-lg bg-surface-raised px-3 py-2 text-[0.86rem]">
            <span className="font-semibold text-ink">{t.title}</span>
            {(t.due_on || t.assignee_name) && (
              <span className="mt-0.5 block text-[0.76rem] text-ink-faint">
                {t.due_on && `กำหนดส่ง ${thaiDate(t.due_on)}`}
                {t.due_on && t.assignee_name && " · "}
                {t.assignee_name && `ให้ ${t.assignee_name}`}
              </span>
            )}
            {/* ตัวแสดงเดียวกับแท็บงาน — ร่างหน้าตาเหมือนตอนบันทึกแล้วทุกอย่าง */}
            {t.note && <TaskNote text={t.note} className="mt-1.5 text-[0.8rem]" />}
          </li>
        ))}
      </ul>
    );
  }

  if (proposal.kind === "create_diagram") {
    return (
      <div className="grid gap-2">
        <p className="text-[0.86rem] font-semibold text-ink">{proposal.payload.title}</p>
        {/* วาดตัวอย่างให้เห็นก่อนบันทึก — mermaid ตรวจไวยากรณ์ในโหมด strict อยู่แล้ว */}
        <div className="overflow-hidden rounded-lg bg-surface-raised p-2">
          <MermaidView source={proposal.payload.source} />
        </div>
        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          className="justify-self-start text-[0.76rem] font-semibold text-ink-faint hover:text-ink"
        >
          {showSource ? "ซ่อนต้นฉบับ" : "ดูต้นฉบับ mermaid"}
        </button>
        {showSource && (
          <pre className="max-h-60 overflow-auto rounded-lg bg-surface px-3 py-2 font-mono text-[0.76rem] text-ink-muted">
            {proposal.payload.source}
          </pre>
        )}
      </div>
    );
  }

  return (
    <blockquote className="whitespace-pre-wrap break-words rounded-lg border-l-2 border-brand-500 bg-surface-raised px-3 py-2 text-[0.88rem] text-ink-muted">
      {proposal.payload.body}
    </blockquote>
  );
}

export function ProposalCard({
  view,
  onApply,
  onDismiss,
}: {
  view: ProposalView;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const { proposal, state } = view;
  const settled = state === "saved" || state === "dismissed";

  return (
    <div
      className={`rounded-xl border px-3 py-3 ${
        state === "saved"
          ? "border-brand-500/40 bg-brand-500/5"
          : state === "dismissed"
            ? "border-line opacity-60"
            : "border-amber-400/40 bg-amber-400/5"
      }`}
    >
      <p className="mb-2 flex flex-wrap items-center gap-2 text-[0.8rem] font-bold">
        <span
          className={`rounded-full px-2 py-0.5 text-[0.7rem] ${
            state === "saved"
              ? "bg-brand-500/15 text-brand-300"
              : state === "dismissed"
                ? "bg-white/10 text-ink-faint"
                : "bg-amber-400/15 text-amber-200"
          }`}
        >
          {state === "saved" ? "บันทึกแล้ว" : state === "dismissed" ? "ไม่เอา" : "ร่าง · รอคุณยืนยัน"}
        </span>
        <span className="text-ink">{proposal.summary}</span>
      </p>

      <Body proposal={proposal} />

      {view.message && (
        <p className={`mt-2 text-[0.8rem] ${view.failed ? "text-red-300" : "text-brand-300"}`}>{view.message}</p>
      )}

      {!settled && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onApply}
            disabled={state === "saving"}
            className="rounded-lg bg-brand-500 px-3 py-1.5 text-[0.84rem] font-bold text-brand-950 disabled:opacity-50"
          >
            {state === "saving" ? "กำลังบันทึก…" : APPLY_LABEL[proposal.kind]}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            disabled={state === "saving"}
            className="rounded-lg px-3 py-1.5 text-[0.84rem] font-bold text-ink-faint hover:text-ink disabled:opacity-50"
          >
            ไม่เอา
          </button>
        </div>
      )}
    </div>
  );
}
