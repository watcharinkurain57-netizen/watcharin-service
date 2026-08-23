"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/archive/tasks/Avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  REQUEST_SELECT,
  STATUS_FOR_ADMIN,
  requestDate,
  type ProjectRequest,
  type RequestStatus,
} from "@/lib/project-requests";
import { PROFILE_SELECT, type Person } from "@/lib/project-tasks";

/**
 * กล่องคำขอของเจ้าของเว็บ
 *
 * เรียงใบที่ยังไม่ได้ดูขึ้นก่อนเสมอ ไม่ใช่เรียงตามเวลาล้วน — หน้านี้เปิดมา
 * เพื่อตอบคำถามเดียวว่า "มีอะไรรอฉันอยู่" ถ้าใบใหม่ไปแทรกกลางรายการที่ปิดไปแล้ว
 * ก็ต้องมานั่งไล่หาเอง ซึ่งเป็นงานที่หน้านี้ควรทำให้
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.88rem] text-ink outline-none transition-colors focus:border-brand-500";

/** ใบที่ยังไม่ได้ดูมาก่อน แล้วค่อยกำลังคุย ที่ปิดไปแล้วไว้ท้าย */
const ORDER: Record<RequestStatus, number> = { new: 0, talking: 1, accepted: 2, declined: 3 };

export function RequestsAdmin() {
  const [rows, setRows] = useState<ProjectRequest[] | null>(null);
  const [people, setPeople] = useState<Record<string, Person>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const r = await supabase.from("project_requests").select(REQUEST_SELECT).order("created_at", { ascending: false });
    const list = (r.data ?? []) as ProjectRequest[];

    // ดึงโปรไฟล์คนส่งแยกอีกคำขอ แทนที่จะ embed มากับแถว
    // เพราะถ้า embed แล้วโปรไฟล์อ่านไม่ได้ ทั้งแถวจะหายไปด้วย
    // ส่วนแบบนี้อย่างแย่ที่สุดคือไม่มีชื่อกับรูป แต่คำขอยังอยู่ครบ
    const ids = [...new Set(list.map((x) => x.created_by))];
    const p = ids.length
      ? await supabase.from("profiles").select(PROFILE_SELECT).in("id", ids)
      : { data: [], error: null };

    return {
      rows: list,
      people: Object.fromEntries(((p.data ?? []) as Person[]).map((x) => [x.id, x])),
      error: r.error,
    };
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    load().then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setRows(r.rows);
      setPeople(r.people);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  async function reload() {
    const r = await load();
    if (r.error) setError(r.error.message);
    else {
      setRows(r.rows);
      setPeople(r.people);
    }
  }

  async function setStatus(r: ProjectRequest, status: RequestStatus) {
    setBusy(r.id);
    setRows((prev) => prev?.map((x) => (x.id === r.id ? { ...x, status } : x)) ?? prev);
    const { error: e } = await supabase.from("project_requests").update({ status }).eq("id", r.id);
    setBusy(null);
    if (e) {
      setError(e.code === "42501" ? "เปลี่ยนสถานะได้เฉพาะเจ้าของเว็บ" : e.message);
      reload();
    }
  }

  async function remove(r: ProjectRequest) {
    if (!confirm(`ลบคำขอ “${r.title}” ถาวร?`)) return;
    setBusy(r.id);
    const { error: e } = await supabase.from("project_requests").delete().eq("id", r.id);
    setBusy(null);
    if (e) setError(e.message);
    reload();
  }

  if (rows === null) return <p className="py-10 text-center text-sm text-ink-faint">กำลังโหลด…</p>;

  const sorted = [...rows].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || b.created_at.localeCompare(a.created_at)
  );
  const waiting = rows.filter((r) => r.status === "new").length;

  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.9rem] text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      <p className="text-[0.9rem] text-ink-muted">
        {rows.length === 0
          ? "ยังไม่มีใครส่งคำขอเข้ามา"
          : waiting > 0
            ? `รอดูอยู่ ${waiting} ใบ จากทั้งหมด ${rows.length} ใบ`
            : `ดูครบแล้วทั้ง ${rows.length} ใบ`}
      </p>

      <ul className="grid gap-2.5">
        {sorted.map((r) => {
          const who = people[r.created_by];
          return (
            <li
              key={r.id}
              className={`rounded-2xl border bg-surface-raised p-4 ${
                r.status === "new" ? "border-brand-500/50" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <Avatar person={who} size={26} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.title}</span>
                  <span className="block truncate text-[0.78rem] text-ink-faint">
                    {who?.display_name || who?.email || "ไม่ทราบผู้ส่ง"} · {requestDate(r.created_at)}
                  </span>
                </span>

                <select
                  value={r.status}
                  disabled={busy === r.id}
                  aria-label={`สถานะของคำขอ ${r.title}`}
                  onChange={(e) => setStatus(r, e.target.value as RequestStatus)}
                  className={`${field} flex-none`}
                >
                  {STATUS_FOR_ADMIN.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => remove(r)}
                  disabled={busy === r.id}
                  className="flex-none rounded px-1.5 py-1 text-[0.78rem] font-semibold text-ink-faint transition-colors hover:text-red-400 disabled:opacity-50"
                >
                  ลบ
                </button>
              </div>

              {r.detail && (
                <p className="mt-2.5 whitespace-pre-wrap break-words rounded-xl bg-surface-overlay px-3.5 py-2.5 text-[0.9rem] leading-relaxed text-ink-muted">
                  {r.detail}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
