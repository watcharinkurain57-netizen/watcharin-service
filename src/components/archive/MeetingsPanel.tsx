"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { personName } from "@/lib/project-tasks";
import {
  MEETING_SELECT,
  MEET_NEW_URL,
  byDay,
  countdownOf,
  dayKeyOf,
  dayToLocalInput,
  googleCalendarUrl,
  isLive,
  isPast,
  isoToLocalInput,
  localInputToIso,
  meetingErrorMessage,
  meetingWhen,
  monthCells,
  normalizeMeetings,
  type ProjectMeeting,
} from "@/lib/project-meetings";

/**
 * ตารางประชุมของโปรเจกต์ — อยู่เหนือกล่องข้อความในแท็บคุยงาน
 *
 * วางไว้บนเพราะเจ้าของบอกว่างานจริงคุยผ่าน Meet มากกว่าพิมพ์แชท
 * ของที่ใช้บ่อยกว่าควรอยู่ที่ที่เห็นก่อน
 *
 * ระบบไม่ได้สร้างลิงก์ Meet ให้เอง (ดูเหตุผลใน migration 0015)
 * แต่ทำให้การไปเอาลิงก์สั้นที่สุด: ปุ่มเปิดห้องใหม่ กับปุ่มเปิด Google Calendar
 * ที่กรอกชื่อ/เวลาให้แล้ว
 */

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

type Draft = { title: string; when: string; minutes: string; meet_url: string; note: string };

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** ค่าเริ่มต้น: พรุ่งนี้ 10:00 — เวลาที่คนนัดประชุมงานกันจริง ๆ บ่อยที่สุด */
function defaultDraft(): Draft {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return { title: "", when: isoToLocalInput(d.toISOString()), minutes: "60", meet_url: "", note: "" };
}

export function MeetingsPanel({ projectId, canPost }: { projectId: string; canPost: boolean }) {
  const [rows, setRows] = useState<ProjectMeeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [showPast, setShowPast] = useState(false);
  /** ปฏิทินเป็นค่าเริ่มต้น — เห็นทั้งที่ผ่านมาและที่จะถึงในภาพเดียว */
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const [month, setMonth] = useState(() => new Date());
  /** เดินนาฬิกาเองทุกนาที ไม่งั้น "อีก 5 นาที" จะค้างจนกว่าจะรีเฟรช */
  const [now, setNow] = useState(() => new Date());

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_meetings")
      .select(MEETING_SELECT)
      .eq("project_id", projectId)
      .order("starts_at");
    return { rows: normalizeMeetings(data), error: e };
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

  function payload(d: Draft) {
    const title = d.title.trim();
    if (!title) {
      setError("ใส่ชื่อการประชุมด้วย เช่น คุยความคืบหน้าสัปดาห์นี้");
      return null;
    }

    const starts_at = localInputToIso(d.when);
    if (!starts_at) {
      setError("เลือกวันและเวลาให้ถูกต้อง");
      return null;
    }

    const minutes = Number(d.minutes);
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) {
      setError("ความยาวต้องเป็นจำนวนนาทีระหว่าง 1 ถึง 1440");
      return null;
    }

    const url = d.meet_url.trim();
    if (url && !url.startsWith("https://")) {
      setError("ลิงก์ห้องประชุมต้องขึ้นต้นด้วย https://");
      return null;
    }

    return { title, starts_at, minutes, meet_url: url || null, note: d.note.trim() || null };
  }

  async function add() {
    const body = payload(draft);
    if (!body) return;

    setBusy("new");
    const { error: e } = await supabase.from("project_meetings").insert({ project_id: projectId, ...body });
    setBusy(null);

    if (e) {
      setError(meetingErrorMessage(e, "นัดประชุมไม่สำเร็จ"));
      return;
    }
    setDraft(defaultDraft());
    setAdding(false);
    setError(null);
    await reload();
  }

  async function save(id: string) {
    const body = payload(draft);
    if (!body) return;

    setBusy(id);
    const { error: e } = await supabase.from("project_meetings").update(body).eq("id", id);
    setBusy(null);

    if (e) {
      setError(meetingErrorMessage(e, "บันทึกไม่สำเร็จ"));
      return;
    }
    setEditing(null);
    setError(null);
    await reload();
  }

  async function remove(m: ProjectMeeting) {
    if (!confirm(`ลบนัด “${m.title}” (${meetingWhen(m, now)})?`)) return;
    setBusy(m.id);
    const { error: e } = await supabase.from("project_meetings").delete().eq("id", m.id);
    setBusy(null);
    if (e) setError(meetingErrorMessage(e, "ลบนัดไม่สำเร็จ"));
    await reload();
  }

  const list = rows ?? [];
  const upcoming = list.filter((m) => !isPast(m, now));
  const past = list.filter((m) => isPast(m, now)).reverse();

  /** เปิดฟอร์มนัดใหม่โดยตั้งวันไว้ให้แล้ว — ใช้ตอนกดวันบนปฏิทิน */
  function startAddOn(year: number, monthIndex: number, day: number) {
    setDraft({ ...defaultDraft(), when: dayToLocalInput(year, monthIndex, day) });
    setEditing(null);
    setAdding(true);
  }

  function calendar() {
    const y = month.getFullYear();
    const mi = month.getMonth();
    const cells = monthCells(month);
    const index = byDay(list);
    const todayKey = dayKeyOf(now.toISOString());

    return (
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setMonth(new Date(y, mi - 1, 1))}
            aria-label="เดือนก่อนหน้า"
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-bold text-ink-muted transition-colors hover:text-ink"
          >
            ‹
          </button>
          <span className="text-[0.9rem] font-bold text-ink">
            {["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"][mi]}{" "}
            {y + 543}
          </span>
          <button
            type="button"
            onClick={() => setMonth(new Date(y, mi + 1, 1))}
            aria-label="เดือนถัดไป"
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-bold text-ink-muted transition-colors hover:text-ink"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-line bg-line">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div key={d} className="bg-surface-overlay py-1.5 text-center text-[0.72rem] font-bold text-ink-faint">
              {d}
            </div>
          ))}

          {cells.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[4.5rem] bg-surface-raised" />;

            const key = dayToLocalInput(y, mi, day).slice(0, 10);
            const items = (index.get(key) ?? []).map((n) => list[n]);
            const isToday = key === todayKey;

            return (
              <div
                key={i}
                className={`relative min-h-[4.5rem] bg-surface-raised p-1.5 ${isToday ? "ring-1 ring-inset ring-brand-500" : ""}`}
              >
                {/*
                  กดที่ว่างของช่องเพื่อนัดวันนั้น — วางเป็นชั้นล่างสุดด้วย absolute
                  ปุ่มของประชุมแต่ละรายการอยู่ทับข้างบน จะได้ไม่แย่งคลิกกัน
                */}
                {canPost && (
                  <button
                    type="button"
                    onClick={() => startAddOn(y, mi, day)}
                    aria-label={`นัดประชุมวันที่ ${day}`}
                    className="absolute inset-0 z-0 transition-colors hover:bg-brand-500/5"
                  />
                )}

                <span
                  className={`relative z-10 text-[0.72rem] ${isToday ? "font-bold text-brand-400" : "text-ink-faint"}`}
                >
                  {day}
                </span>

                <div className="relative z-10 mt-1 grid gap-1">
                  {items.map((m) => {
                    const live = isLive(m, now);
                    const done = isPast(m, now);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          if (!canPost) return;
                          setDraft({
                            title: m.title,
                            when: isoToLocalInput(m.starts_at),
                            minutes: String(m.minutes),
                            meet_url: m.meet_url ?? "",
                            note: m.note ?? "",
                          });
                          setAdding(false);
                          setEditing(m.id);
                        }}
                        title={`${m.title} · ${meetingWhen(m, now)}${m.meet_url ? "" : " · ยังไม่มีลิงก์ห้อง"}`}
                        className={`truncate rounded px-1.5 py-0.5 text-left text-[0.7rem] leading-snug ${
                          live
                            ? "bg-brand-500 font-bold text-brand-950"
                            : done
                              ? "bg-white/5 text-ink-faint line-through"
                              : "bg-brand-500/15 text-brand-300"
                        }`}
                      >
                        {isoToLocalInput(m.starts_at).slice(11)} {m.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-[0.8rem] text-ink-faint">
          {canPost ? "กดวันบนปฏิทินเพื่อนัดประชุมวันนั้น · กดชื่อประชุมเพื่อแก้ไข" : "กดชื่อประชุมเพื่อดูรายละเอียด"}
          {" · "}ประชุมที่ผ่านมาแล้วจะมีเส้นขีดฆ่า
        </p>
      </div>
    );
  }

  const form = (onSubmit: () => void, onCancel: () => void, submitLabel: string) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-2 rounded-xl border border-line bg-surface-overlay p-3 sm:grid-cols-4"
    >
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder="ชื่อการประชุม เช่น คุยความคืบหน้าสัปดาห์นี้"
        className={`${field} sm:col-span-4`}
      />

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        วันและเวลา
        <input
          type="datetime-local"
          value={draft.when}
          onChange={(e) => setDraft({ ...draft, when: e.target.value })}
          className={field}
        />
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-2">
        ยาวกี่นาที
        <select
          value={draft.minutes}
          onChange={(e) => setDraft({ ...draft, minutes: e.target.value })}
          className={field}
        >
          {["30", "45", "60", "90", "120"].map((v) => (
            <option key={v} value={v}>
              {v} นาที
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 text-[0.72rem] text-ink-faint sm:col-span-4">
        ลิงก์ห้องประชุม (ใส่ทีหลังก็ได้)
        <input
          value={draft.meet_url}
          onChange={(e) => setDraft({ ...draft, meet_url: e.target.value })}
          placeholder="https://meet.google.com/xxx-xxxx-xxx"
          className={field}
        />
      </label>

      <input
        value={draft.note}
        onChange={(e) => setDraft({ ...draft, note: e.target.value })}
        placeholder="หัวข้อที่จะคุย (ไม่ใส่ก็ได้)"
        className={`${field} sm:col-span-4`}
      />

      <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
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

        {/* ทางลัดไปเอาลิงก์ — เปิดแท็บใหม่ ไม่ทิ้งสิ่งที่กรอกค้างไว้ */}
        <a
          href={MEET_NEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl border border-line px-3 py-2 text-[0.82rem] font-bold text-ink-muted transition-colors hover:text-brand-400"
        >
          เปิดห้อง Meet ใหม่ ↗
        </a>
        {draft.title.trim() && draft.when && (
          <a
            href={googleCalendarUrl({
              title: draft.title,
              starts_at: localInputToIso(draft.when) ?? new Date().toISOString(),
              minutes: Number(draft.minutes) || 60,
              note: draft.note,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-line px-3 py-2 text-[0.82rem] font-bold text-ink-muted transition-colors hover:text-brand-400"
          >
            ใส่ลง Google Calendar ↗
          </a>
        )}
      </div>

      <p className="text-[0.76rem] text-ink-faint sm:col-span-4">
        กด “เปิดห้อง Meet ใหม่” จะได้ห้องทันที ก๊อปลิงก์มาวางในช่องด้านบน ·
        หรือกด “ใส่ลง Google Calendar” ที่กรอกชื่อกับเวลาให้แล้ว แล้วกดเพิ่มการประชุมทางวิดีโอในนั้น
      </p>
    </form>
  );

  const row = (m: ProjectMeeting, dim: boolean) => {
    if (editing === m.id) return <li key={m.id}>{form(() => save(m.id), () => setEditing(null), "บันทึก")}</li>;

    const live = isLive(m, now);
    const countdown = countdownOf(m, now);

    return (
      <li
        key={m.id}
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 text-sm ${
          live ? "border border-brand-500/50 bg-brand-500/5" : "bg-surface-overlay"
        } ${dim ? "opacity-60" : ""}`}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-semibold ${dim ? "text-ink-faint" : "text-ink"}`}>{m.title}</span>
          <span className="block truncate text-[0.76rem] text-ink-faint">
            {meetingWhen(m, now)}
            {countdown && ` · ${countdown}`}
            {m.profiles && ` · นัดโดย ${personName(m.profiles)}`}
            {m.note && ` · ${m.note}`}
          </span>
        </span>

        <span className="flex flex-none flex-wrap items-center gap-1">
          {m.meet_url ? (
            <a
              href={m.meet_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-lg px-2.5 py-1.5 text-[0.8rem] font-bold transition-colors ${
                live
                  ? "bg-brand-500 text-brand-950"
                  : "border border-line text-ink-muted hover:text-brand-400"
              }`}
            >
              {live ? "เข้าห้องประชุม" : "เปิดห้อง ↗"}
            </a>
          ) : (
            <span className="text-[0.76rem] text-ink-faint">ยังไม่มีลิงก์ห้อง</span>
          )}

          {canPost && (
            <>
              <a
                href={googleCalendarUrl(m)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg px-2 py-1.5 text-[0.78rem] font-bold text-ink-faint transition-colors hover:text-ink"
              >
                ปฏิทิน ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setDraft({
                    title: m.title,
                    when: isoToLocalInput(m.starts_at),
                    minutes: String(m.minutes),
                    meet_url: m.meet_url ?? "",
                    note: m.note ?? "",
                  });
                  setAdding(false);
                  setEditing(m.id);
                }}
                disabled={busy === m.id}
                className="rounded-lg px-2 py-1.5 text-[0.78rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
              >
                แก้ไข
              </button>
              <button
                type="button"
                onClick={() => remove(m)}
                disabled={busy === m.id}
                className="rounded-lg px-2 py-1.5 text-[0.78rem] font-bold text-ink-faint transition-colors hover:text-red-400 disabled:opacity-50"
              >
                ลบ
              </button>
            </>
          )}
        </span>
      </li>
    );
  };

  return (
    <div className="mb-5 border-b border-line pb-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[0.95rem] font-bold">ตารางประชุม</h3>

        <div className="flex gap-1 rounded-xl border border-line bg-surface-overlay p-1">
          {([["calendar", "ปฏิทิน"], ["list", "รายการ"]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              aria-pressed={mode === id}
              className={`rounded-lg px-3 py-1 text-[0.82rem] font-bold transition-colors ${
                mode === id ? "bg-brand-500 text-brand-950" : "text-ink-muted hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "calendar" && !isSameMonth(month, now) && (
          <button
            type="button"
            onClick={() => setMonth(new Date())}
            className="rounded-xl border border-line px-3 py-1.5 text-[0.82rem] font-bold text-ink-muted transition-colors hover:text-ink"
          >
            กลับมาเดือนนี้
          </button>
        )}

        {canPost && !adding && (
          <button
            type="button"
            onClick={() => {
              setDraft(defaultDraft());
              setEditing(null);
              setAdding(true);
            }}
            className="ml-auto rounded-xl border border-line px-3 py-1.5 text-[0.85rem] font-bold text-ink-muted transition-colors hover:text-ink"
          >
            ＋ นัดประชุม
          </button>
        )}
      </div>

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
      ) : mode === "calendar" ? (
        calendar()
      ) : (
        <>
          {upcoming.length > 0 ? (
            <ul className="grid gap-2">{upcoming.map((m) => row(m, false))}</ul>
          ) : (
            !adding && (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-faint">
                ยังไม่มีนัดประชุมที่จะถึง
              </p>
            )
          )}

          {past.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                aria-expanded={showPast}
                className="text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink"
              >
                {showPast ? "ซ่อน" : "ดู"}ประชุมที่ผ่านมา ({past.length})
              </button>
              {showPast && <ul className="mt-2 grid gap-2">{past.map((m) => row(m, true))}</ul>}
            </div>
          )}
        </>
      )}

      {canPost && adding && <div className="mt-3">{form(add, () => setAdding(false), "บันทึกนัด")}</div>}
    </div>
  );
}
