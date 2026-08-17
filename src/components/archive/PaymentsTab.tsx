"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChargesPanel } from "@/components/archive/ChargesPanel";
import { thaiDate, todayIso } from "@/lib/project-tasks";
import {
  PAYMENT_SELECT,
  PAYMENT_STATUSES,
  baht,
  parseAmount,
  paymentErrorMessage,
  statusOf,
  totalsOf,
  type PaymentStatus,
  type ProjectPayment,
} from "@/lib/project-payments";

/**
 * แท็บงวดจ่าย
 *
 * ลูกค้าในโปรเจกต์เห็นตารางนี้ด้วย (คนที่กำลังจะจ่ายงวด 3 ต้องรู้ว่าจ่ายไปแล้วเท่าไหร่)
 * แต่แก้ได้เฉพาะเจ้าของ — ตัวที่กันจริงคือ policy `project_payments_write` ใน 0002
 *
 * ⚠️ ห้ามเพิ่มช่องต้นทุน/กำไร/เรทที่คิดจริงลงในตารางนี้ ดูเหตุผลใน lib/project-payments.ts
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

/** ค่าที่กรอกในฟอร์ม — เก็บเงินเป็นข้อความเพราะระหว่างพิมพ์ยังไม่เป็นตัวเลขที่ถูก */
type Draft = { label: string; amount: string; status: PaymentStatus; due_label: string; paid_on: string };

const EMPTY: Draft = { label: "", amount: "", status: "pending", due_label: "", paid_on: "" };

function draftOf(p: ProjectPayment): Draft {
  return {
    label: p.label,
    amount: String(p.amount),
    status: p.status,
    due_label: p.due_label ?? "",
    paid_on: p.paid_on ?? "",
  };
}

export function PaymentsTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const [rows, setRows] = useState<ProjectPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [adding, setAdding] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_payments")
      .select(PAYMENT_SELECT)
      .eq("project_id", projectId)
      .order("sort");
    return { rows: (data ?? []) as ProjectPayment[], error: e };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await load();
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setRows(r.rows);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function reload() {
    const r = await load();
    if (r.error) setError(r.error.message);
    else setRows(r.rows);
  }

  /** แปลง draft เป็นค่าที่ส่งเข้า DB — คืน null พร้อมตั้ง error ถ้ากรอกไม่ครบ */
  function payload(d: Draft) {
    const label = d.label.trim();
    if (!label) {
      setError("ใส่ชื่องวดด้วย เช่น มัดจำ 30% หรือ งวดที่ 2 — ส่งแดชบอร์ด");
      return null;
    }

    const amount = parseAmount(d.amount);
    if (amount === null) {
      setError("จำนวนเงินไม่ถูกต้อง ใส่เป็นตัวเลข เช่น 24000 หรือ 24,000");
      return null;
    }

    return {
      label,
      amount,
      status: d.status,
      due_label: d.due_label.trim() || null,
      // จ่ายแล้วแต่ไม่ได้ระบุวัน ให้ลงวันนี้ · ยังไม่จ่ายก็ไม่ควรมีวันที่จ่ายค้างอยู่
      paid_on: d.status === "paid" ? d.paid_on || todayIso() : null,
    };
  }

  async function add() {
    const body = payload(draft);
    if (!body) return;

    setBusy("new");
    const sort = Math.max(0, ...(rows ?? []).map((r) => r.sort)) + 1;
    const { error: e } = await supabase
      .from("project_payments")
      .insert({ project_id: projectId, ...body, sort });
    setBusy(null);

    if (e) {
      setError(paymentErrorMessage(e, "เพิ่มงวดไม่สำเร็จ"));
      return;
    }
    setDraft(EMPTY);
    setAdding(false);
    setError(null);
    await reload();
  }

  async function save(id: string) {
    const body = payload(draft);
    if (!body) return;

    setBusy(id);
    const { error: e } = await supabase.from("project_payments").update(body).eq("id", id);
    setBusy(null);

    if (e) {
      setError(paymentErrorMessage(e, "บันทึกไม่สำเร็จ"));
      return;
    }
    setEditing(null);
    setError(null);
    await reload();
  }

  /** ปุ่มลัดที่ใช้บ่อยที่สุด — เงินเข้าแล้วกดทีเดียวจบ ไม่ต้องเปิดฟอร์ม */
  async function markPaid(p: ProjectPayment) {
    setBusy(p.id);
    const { error: e } = await supabase
      .from("project_payments")
      .update({ status: "paid", paid_on: p.paid_on ?? todayIso() })
      .eq("id", p.id);
    setBusy(null);
    if (e) setError(paymentErrorMessage(e, "อัปเดตสถานะไม่สำเร็จ"));
    await reload();
  }

  async function remove(p: ProjectPayment) {
    if (!confirm(`ลบงวด "${p.label}" (${baht(p.amount)} ฿) ออกจากโปรเจกต์นี้?`)) return;

    setBusy(p.id);
    const { error: e } = await supabase.from("project_payments").delete().eq("id", p.id);
    setBusy(null);
    if (e) setError(paymentErrorMessage(e, "ลบงวดไม่สำเร็จ"));
    await reload();
  }

  /** เลื่อนลำดับ — สลับ sort กับตัวข้าง ๆ ทีละขั้น */
  async function move(p: ProjectPayment, dir: -1 | 1) {
    const list = rows ?? [];
    const i = list.findIndex((x) => x.id === p.id);
    const other = list[i + dir];
    if (!other) return;

    setBusy(p.id);
    // sort ซ้ำกันได้ (ไม่มี unique) จึงสลับค่าตรง ๆ ได้โดยไม่ต้องพักค่ากลาง
    const [a, b] = await Promise.all([
      supabase.from("project_payments").update({ sort: other.sort }).eq("id", p.id),
      supabase.from("project_payments").update({ sort: p.sort }).eq("id", other.id),
    ]);
    setBusy(null);
    if (a.error || b.error) setError(paymentErrorMessage(a.error ?? b.error, "เรียงลำดับไม่สำเร็จ"));
    await reload();
  }

  const totals = totalsOf(rows ?? []);

  const form = (onSubmit: () => void, onCancel: () => void, submitLabel: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-2 rounded-xl border border-line bg-surface-overlay p-3 sm:grid-cols-2"
    >
      <input
        autoFocus
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        placeholder="ชื่องวด เช่น มัดจำ 30%"
        className={`${field} sm:col-span-2`}
      />

      <input
        value={draft.amount}
        onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
        inputMode="decimal"
        placeholder="จำนวนเงิน เช่น 24000"
        className={field}
      />

      <select
        value={draft.status}
        onChange={(e) => setDraft({ ...draft, status: e.target.value as PaymentStatus })}
        aria-label="สถานะ"
        className={field}
      >
        {PAYMENT_STATUSES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      {draft.status === "paid" ? (
        <label className="grid gap-1 text-[0.78rem] text-ink-faint">
          จ่ายเมื่อ (เว้นว่าง = วันนี้)
          <input
            type="date"
            value={draft.paid_on}
            onChange={(e) => setDraft({ ...draft, paid_on: e.target.value })}
            className={field}
          />
        </label>
      ) : (
        <input
          value={draft.due_label}
          onChange={(e) => setDraft({ ...draft, due_label: e.target.value })}
          placeholder="กำหนดชำระ เช่น รอส่งมอบ, สิ้นเดือน"
          className={field}
        />
      )}

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-[0.9rem] font-bold text-ink-faint transition-colors hover:text-ink"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );

  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-6">
      <h2 className="mb-3 text-base font-bold tracking-tight">งวดจ่าย</h2>

      {error && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.88rem] text-red-300"
        >
          <span className="break-all">{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      {rows === null ? (
        <p className="text-sm text-ink-faint">กำลังโหลด…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-faint">ยังไม่มีงวดจ่ายในโปรเจกต์นี้</p>
      ) : (
        <ul className="grid gap-2">
          {rows.map((p, i) => {
            const s = statusOf(p.status);

            if (editing === p.id) {
              return (
                <li key={p.id}>
                  {form(() => save(p.id), () => setEditing(null), "บันทึก")}
                </li>
              );
            }

            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink-muted">{p.label}</span>
                  <span className="block text-[0.76rem] text-ink-faint">
                    {p.status === "paid"
                      ? p.paid_on
                        ? `จ่ายแล้ว ${thaiDate(p.paid_on)}`
                        : "จ่ายแล้ว"
                      : (p.due_label ?? s.label)}
                  </span>
                </span>

                <span className={`flex-none font-bold tabular-nums ${s.tone}`}>
                  {baht(p.amount)} ฿
                </span>

                {canManage && (
                  <span className="flex flex-none items-center gap-1">
                    {p.status !== "paid" && (
                      <button
                        type="button"
                        onClick={() => markPaid(p)}
                        disabled={busy === p.id}
                        className="rounded-lg border border-line px-2.5 py-1.5 text-[0.8rem] font-bold text-ink-muted transition-colors hover:text-brand-400 disabled:opacity-50"
                      >
                        ได้รับเงินแล้ว
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => move(p, -1)}
                      disabled={busy === p.id || i === 0}
                      aria-label={`เลื่อน ${p.label} ขึ้น`}
                      className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(p, 1)}
                      disabled={busy === p.id || i === rows.length - 1}
                      aria-label={`เลื่อน ${p.label} ลง`}
                      className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(draftOf(p));
                        setAdding(false);
                        setEditing(p.id);
                      }}
                      disabled={busy === p.id}
                      className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p)}
                      disabled={busy === p.id}
                      className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-red-400 disabled:opacity-50"
                    >
                      ลบ
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rows !== null && rows.length > 0 && (
        <dl className="mt-4 grid gap-x-6 gap-y-1 border-t border-line pt-3 text-sm sm:grid-cols-3">
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-[0.78rem] text-ink-faint">รวมทั้งหมด</dt>
            <dd className="font-bold tabular-nums text-ink">{baht(totals.all)} ฿</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-[0.78rem] text-ink-faint">จ่ายแล้ว</dt>
            <dd className="font-bold tabular-nums text-brand-400">{baht(totals.paid)} ฿</dd>
          </div>
          <div className="flex justify-between gap-3 sm:block">
            <dt className="text-[0.78rem] text-ink-faint">คงเหลือ</dt>
            <dd className={`font-bold tabular-nums ${totals.overdue > 0 ? "text-red-400" : "text-ink"}`}>
              {baht(totals.left)} ฿
              {totals.overdue > 0 && (
                <span className="ml-1 text-[0.76rem] font-normal text-red-400">
                  (เลยกำหนด {baht(totals.overdue)} ฿)
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}

      {canManage && (
        <div className="mt-4">
          {adding ? (
            form(add, () => setAdding(false), "เพิ่มงวด")
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(EMPTY);
                setEditing(null);
                setAdding(true);
              }}
              className="rounded-xl border border-line px-4 py-2 text-[0.9rem] font-bold text-ink-muted transition-colors hover:text-ink"
            >
              ＋ เพิ่มงวดจ่าย
            </button>
          )}

          <p className="mt-3 text-[0.8rem] text-ink-faint">
            ตารางนี้ลูกค้าในโปรเจกต์เห็นด้วย — ใส่เฉพาะยอดที่เรียกเก็บ ไม่ใช่ต้นทุนหรือกำไรฝั่งเรา
          </p>
        </div>
      )}

      <ChargesPanel projectId={projectId} canManage={canManage} paymentsTotal={totals.all} />
    </section>
  );
}
