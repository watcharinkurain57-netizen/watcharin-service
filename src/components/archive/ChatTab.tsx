"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/archive/tasks/Avatar";
import { MeetingsPanel } from "@/components/archive/MeetingsPanel";
import { personName } from "@/lib/project-tasks";
import {
  COMMENT_MAX,
  COMMENT_SELECT,
  POLL_MS,
  clockOf,
  commentErrorMessage,
  dayKeyOf,
  dayLabelOf,
  isContinuation,
  normalizeComments,
  type ProjectComment,
} from "@/lib/project-comments";

/**
 * แท็บคุยงาน
 *
 * แท็บแรกที่ **ลูกค้าเขียนได้ด้วย** ไม่ใช่เจ้าของพูดอยู่ฝ่ายเดียว
 * ใครเขียนได้/ลบของใครได้ ตัวจริงที่กันคือ policy ใน 0012
 * ปุ่มในนี้แค่ไม่เอาของที่กดไม่ได้มาให้เกะกะ
 *
 * ดึงข้อความใหม่ด้วยการถามซ้ำทุก 15 วินาที ไม่ได้ใช้ Realtime
 * เพราะแบบนี้ตรวจสอบได้แน่นอนกว่าและไม่ต้องไปตั้งค่า publication เพิ่ม
 * — หยุดถามเองตอนผู้ใช้สลับไปแท็บอื่นของเบราว์เซอร์ จะได้ไม่กินโควตาฟรี ๆ
 */
export function ChatTab({
  projectId,
  canPost,
  canModerate,
}: {
  projectId: string;
  canPost: boolean;
  canModerate: boolean;
}) {
  const [rows, setRows] = useState<ProjectComment[] | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  /** ถ้าผู้ใช้เลื่อนขึ้นไปอ่านของเก่าอยู่ อย่าดึงเขากลับลงล่างตอนมีข้อความใหม่ */
  const stickToBottom = useRef(true);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_comments")
      .select(COMMENT_SELECT)
      .eq("project_id", projectId)
      .order("created_at");
    return { rows: normalizeComments(data), error: e };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const [r, auth] = await Promise.all([load(), supabase.auth.getUser()]);
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setRows(r.rows);
      setMe(auth.data.user?.id ?? null);
    })();

    // ถามซ้ำเฉพาะตอนที่หน้านี้ถูกมองอยู่จริง
    const tick = async () => {
      if (document.hidden) return;
      const r = await load();
      if (!alive || r.error) return;
      setRows(r.rows);
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load, supabase]);

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่ เว้นแต่ผู้ใช้กำลังอ่านของเก่าอยู่
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [rows]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    // เผื่อ 40px เพราะการเลื่อนแบบ smooth มักหยุดไม่ตรงล่างสุดเป๊ะ
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  }

  async function reload() {
    const r = await load();
    if (r.error) setError(r.error.message);
    else setRows(r.rows);
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;

    if (body.length > COMMENT_MAX) {
      setError(`ข้อความยาวเกิน ${COMMENT_MAX.toLocaleString("th-TH")} ตัวอักษร`);
      return;
    }

    setSending(true);
    // author_id ไม่ต้องส่ง — DB ใส่ auth.uid() ให้เอง และ policy บังคับว่าต้องเป็นตัวเอง
    const { error: e } = await supabase.from("project_comments").insert({ project_id: projectId, body });
    setSending(false);

    if (e) {
      setError(commentErrorMessage(e, "ส่งข้อความไม่สำเร็จ"));
      return;
    }
    setText("");
    setError(null);
    stickToBottom.current = true;
    await reload();
  }

  async function saveEdit(id: string) {
    const body = editText.trim();
    if (!body) return;

    setBusy(id);
    const { error: e } = await supabase.from("project_comments").update({ body }).eq("id", id);
    setBusy(null);

    if (e) {
      setError(commentErrorMessage(e, "แก้ข้อความไม่สำเร็จ"));
      return;
    }
    setEditing(null);
    await reload();
  }

  async function remove(c: ProjectComment) {
    if (!confirm("ลบข้อความนี้?")) return;
    setBusy(c.id);
    const { error: e } = await supabase.from("project_comments").delete().eq("id", c.id);
    setBusy(null);
    if (e) setError(commentErrorMessage(e, "ลบข้อความไม่สำเร็จ"));
    await reload();
  }

  const list = rows ?? [];

  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-6">
      <h2 className="mb-1 text-base font-bold tracking-tight">คุยงาน</h2>
      <p className="mb-4 max-w-[56ch] text-[0.85rem] text-ink-muted">
        นัดประชุมและที่คุยกันของคนในโปรเจกต์นี้ — สรุปที่ตกลงกันไว้ตรงนี้จะได้ย้อนอ่านได้ ไม่ต้องไปไล่หาในไลน์
      </p>

      {/* ตารางประชุมอยู่บน เพราะงานจริงคุยผ่าน Meet มากกว่าพิมพ์ */}
      <MeetingsPanel projectId={projectId} canPost={canPost} />

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
        <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink-faint">
          ยังไม่มีใครพิมพ์อะไร — เริ่มได้เลย
        </p>
      ) : (
        <div
          ref={listRef}
          onScroll={onScroll}
          className="max-h-[28rem] overflow-y-auto rounded-xl bg-surface-overlay px-3 py-2"
        >
          {list.map((c, i) => {
            const prev = list[i - 1];
            const newDay = !prev || dayKeyOf(prev.created_at) !== dayKeyOf(c.created_at);
            const cont = !newDay && isContinuation(prev, c);
            const mine = !!me && c.author_id === me;
            const person = c.profiles ?? undefined;

            return (
              <div key={c.id}>
                {newDay && (
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-line" />
                    <span className="flex-none text-[0.74rem] text-ink-faint">{dayLabelOf(c.created_at)}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}

                <div className={`group flex gap-2.5 ${cont ? "mt-0.5" : "mt-3"}`}>
                  {/* ข้อความต่อเนื่องไม่โชว์รูปซ้ำ แต่ยังต้องกันที่ไว้ให้ตรงแนว */}
                  <span className="w-7 flex-none pt-0.5">
                    {!cont && <Avatar person={person} size={28} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    {!cont && (
                      <p className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[0.85rem] font-bold text-ink">
                          {c.author_id === null ? "ผู้ใช้ที่ถูกลบไปแล้ว" : personName(person)}
                        </span>
                        {mine && <span className="text-[0.7rem] text-brand-400">คุณ</span>}
                        <span className="text-[0.72rem] text-ink-faint">{clockOf(c.created_at)}</span>
                      </p>
                    )}

                    {editing === c.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          saveEdit(c.id);
                        }}
                        className="mt-1 grid gap-2"
                      >
                        <textarea
                          autoFocus
                          rows={3}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full resize-y rounded-xl border border-line bg-surface-raised px-3 py-2 text-[0.9rem] text-ink outline-none focus:border-brand-500"
                        />
                        <span className="flex gap-2">
                          <button
                            type="submit"
                            disabled={busy === c.id}
                            className="rounded-lg bg-brand-500 px-3 py-1.5 text-[0.8rem] font-bold text-brand-950 disabled:opacity-50"
                          >
                            บันทึก
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-lg px-3 py-1.5 text-[0.8rem] font-bold text-ink-faint hover:text-ink"
                          >
                            ยกเลิก
                          </button>
                        </span>
                      </form>
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-[0.9rem] text-ink-muted">
                        {c.body}
                        {c.edited_at && (
                          <span className="ml-1.5 text-[0.72rem] text-ink-faint">(แก้ไขแล้ว)</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* ปุ่มโผล่ตอน hover เพื่อไม่ให้รกทุกบรรทัด — บนมือถือแตะแล้วโผล่ผ่าน focus */}
                  {editing !== c.id && (mine || canModerate) && (
                    <span className="flex flex-none items-start gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      {mine && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditText(c.body);
                            setEditing(c.id);
                          }}
                          className="rounded-lg px-1.5 py-1 text-[0.74rem] font-bold text-ink-faint hover:text-ink"
                        >
                          แก้ไข
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(c)}
                        disabled={busy === c.id}
                        className="rounded-lg px-1.5 py-1 text-[0.74rem] font-bold text-ink-faint hover:text-red-400 disabled:opacity-50"
                      >
                        ลบ
                      </button>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {canPost ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="mt-3"
        >
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่ — แบบเดียวกับที่ทุกคนคุ้นจากไลน์
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="พิมพ์ข้อความ… (Enter ส่ง · Shift+Enter ขึ้นบรรทัดใหม่)"
            className="w-full resize-y rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={sending || text.trim().length === 0}
              className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 disabled:opacity-40"
            >
              {sending ? "กำลังส่ง…" : "ส่ง"}
            </button>
            {text.length > COMMENT_MAX - 500 && (
              <span className={`text-[0.8rem] ${text.length > COMMENT_MAX ? "text-red-400" : "text-ink-faint"}`}>
                {text.length.toLocaleString("th-TH")} / {COMMENT_MAX.toLocaleString("th-TH")}
              </span>
            )}
          </div>
        </form>
      ) : (
        <p className="mt-3 text-[0.8rem] text-ink-faint">เข้าร่วมโปรเจกต์นี้ก่อนถึงจะพิมพ์ได้</p>
      )}
    </section>
  );
}
