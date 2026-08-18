"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { baht, parseAmount, parseMonths, parseQty, paymentErrorMessage } from "@/lib/project-payments";
import { thaiDate, todayIso } from "@/lib/project-tasks";
import {
  COST_CATEGORIES,
  COST_SELECT,
  costCategoryOf,
  costsByCategory,
  marginOf,
  type CostCategory,
  type ProjectCost,
} from "@/lib/project-costs";

/**
 * ต้นทุนและกำไร — เจ้าของโปรเจกต์เห็นคนเดียว
 *
 * ⚠️⚠️ พับไว้เป็นค่าเริ่มต้นโดยตั้งใจ ไม่ใช่เพื่อความสวยงาม
 * เจ้าของประชุมกับลูกค้าแบบแชร์จอ และแท็บเงินคือแท็บที่เปิดคุยกันบ่อย
 * ถ้าแผงนี้กางอยู่ ตัวเลขต้นทุนกับกำไรจะโดนเห็นโดยไม่ตั้งใจ
 *
 * RLS กันที่ฐานข้อมูลอยู่แล้ว (ลูกค้าอ่านตารางนี้ไม่ได้เลย) การพับจึงไม่ใช่
 * มาตรการความปลอดภัย แต่เป็นการกันความซวยตอนแชร์จอ ซึ่ง RLS ช่วยไม่ได้
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

type Draft = {
  category: CostCategory;
  label: string;
  qty: string;
  unit_amount: string;
  months: string;
  vendor: string;
  paid_on: string;
  note: string;
};

const EMPTY: Draft = {
  category: "hardware",
  label: "",
  qty: "1",
  unit_amount: "",
  months: "",
  vendor: "",
  paid_on: "",
  note: "",
};

function draftOf(c: ProjectCost): Draft {
  return {
    category: c.category,
    label: c.label,
    qty: String(c.qty),
    unit_amount: String(c.unit_amount),
    months: c.months === null ? "" : String(c.months),
    vendor: c.vendor ?? "",
    paid_on: c.paid_on ?? "",
    note: c.note ?? "",
  };
}

export function CostsPanel({
  projectId,
  revenue,
  received,
}: {
  projectId: string;
  /** มูลค่างานทั้งหมดจากตารางงวดจ่าย */
  revenue: number;
  /** เงินที่ลูกค้าจ่ายมาแล้วจริง */
  received: number;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ProjectCost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_costs")
      .select(COST_SELECT)
      .eq("project_id", projectId)
      .order("sort");
    return { rows: (data ?? []) as ProjectCost[], error: e };
  }, [supabase, projectId]);

  // โหลดตอนกางครั้งแรกเท่านั้น — ไม่กางก็ไม่ต้องยิงถาม
  useEffect(() => {
    if (!open || rows !== null) return;
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
  }, [open, rows, load]);

  async function reload() {
    const r = await load();
    if (r.error) setError(r.error.message);
    else setRows(r.rows);
  }

  function payload(d: Draft) {
    const label = d.label.trim();
    if (!label) {
      setError("ใส่ชื่อรายการต้นทุนด้วย");
      return null;
    }
    const unit_amount = parseAmount(d.unit_amount);
    if (unit_amount === null) {
      setError("ราคาต่อหน่วยไม่ถูกต้อง");
      return null;
    }
    const qty = parseQty(d.qty);
    if (qty === null) {
      setError("จำนวนต้องมากกว่า 0");
      return null;
    }
    const months = parseMonths(d.months);
    if (!months.ok) {
      setError("จำนวนเดือนต้องเป็นจำนวนเต็มบวก เว้นว่างถ้าไม่ใช่ของรายเดือน");
      return null;
    }
    return {
      category: d.category,
      label,
      qty,
      unit_amount,
      months: months.value,
      vendor: d.vendor.trim() || null,
      paid_on: d.paid_on || null,
      note: d.note.trim() || null,
    };
  }

  async function add() {
    const body = payload(draft);
    if (!body) return;
    setBusy("new");
    const sort = Math.max(0, ...(rows ?? []).map((r) => r.sort)) + 1;
    const { error: e } = await supabase.from("project_costs").insert({ project_id: projectId, ...body, sort });
    setBusy(null);
    if (e) return setError(paymentErrorMessage(e, "เพิ่มต้นทุนไม่สำเร็จ"));
    setDraft({ ...EMPTY, category: draft.category });
    setAdding(false);
    setError(null);
    await reload();
  }

  async function save(id: string) {
    const body = payload(draft);
    if (!body) return;
    setBusy(id);
    const { error: e } = await supabase.from("project_costs").update(body).eq("id", id);
    setBusy(null);
    if (e) return setError(paymentErrorMessage(e, "บันทึกไม่สำเร็จ"));
    setEditing(null);
    setError(null);
    await reload();
  }

  /** สลับว่าจ่ายไปแล้วหรือยัง — ตัวนี้เป็นตัวแยก "ตั้งไว้" ออกจาก "เงินออกจริง" */
  async function markPaid(c: ProjectCost) {
    setBusy(c.id);
    const { error: e } = await supabase
      .from("project_costs")
      .update({ paid_on: c.paid_on ? null : todayIso() })
      .eq("id", c.id);
    setBusy(null);
    if (e) setError(paymentErrorMessage(e, "อัปเดตไม่สำเร็จ"));
    await reload();
  }

  async function remove(c: ProjectCost) {
    if (!confirm(`ลบต้นทุน "${c.label}" (${baht(c.total)} ฿)?`)) return;
    setBusy(c.id);
    const { error: e } = await supabase.from("project_costs").delete().eq("id", c.id);
    setBusy(null);
    if (e) setError(paymentErrorMessage(e, "ลบไม่สำเร็จ"));
    await reload();
  }

  const list = rows ?? [];
  const m = marginOf(list, revenue, received);
  const groups = costsByCategory(list);

  const form = (onSubmit: () => void, onCancel: () => void, submitLabel: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-2 rounded-xl border border-line bg-surface-overlay p-3 sm:grid-cols-6"
    >
      <select
        value={draft.category}
        onChange={(e) => setDraft({ ...draft, category: e.target.value as CostCategory })}
        aria-label="หมวดต้นทุน"
        className={`${field} sm:col-span-2`}
      >
        {COST_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        placeholder="ชื่อรายการ เช่น Supabase Pro"
        className={`${field} sm:col-span-4`}
      />

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        ราคาต่อหน่วย
        <input
          value={draft.unit_amount}
          onChange={(e) => setDraft({ ...draft, unit_amount: e.target.value })}
          inputMode="decimal"
          placeholder="900"
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        จำนวน
        <input
          value={draft.qty}
          onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
          inputMode="decimal"
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        กี่เดือน (เว้นว่าง = ครั้งเดียว)
        <input
          value={draft.months}
          onChange={(e) => setDraft({ ...draft, months: e.target.value })}
          inputMode="numeric"
          placeholder="12"
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-3">
        ซื้อจากใคร (ไม่ใส่ก็ได้)
        <input
          value={draft.vendor}
          onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
          placeholder="เช่น Supabase, ร้านอะไหล่"
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-3">
        จ่ายจริงเมื่อ (เว้นว่าง = ยังไม่จ่าย)
        <input
          type="date"
          value={draft.paid_on}
          onChange={(e) => setDraft({ ...draft, paid_on: e.target.value })}
          className={field}
        />
      </label>

      <input
        value={draft.note}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        placeholder="หมายเหตุ (ไม่ใส่ก็ได้)"
        className={`${field} sm:col-span-6`}
      />

      <div className="flex flex-wrap gap-2 sm:col-span-6">
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
    <div className="mt-5 border-t border-line pt-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-2 text-left"
      >
        <span className="text-[0.95rem] font-bold">ต้นทุนและกำไร</span>
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[0.7rem] font-bold text-red-300">
          คุณเห็นคนเดียว
        </span>
        <span className="ml-auto text-[0.82rem] font-bold text-ink-faint">{open ? "ซ่อน" : "แสดง"}</span>
      </button>

      {!open ? (
        <p className="mt-2 text-[0.8rem] text-ink-faint">
          พับไว้เพราะแท็บนี้เป็นแท็บที่เปิดคุยกับลูกค้าบ่อย — กด “แสดง” ตอนที่ไม่ได้แชร์จอ
        </p>
      ) : (
        <div className="mt-3">
          <p className="mb-3 max-w-[58ch] rounded-xl border border-red-500/30 bg-red-500/5 px-3 py-2 text-[0.8rem] text-red-300">
            ⚠️ ส่วนนี้ลูกค้าเปิดดูไม่ได้เลย (กันที่ฐานข้อมูล ไม่ใช่แค่ซ่อนปุ่ม) —
            แต่ถ้ากำลังแชร์จออยู่ เขาเห็นได้ทางจอ
          </p>

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

          {/* ---------- สรุป ---------- */}
          <dl className="mb-4 grid gap-x-6 gap-y-2 rounded-xl bg-surface-overlay p-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[0.76rem] text-ink-faint">มูลค่างาน</dt>
              <dd className="font-bold tabular-nums text-ink">{baht(m.revenue)} ฿</dd>
            </div>
            <div>
              <dt className="text-[0.76rem] text-ink-faint">ต้นทุนรวม</dt>
              <dd className="font-bold tabular-nums text-amber-400">{baht(m.cost)} ฿</dd>
            </div>
            <div>
              <dt className="text-[0.76rem] text-ink-faint">กำไรคาดการณ์</dt>
              <dd className={`font-bold tabular-nums ${m.profit < 0 ? "text-red-400" : "text-brand-400"}`}>
                {baht(m.profit)} ฿
                {m.marginPct !== null && (
                  <span className="ml-1 text-[0.76rem] font-normal">({m.marginPct}%)</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[0.76rem] text-ink-faint">เงินสดตอนนี้</dt>
              <dd className={`font-bold tabular-nums ${m.cashNow < 0 ? "text-red-400" : "text-ink"}`}>
                {baht(m.cashNow)} ฿
              </dd>
            </div>
          </dl>

          <p className="mb-4 text-[0.78rem] text-ink-faint">
            กำไรคาดการณ์ = มูลค่างาน − ต้นทุนทั้งหมด (รวมที่ยังไม่จ่าย) · เงินสดตอนนี้ = รับมาแล้ว{" "}
            {baht(m.received)} ฿ − จ่ายไปแล้ว {baht(m.costPaid)} ฿
          </p>

          {/* ---------- รายการ ---------- */}
          {rows === null ? (
            <p className="text-sm text-ink-faint">กำลังโหลด…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีรายการต้นทุน</p>
          ) : (
            <>
              <ul className="grid gap-2">
                {list.map((c) => {
                  if (editing === c.id) {
                    return <li key={c.id}>{form(() => save(c.id), () => setEditing(null), "บันทึก")}</li>;
                  }
                  const cat = costCategoryOf(c.category);
                  const parts = [
                    c.qty !== 1 ? `${baht(c.qty)} หน่วย` : null,
                    c.months ? `${c.months} เดือน` : null,
                  ].filter(Boolean);

                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
                    >
                      <span className={`flex-none rounded-full px-2.5 py-1 text-[0.72rem] font-bold ${cat.tone}`}>
                        {cat.label}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ink-muted">{c.label}</span>
                        <span className="block truncate text-[0.76rem] text-ink-faint">
                          {parts.length > 0 && `${baht(c.unit_amount)} ฿ × ${parts.join(" × ")} · `}
                          {c.paid_on ? `จ่ายแล้ว ${thaiDate(c.paid_on)}` : "ยังไม่จ่าย"}
                          {c.vendor && ` · ${c.vendor}`}
                          {c.note && ` · ${c.note}`}
                        </span>
                      </span>

                      <span className="flex-none font-bold tabular-nums text-ink">{baht(c.total)} ฿</span>

                      <span className="flex flex-none items-center gap-1">
                        <button
                          type="button"
                          onClick={() => markPaid(c)}
                          disabled={busy === c.id}
                          className="rounded-lg border border-line px-2.5 py-1.5 text-[0.78rem] font-bold text-ink-muted transition-colors hover:text-brand-400 disabled:opacity-50"
                        >
                          {c.paid_on ? "ทำเป็นยังไม่จ่าย" : "จ่ายแล้ว"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(draftOf(c));
                            setAdding(false);
                            setEditing(c.id);
                          }}
                          disabled={busy === c.id}
                          className="rounded-lg px-2 py-1.5 text-[0.78rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c)}
                          disabled={busy === c.id}
                          className="rounded-lg px-2 py-1.5 text-[0.78rem] font-bold text-ink-faint transition-colors hover:text-red-400 disabled:opacity-50"
                        >
                          ลบ
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[0.82rem]">
                {groups.map((g) => (
                  <span key={g.id} className="text-ink-faint">
                    {g.label} <b className="font-bold tabular-nums text-ink-muted">{baht(g.total)} ฿</b>
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="mt-4">
            {adding ? (
              form(add, () => setAdding(false), "เพิ่มต้นทุน")
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...EMPTY, category: draft.category });
                  setEditing(null);
                  setAdding(true);
                }}
                className="rounded-xl border border-line px-4 py-2 text-[0.9rem] font-bold text-ink-muted transition-colors hover:text-ink"
              >
                ＋ เพิ่มต้นทุน
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
