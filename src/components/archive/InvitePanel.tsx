"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { thaiDate } from "@/lib/project-tasks";

type Invite = {
  token: string;
  role: "owner" | "client";
  label: string | null;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  created_at: string;
};

const field =
  "rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

/**
 * สร้างและจัดการลิงก์เชิญ — เห็นเฉพาะเจ้าของโปรเจกต์
 *
 * ลิงก์เชิญคือทางเดียวที่คนนอกจะเข้ามาอยู่ในโปรเจกต์ได้
 * เพราะ RLS ไม่ยอมให้ใครเพิ่มตัวเองเข้า project_members
 */
export function InvitePanel({ projectId }: { projectId: string }) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const fetchInvites = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_invites")
      .select("token,role,label,expires_at,max_uses,use_count,created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    return { rows: (data ?? []) as Invite[], error: e };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchInvites();
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setInvites(r.rows);
    })();
    return () => {
      alive = false;
    };
  }, [fetchInvites]);

  async function reload() {
    const r = await fetchInvites();
    setInvites(r.rows);
  }

  async function create(form: FormData) {
    const days = Number(form.get("days") ?? 0);
    const uses = String(form.get("uses") ?? "1");

    const { error: e } = await supabase.from("project_invites").insert({
      project_id: projectId,
      role: String(form.get("role") ?? "client"),
      label: String(form.get("label") ?? "").trim() || null,
      // ค่าเริ่มต้นมีวันหมดอายุเสมอ ลิงก์ที่ใช้ได้ตลอดกาลคือลิงก์ที่ลืมปิด
      expires_at: days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null,
      max_uses: uses === "0" ? null : Number(uses),
    });

    if (e) setError(e.code === "42501" ? "สร้างลิงก์เชิญได้เฉพาะเจ้าของโปรเจกต์" : e.message);
    reload();
  }

  async function revoke(token: string) {
    const { error: e } = await supabase.from("project_invites").delete().eq("token", token);
    if (e) setError(e.message);
    reload();
  }

  async function copy(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // บางเบราว์เซอร์ไม่ให้เขียนคลิปบอร์ดถ้าไม่ใช่ https — บอกตรง ๆ ดีกว่าเงียบ
      setError(`คัดลอกอัตโนมัติไม่ได้ ลิงก์คือ ${url}`);
    }
  }

  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="mb-1 text-[0.95rem] font-bold">ลิงก์เชิญ</h3>
      <p className="mb-4 max-w-[52ch] text-[0.85rem] text-ink-muted">
        ส่งลิงก์ให้คนที่อยากให้เข้ามาช่วยงาน เขากดลิงก์ เข้าสู่ระบบด้วย Google
        แล้วจะเข้ามาอยู่ในโปรเจกต์เอง ไม่ต้องรออนุมัติ
      </p>

      {error && (
        <p role="alert" className="mb-3 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.88rem] text-red-300">
          <span className="break-all">{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      {invites && invites.length > 0 && (
        <ul className="mb-4 grid gap-2">
          {invites.map((inv) => {
            const spent = inv.max_uses !== null && inv.use_count >= inv.max_uses;
            const expired = !!inv.expires_at && new Date(inv.expires_at) < new Date();
            const dead = spent || expired;
            return (
              <li key={inv.token} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm">
                <span className={`size-2 flex-none rounded-full ${dead ? "bg-line-strong" : "bg-brand-500"}`} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">
                    {inv.label || (inv.role === "owner" ? "เชิญเป็นเจ้าของร่วม" : "เชิญเข้าโปรเจกต์")}
                  </span>
                  <span className="block text-[0.78rem] text-ink-faint">
                    {inv.max_uses === null
                      ? `ใช้ไปแล้ว ${inv.use_count} ครั้ง · ไม่จำกัด`
                      : `ใช้ไปแล้ว ${inv.use_count}/${inv.max_uses}`}
                    {inv.expires_at ? ` · หมดอายุ ${thaiDate(inv.expires_at.slice(0, 10))}` : " · ไม่มีวันหมดอายุ"}
                    {spent ? " · ใช้ครบแล้ว" : expired ? " · หมดอายุแล้ว" : ""}
                  </span>
                </span>

                <span className="ml-auto flex flex-none gap-1">
                  {!dead && (
                    <button
                      type="button"
                      onClick={() => copy(inv.token)}
                      className="rounded-lg border border-line px-2.5 py-1.5 text-[0.8rem] font-bold text-ink-muted transition-colors hover:text-brand-400"
                    >
                      {copied === inv.token ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => revoke(inv.token)}
                    className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-red-400"
                  >
                    ยกเลิก
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form action={create} className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input name="label" placeholder="ชื่อกำกับ เช่น น้องปี 4 ทีมหน้าบ้าน" className={field} />

        <select name="role" defaultValue="client" className={field} aria-label="บทบาท">
          <option value="client">คนในโปรเจกต์</option>
          <option value="owner">เจ้าของร่วม</option>
        </select>

        <select name="uses" defaultValue="1" className={field} aria-label="ใช้ได้กี่ครั้ง">
          <option value="1">ใช้ได้ 1 ครั้ง</option>
          <option value="5">ใช้ได้ 5 ครั้ง</option>
          <option value="0">ไม่จำกัด</option>
        </select>

        <select name="days" defaultValue="7" className={field} aria-label="อายุลิงก์">
          <option value="7">หมดอายุใน 7 วัน</option>
          <option value="30">หมดอายุใน 30 วัน</option>
          <option value="0">ไม่หมดอายุ</option>
        </select>

        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950 sm:col-span-4 sm:justify-self-start"
        >
          สร้างลิงก์เชิญ
        </button>
      </form>

      <p className="mt-3 text-[0.8rem] text-ink-faint">
        เชิญเป็น “เจ้าของร่วม” ให้สิทธิ์เท่าคุณทุกอย่าง รวมถึงเห็นตัวเลขเงินและลบงานได้ —
        ถ้าเป็นน้องที่มาช่วยทำงาน เลือก “คนในโปรเจกต์” พอ
      </p>
    </div>
  );
}
