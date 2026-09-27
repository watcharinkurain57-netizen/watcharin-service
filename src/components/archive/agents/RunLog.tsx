"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { RunStatus } from "@/lib/agents/protocol";
import { roleOf } from "@/lib/agents/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * สมุดบันทึกของผู้ช่วย — ส่วน "การจัดการ" ของระบบ agent
 *
 * ตอบคำถามที่เจ้าของต้องตอบได้เสมอ: ผู้ช่วยทำอะไรไปบ้าง ใช้เครื่องมืออะไร
 * ตอบสำเร็จไหม และเงินค่า API ไปอยู่ตรงไหน
 * RLS ของ agent_runs (0024) ให้เจ้าของโปรเจกต์เห็นทุกรอบในโปรเจกต์ คนอื่นเห็นแค่ของตัวเอง
 */

type RunRow = {
  id: string;
  role: string;
  status: RunStatus;
  model: string;
  iterations: number;
  tool_calls: { agent: string; name: string; ok: boolean }[];
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number | string | null;
  duration_ms: number | null;
  error: string | null;
  created_at: string;
};

const SELECT =
  "id, role, status, model, iterations, tool_calls, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_usd, duration_ms, error, created_at";

export const STATUS_LABEL: Record<RunStatus, { label: string; tone: string }> = {
  done: { label: "ตอบแล้ว", tone: "bg-brand-500/15 text-brand-300" },
  limit: { label: "ถึงเพดาน", tone: "bg-amber-400/15 text-amber-200" },
  refused: { label: "ปฏิเสธ", tone: "bg-orange-400/15 text-orange-200" },
  error: { label: "ผิดพลาด", tone: "bg-red-500/15 text-red-300" },
  aborted: { label: "หยุดกลางทาง", tone: "bg-white/10 text-ink-faint" },
};

export function usd(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n > 0 && n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("th-TH-u-ca-gregory", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** สัดส่วน input ที่อ่านจาก cache — ยิ่งสูงยิ่งประหยัด (อ่าน cache จ่ายราวสิบเปอร์เซ็นต์) */
function cacheShare(r: RunRow): number | null {
  const total = r.input_tokens + r.cache_read_tokens + r.cache_write_tokens;
  return total > 0 ? Math.round((r.cache_read_tokens / total) * 100) : null;
}

export function RunLog({ projectId, refreshKey }: { projectId: string; refreshKey: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<RunRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("agent_runs")
      .select(SELECT)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(30);
    return { rows: (data ?? []) as RunRow[], error: e };
  }, [supabase, projectId]);

  // โหลดเฉพาะตอนเปิดดู และโหลดใหม่ทุกครั้งที่ผู้ช่วยตอบจบหนึ่งรอบ (refreshKey เปลี่ยน)
  useEffect(() => {
    if (!open) return;
    let alive = true;
    load().then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error.message);
      else {
        setError(null);
        setRows(r.rows);
      }
    });
    return () => {
      alive = false;
    };
  }, [open, load, refreshKey]);

  const total = (rows ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);

  return (
    <details
      className="mt-6 rounded-xl border border-line bg-surface-overlay"
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-[0.88rem] font-bold text-ink">
        ประวัติการทำงานของผู้ช่วย
        <span className="ml-2 text-[0.78rem] font-normal text-ink-faint">ใครใช้ บทบาทไหน เรียกเครื่องมืออะไร เสียเท่าไหร่</span>
      </summary>

      <div className="border-t border-line px-4 py-3">
        {error && <p className="text-[0.84rem] text-red-300">{error}</p>}
        {!error && rows === null && <p className="text-[0.84rem] text-ink-faint">กำลังโหลด…</p>}
        {!error && rows?.length === 0 && <p className="text-[0.84rem] text-ink-faint">ยังไม่มีการใช้งาน</p>}

        {rows && rows.length > 0 && (
          <>
            <p className="mb-3 text-[0.8rem] text-ink-muted">
              {rows.length} รอบล่าสุด · รวมประมาณ <strong className="text-ink">{usd(total)}</strong>
              <span className="text-ink-faint"> (ตัวเลขประมาณจากตารางราคา ยอดจริงดูใน Anthropic Console)</span>
            </p>
            <ul className="grid gap-1.5">
              {rows.map((r) => {
                const tools = Array.isArray(r.tool_calls) ? r.tool_calls : [];
                const failed = tools.filter((t) => !t.ok).length;
                const share = cacheShare(r);
                return (
                  <li key={r.id} className="grid gap-1 rounded-lg bg-surface-raised px-3 py-2 text-[0.8rem]">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">
                        {roleOf(r.role)?.icon} {roleOf(r.role)?.label ?? r.role}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold ${STATUS_LABEL[r.status]?.tone ?? ""}`}>
                        {STATUS_LABEL[r.status]?.label ?? r.status}
                      </span>
                      <span className="text-ink-faint">{when(r.created_at)}</span>
                      <span className="ml-auto font-semibold tabular-nums text-ink">{usd(r.cost_usd)}</span>
                    </span>
                    <span className="text-ink-faint">
                      {r.iterations} รอบคิด · เครื่องมือ {tools.length} ครั้ง{failed > 0 && ` (พลาด ${failed})`}
                      {" · "}
                      {(r.input_tokens + r.cache_read_tokens + r.cache_write_tokens).toLocaleString("th-TH")} →{" "}
                      {r.output_tokens.toLocaleString("th-TH")} tokens
                      {share !== null && ` · cache ${share}%`}
                      {r.duration_ms !== null && ` · ${Math.round(r.duration_ms / 1000)} วิ`}
                    </span>
                    {tools.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {tools.slice(0, 12).map((t, i) => (
                          <span
                            key={i}
                            className={`rounded px-1.5 py-0.5 font-mono text-[0.7rem] ${
                              t.ok ? "bg-white/5 text-ink-muted" : "bg-red-500/10 text-red-300"
                            }`}
                            title={`${roleOf(t.agent)?.label ?? t.agent} · ${t.ok ? "สำเร็จ" : "ผิดพลาด"}`}
                          >
                            {t.name}
                          </span>
                        ))}
                        {tools.length > 12 && <span className="text-ink-faint">+{tools.length - 12}</span>}
                      </span>
                    )}
                    {r.error && <span className="break-all font-mono text-[0.72rem] text-red-300">{r.error}</span>}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </details>
  );
}
