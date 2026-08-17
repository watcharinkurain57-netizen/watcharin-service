"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CHARGE_CATEGORIES,
  CHARGE_SELECT,
  baht,
  byCategory,
  categoryOf,
  chargeTotal,
  chargesTotal,
  parseAmount,
  parseMonths,
  parseQty,
  paymentErrorMessage,
  type ChargeCategory,
  type ProjectCharge,
} from "@/lib/project-payments";

/**
 * รายการที่เรียกเก็บ — แจกแจงว่าเงินก้อนนี้เป็นค่าอะไรบ้าง
 *
 * อยู่ใต้ตารางงวดจ่ายในแท็บเงิน เพราะตอบคนละคำถาม:
 * งวดจ่าย = แบ่งจ่ายยังไง · รายการนี้ = เก็บค่าอะไร
 *
 * ⚠️ ลูกค้าในโปรเจกต์เห็นตารางนี้ด้วย เป็นราคาที่เรียกเก็บ ไม่ใช่ต้นทุนที่เราจ่าย
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

type Draft = {
  category: ChargeCategory;
  label: string;
  qty: string;
  unit_amount: string;
  months: string;
  note: string;
};

const EMPTY: Draft = { category: "hardware", label: "", qty: "1", unit_amount: "", months: "", note: "" };

function draftOf(c: ProjectCharge): Draft {
  return {
    category: c.category,
    label: c.label,
    qty: String(c.qty),
    unit_amount: String(c.unit_amount),
    months: c.months === null ? "" : String(c.months),
    note: c.note ?? "",
  };
}

/** อธิบายที่มาของยอดให้อ่านออกโดยไม่ต้องกดเข้าไปดู เช่น "900 ฿ × 12 เดือน" */
function breakdownOf(c: { qty: number; unit_amount: number; months: number | null }): string | null {
  const parts: string[] = [];
  if (c.qty !== 1) parts.push(`${baht(c.qty)} หน่วย`);
  if (c.months) parts.push(`${c.months} เดือน`);
  if (parts.length === 0) return null;
  return `${baht(c.unit_amount)} ฿ × ${parts.join(" × ")}`;
}

export function ChargesPanel({
  projectId,
  canManage,
  paymentsTotal,
}: {
  projectId: string;
  canManage: boolean;
  /** ยอดรวมงวดจ่ายด้านบน — เอามาเทียบให้เห็นว่าแจกแจงครบหรือยัง */
  paymentsTotal: number;
}) {
  const [rows, setRows] = useState<ProjectCharge[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_charges")
      .select(CHARGE_SELECT)
      .eq("project_id", projectId)
      .order("sort");
    return { rows: (data ?? []) as ProjectCharge[], error: e };
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

  /** แปลง draft เป็นค่าที่ส่งเข้า DB — คืน null พร้อมตั้ง error ถ้ากรอกไม่ผ่าน */
  function payload(d: Draft) {
    const label = d.label.trim();
    if (!label) {
      setError("ใส่ชื่อรายการด้วย เช่น เซ็นเซอร์วัดอุณหภูมิ หรือ License SCADA");
      return null;
    }

    const unit_amount = parseAmount(d.unit_amount);
    if (unit_amount === null) {
      setError("ราคาต่อหน่วยไม่ถูกต้อง ใส่เป็นตัวเลข เช่น 2500 หรือ 2,500");
      return null;
    }

    const qty = parseQty(d.qty);
    if (qty === null) {
      setError("จำนวนต้องมากกว่า 0");
      return null;
    }

    const months = parseMonths(d.months);
    if (!months.ok) {
      setError("จำนวนเดือนต้องเป็นจำนวนเต็มบวก เว้นว่างไว้ถ้าไม่ใช่ของรายเดือน");
      return null;
    }

    return { category: d.category, label, qty, unit_amount, months: months.value, note: d.note.trim() || null };
  }

  async function add() {
    const body = payload(draft);
    if (!body) return;

    setBusy("new");
    const sort = Math.max(0, ...(rows ?? []).map((r) => r.sort)) + 1;
    const { error: e } = await supabase.from("project_charges").insert({ project_id: projectId, ...body, sort });
    setBusy(null);

    if (e) {
      setError(paymentErrorMessage(e, "เพิ่มรายการไม่สำเร็จ"));
      return;
    }
    // คงหมวดเดิมไว้ เพราะคนมักใส่ของหมวดเดียวกันติดกันหลายรายการ
    setDraft({ ...EMPTY, category: draft.category });
    setError(null);
    await reload();
  }

  async function save(id: string) {
    const body = payload(draft);
    if (!body) return;

    setBusy(id);
    const { error: e } = await supabase.from("project_charges").update(body).eq("id", id);
    setBusy(null);

    if (e) {
      setError(paymentErrorMessage(e, "บันทึกไม่สำเร็จ"));
      return;
    }
    setEditing(null);
    setError(null);
    await reload();
  }

  async function remove(c: ProjectCharge) {
    if (!confirm(`ลบรายการ "${c.label}" (${baht(c.total)} ฿)?`)) return;
    setBusy(c.id);
    const { error: e } = await supabase.from("project_charges").delete().eq("id", c.id);
    setBusy(null);
    if (e) setError(paymentErrorMessage(e, "ลบรายการไม่สำเร็จ"));
    await reload();
  }

  const list = rows ?? [];
  const total = chargesTotal(list);
  const groups = byCategory(list);

  // พรีวิวยอดระหว่างพิมพ์ ให้เห็นเลยว่า 900 × 12 เดือน จะออกมาเท่าไหร่
  const previewAmount = parseAmount(draft.unit_amount);
  const previewQty = parseQty(draft.qty);
  const previewMonths = parseMonths(draft.months);
  const preview =
    previewAmount !== null && previewQty !== null && previewMonths.ok
      ? chargeTotal(previewAmount, previewQty, previewMonths.value)
      : null;

  const form = (onSubmit: () => void, onCancel: (() => void) | null, submitLabel: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-2 rounded-xl border border-line bg-surface-overlay p-3 sm:grid-cols-6"
    >
      <select
        value={draft.category}
        onChange={(e) => setDraft({ ...draft, category: e.target.value as ChargeCategory })}
        aria-label="หมวด"
        className={`${field} sm:col-span-2`}
      >
        {CHARGE_CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        value={draft.label}
        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
        placeholder="ชื่อรายการ เช่น เซ็นเซอร์วัดอุณหภูมิ"
        className={`${field} sm:col-span-4`}
      />

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        ราคาต่อหน่วย
        <input
          value={draft.unit_amount}
          onChange={(e) => setDraft({ ...draft, unit_amount: e.target.value })}
          inputMode="decimal"
          placeholder="2500"
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        จำนวน
        <input
          value={draft.qty}
          onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
          inputMode="decimal"
          placeholder="1"
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        กี่เดือน (เว้นว่าง = จ่ายครั้งเดียว)
        <input
          value={draft.months}
          onChange={(e) => setDraft({ ...draft, months: e.target.value })}
          inputMode="numeric"
          placeholder="12"
          className={field}
        />
      </label>

      <input
        value={draft.note}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        placeholder="หมายเหตุ (ไม่ใส่ก็ได้)"
        className={`${field} sm:col-span-6`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:col-span-6">
        <button
          type="submit"
          disabled={busy !== null}
          className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-[0.9rem] font-bold text-ink-faint transition-colors hover:text-ink"
          >
            ยกเลิก
          </button>
        )}
        {preview !== null && (
          <span className="text-[0.85rem] text-ink-faint">
            รวมรายการนี้ <b className="font-bold tabular-nums text-ink">{baht(preview)} ฿</b>
          </span>
        )}
      </div>
    </form>
  );

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="mb-1 text-[0.95rem] font-bold">รายการที่เรียกเก็บ</h3>
      <p className="mb-4 max-w-[56ch] text-[0.85rem] text-ink-muted">
        แจกแจงว่าเงินก้อนนี้เป็นค่าอะไรบ้าง — ตารางงวดจ่ายด้านบนบอกว่าแบ่งจ่ายยังไง ส่วนตรงนี้บอกว่าเก็บค่าอะไร
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

      {rows === null ? (
        <p className="text-sm text-ink-faint">กำลังโหลด…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-ink-faint">ยังไม่มีรายการแจกแจง</p>
      ) : (
        <>
          <ul className="grid gap-2">
            {list.map((c) => {
              if (editing === c.id) {
                return <li key={c.id}>{form(() => save(c.id), () => setEditing(null), "บันทึก")}</li>;
              }

              const cat = categoryOf(c.category);
              const breakdown = breakdownOf(c);

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
                    {(breakdown || c.note) && (
                      <span className="block truncate text-[0.76rem] text-ink-faint">
                        {[breakdown, c.note].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>

                  <span className="flex-none font-bold tabular-nums text-ink">{baht(c.total)} ฿</span>

                  {canManage && (
                    <span className="flex flex-none items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(draftOf(c));
                          setAdding(false);
                          setEditing(c.id);
                        }}
                        disabled={busy === c.id}
                        className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        disabled={busy === c.id}
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

          {/* สรุปแยกหมวด — ตอบคำถาม "เงินไปลงตรงไหนมากที่สุด" ได้ในบรรทัดเดียว */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[0.82rem]">
            {groups.map((g) => (
              <span key={g.id} className="text-ink-faint">
                {g.label} <b className="font-bold tabular-nums text-ink-muted">{baht(g.total)} ฿</b>
              </span>
            ))}
            <span className="ml-auto text-ink-faint">
              รวมรายการ <b className="font-bold tabular-nums text-ink">{baht(total)} ฿</b>
            </span>
          </div>

          {/*
            เตือนเมื่อยอดสองตารางไม่ตรงกัน — ไม่ใช่ error เพราะระหว่างทาง
            อาจยังใส่ไม่ครบ แต่ถ้าปล่อยเงียบแล้วส่งให้ลูกค้าดูจะโดนถามแน่
          */}
          {paymentsTotal > 0 && Math.abs(total - paymentsTotal) > 0.01 && (
            <p className="mt-2 text-[0.8rem] text-amber-400">
              รายการแจกแจงรวม {baht(total)} ฿ ไม่ตรงกับงวดจ่ายรวม {baht(paymentsTotal)} ฿ (ต่างกัน{" "}
              {baht(Math.abs(total - paymentsTotal))} ฿)
            </p>
          )}
        </>
      )}

      {canManage && (
        <div className="mt-4">
          {adding || list.length === 0 ? (
            form(add, list.length === 0 ? null : () => setAdding(false), "เพิ่มรายการ")
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
              ＋ เพิ่มรายการ
            </button>
          )}
        </div>
      )}
    </div>
  );
}
