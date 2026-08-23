"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MAX_DETAIL,
  MAX_TITLE,
  REQUEST_SELECT,
  STATUS_FOR_SENDER,
  requestDate,
  type ProjectRequest,
} from "@/lib/project-requests";

/**
 * ฟอร์มเล่าโปรเจกต์ — สองช่อง จบ
 *
 * ตั้งใจให้สั้นที่สุดเท่าที่ยังมีประโยชน์ คนที่เพิ่งเจอเว็บครั้งแรกยังไม่รู้
 * งบ ไม่รู้เดดไลน์ ไม่รู้ว่าจะใช้เทคโนโลยีอะไร — ถามไปก็ได้คำตอบมั่ว ๆ
 * หรือได้คนกดปิดหน้าไปเลย รายละเอียดที่แท้จริงเกิดตอนคุยกัน ไม่ใช่ตอนกรอกฟอร์ม
 *
 * ใต้ฟอร์มแสดงคำขอเก่าของคนคนนั้นด้วย เพราะกดส่งแล้วเงียบหาย
 * คือประสบการณ์ที่ทำให้คนไม่กล้าส่งซ้ำและไม่รู้ว่าเรื่องถึงไหน
 */

const field =
  "w-full rounded-2xl border border-line bg-surface-raised px-4 py-3 text-[1rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

export function StartProject() {
  const [mine, setMine] = useState<ProjectRequest[] | null>(null);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_requests")
      .select(REQUEST_SELECT)
      .order("created_at", { ascending: false });
    return { rows: (data ?? []) as ProjectRequest[], error: e };
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    load().then((r) => {
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setMine(r.rows);
    });
    return () => {
      alive = false;
    };
  }, [load]);

  async function send() {
    const t = title.trim();
    if (!t || sending) return;

    setSending(true);
    setError(null);
    // created_by ไม่ต้องส่ง — DEFAULT auth.uid() ในตารางตอบเอง
    // ค่าที่หน้าเว็บส่งมาเชื่อไม่ได้อยู่ดี ให้ Postgres เป็นคนตอบดีกว่า
    const { error: e } = await supabase
      .from("project_requests")
      .insert({ title: t, detail: detail.trim() });
    setSending(false);

    if (e) {
      setError(e.code === "42501" ? "ส่งไม่ได้ — ลองออกจากระบบแล้วเข้าใหม่อีกครั้ง" : e.message);
      return;
    }

    setTitle("");
    setDetail("");
    setSent(true);
    const r = await load();
    setMine(r.rows);
  }

  async function withdraw(r: ProjectRequest) {
    if (!confirm(`ถอนคำขอ “${r.title}”?`)) return;
    const { error: e } = await supabase.from("project_requests").delete().eq("id", r.id);
    if (e) setError(e.message);
    const next = await load();
    setMine(next.rows);
  }

  const titleOver = title.length > MAX_TITLE;
  const detailOver = detail.length > MAX_DETAIL;

  return (
    <div className="grid gap-8">
      {error && (
        <p role="alert" className="flex items-start gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-[0.92rem] text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      {sent && (
        <p className="rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 text-[0.98rem] text-brand-800">
          <b className="font-bold">ส่งแล้ว</b> — เดี๋ยวผมเข้าไปอ่านแล้วทักกลับ
          ระหว่างนี้ดูสถานะได้ที่รายการข้างล่าง
        </p>
      )}

      <form
        className="grid gap-4 rounded-3xl border border-line bg-surface-overlay/60 p-5 sm:p-6"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label className="grid gap-1.5">
          <span className="text-[0.92rem] font-bold">โปรเจกต์ชื่ออะไร</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น ระบบเช็คสต๊อกหน้าร้าน · แอปจดค่าใช้จ่าย"
            className={field}
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-[0.92rem] font-bold">เล่าให้ฟังหน่อยว่าอยากทำอะไร</span>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={6}
            placeholder="ตอนนี้ทำยังไงอยู่ ติดตรงไหน อยากให้มันเป็นแบบไหน — เขียนเท่าที่นึกออกก็พอ ที่เหลือค่อยคุยกัน"
            className={`${field} resize-y`}
          />
          <span className={`text-right text-[0.78rem] ${detailOver ? "font-bold text-red-600" : "text-ink-faint"}`}>
            {detail.length.toLocaleString("th-TH")} / {MAX_DETAIL.toLocaleString("th-TH")}
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!title.trim() || titleOver || detailOver || sending}
            className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-md shadow-brand-600/25 transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transform-none"
          >
            {sending ? "กำลังส่ง…" : "ส่งให้วัชรินทร์ดู"}
          </button>
          <span className="text-[0.88rem] text-ink-muted">
            ยังไม่ต้องรู้งบหรือกำหนดส่ง — คุยกันแล้วค่อยว่ากัน
          </span>
        </div>
      </form>

      {/* ---------- คำขอที่เคยส่ง ---------- */}
      {mine !== null && mine.length > 0 && (
        <div>
          <h2 className="text-[1.05rem] font-bold">คำขอที่เคยส่ง</h2>
          <ul className="mt-3 grid gap-2">
            {mine.map((r) => {
              const s = STATUS_FOR_SENDER[r.status];
              return (
                <li key={r.id} className="rounded-2xl border border-line bg-surface-raised px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-bold">{r.title}</span>
                    <span className={`flex-none rounded-full px-2.5 py-1 text-[0.76rem] font-bold ${s.tone}`}>
                      {s.label}
                    </span>
                    <span className="flex-none text-[0.78rem] text-ink-faint">{requestDate(r.created_at)}</span>
                  </div>

                  {r.detail && (
                    <p className="mt-1.5 line-clamp-2 text-[0.9rem] text-ink-muted">{r.detail}</p>
                  )}

                  {/* ถอนได้เฉพาะใบที่ยังไม่มีใครแตะ — ถอนตอนคุยกันอยู่แล้วทำให้อีกฝ่ายงง */}
                  {r.status === "new" && (
                    <button
                      type="button"
                      onClick={() => withdraw(r)}
                      className="mt-2 text-[0.82rem] font-semibold text-ink-faint transition-colors hover:text-red-600"
                    >
                      ถอนคำขอนี้
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
