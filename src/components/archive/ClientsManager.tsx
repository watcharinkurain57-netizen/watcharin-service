"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CLIENT_FIELDS,
  CLIENT_PROJECT_SELECT,
  CLIENT_SELECT,
  STATUS_LABEL,
  groupProjectsByClient,
  type Client,
  type ClientProject,
} from "@/lib/clients";

/**
 * หน้าจัดลูกค้า — ของฝั่งเราล้วน ลูกค้าไม่เห็นหน้านี้และไม่เห็นข้อมูลในนี้
 *
 * ตอบโจทย์เดียว: เจ้าเดิมกลับมาจ้างงานที่สอง แล้วอยากรู้ว่าเจ้านี้มีงานอะไรกับเราบ้าง
 * จึงจัดหน้าเป็น "รายชื่อลูกค้า → โปรเจกต์ของเจ้านั้น" ไม่ใช่ตารางข้อมูลบริษัทเฉย ๆ
 *
 * ⚠️ การจัดกลุ่มตรงนี้ไม่กระทบสิทธิ์ใด ๆ ทั้งสิ้น — คนของลูกค้ายังเห็นเฉพาะ
 * โปรเจกต์ที่ถูกเชิญเข้าเหมือนเดิม (เหตุผลอยู่ท้าย migration 0022)
 */

const field =
  "w-full rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";

const label = "grid gap-1 text-[0.8rem] text-ink-muted";

function friendly(code: string | undefined, fallback: string) {
  if (code === "42501") return "หน้านี้สำหรับเจ้าของเว็บเท่านั้น";
  if (code === "23505") return "มีลูกค้าชื่อนี้อยู่แล้ว — ใช้เจ้าเดิมได้เลย ไม่ต้องสร้างซ้ำ";
  return fallback;
}

export function ClientsManager() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  /** project_id -> client_id */
  const [assign, setAssign] = useState<Record<string, string>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState("");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const [c, p, a] = await Promise.all([
      supabase.from("clients").select(CLIENT_SELECT).order("name"),
      supabase.from("projects").select(CLIENT_PROJECT_SELECT).order("name"),
      supabase.from("project_clients").select("project_id, client_id"),
    ]);
    return {
      clients: (c.data ?? []) as Client[],
      projects: (p.data ?? []) as ClientProject[],
      assign: Object.fromEntries(
        ((a.data ?? []) as { project_id: string; client_id: string }[]).map((r) => [r.project_id, r.client_id])
      ),
      error: c.error ?? p.error ?? a.error,
    };
  }, [supabase]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await load();
      if (!alive) return;
      if (r.error) setError(friendly(r.error.code, r.error.message));
      setClients(r.clients);
      setProjects(r.projects);
      setAssign(r.assign);
      setCurrentId((cur) => cur ?? r.clients[0]?.id ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function reload(keepId?: string) {
    const r = await load();
    if (r.error) {
      setError(friendly(r.error.code, r.error.message));
      return;
    }
    setClients(r.clients);
    setProjects(r.projects);
    setAssign(r.assign);
    if (keepId) setCurrentId(keepId);
    else if (!r.clients.some((c) => c.id === currentId)) setCurrentId(r.clients[0]?.id ?? null);
  }

  /* ---------- ลูกค้า ---------- */

  async function addClient() {
    const name = adding.trim();
    if (!name) return;

    const { data, error: e } = await supabase.from("clients").insert({ name }).select(CLIENT_SELECT).single();
    if (e || !data) {
      setError(friendly(e?.code, e?.message ?? "เพิ่มลูกค้าไม่สำเร็จ"));
      return;
    }
    setAdding("");
    await reload((data as Client).id);
  }

  async function saveClient(form: HTMLFormElement) {
    if (!current || saving) return;
    const f = new FormData(form);
    const name = String(f.get("name") ?? "").trim();
    if (!name) {
      setError("ตั้งชื่อลูกค้าก่อน");
      return;
    }

    setSaving(true);
    const { error: e } = await supabase
      .from("clients")
      .update({
        name,
        // ช่องว่างเก็บเป็น null ไม่ใช่สตริงว่าง จะได้แยกออกว่า "ยังไม่กรอก"
        // กับ "กรอกแล้วเป็นค่าว่าง" ตอนเอาไปทำใบเสนอราคา
        contact_name: String(f.get("contact_name") ?? "").trim() || null,
        contact_email: String(f.get("contact_email") ?? "").trim() || null,
        contact_phone: String(f.get("contact_phone") ?? "").trim() || null,
        tax_id: String(f.get("tax_id") ?? "").trim() || null,
        address: String(f.get("address") ?? "").trim() || null,
        note: String(f.get("note") ?? "").trim() || null,
      })
      .eq("id", current.id);
    setSaving(false);

    if (e) setError(friendly(e.code, e.message));
    await reload(current.id);
  }

  async function removeClient() {
    if (!current) return;
    const count = projects.filter((p) => assign[p.id] === current.id).length;
    if (!confirm(`ลบลูกค้า “${current.name}”?\n${count > 0 ? `โปรเจกต์ ${count} โปรเจกต์จะกลับไปเป็นยังไม่จัดลูกค้า ไม่ถูกลบ` : "ยังไม่มีโปรเจกต์ผูกอยู่"}`)) return;

    const { error: e } = await supabase.from("clients").delete().eq("id", current.id);
    if (e) setError(friendly(e.code, e.message));
    setCurrentId(null);
    await reload();
  }

  /* ---------- ผูก / ถอดโปรเจกต์ ---------- */

  async function attach(projectId: string) {
    if (!current || !projectId) return;
    // upsert เพราะโปรเจกต์หนึ่งมีลูกค้าได้เจ้าเดียว (project_id เป็น primary key)
    // ย้ายเจ้าจึงเป็นการเขียนทับ ไม่ใช่เพิ่มแถวใหม่
    const { error: e } = await supabase
      .from("project_clients")
      .upsert({ project_id: projectId, client_id: current.id }, { onConflict: "project_id" });
    if (e) setError(friendly(e.code, e.message));
    await reload(current.id);
  }

  async function detach(projectId: string) {
    const { error: e } = await supabase.from("project_clients").delete().eq("project_id", projectId);
    if (e) setError(friendly(e.code, e.message));
    await reload(currentId ?? undefined);
  }

  /* ---------- หน้าตา ---------- */

  if (clients === null) {
    return <p className="py-10 text-center text-sm text-ink-faint">กำลังโหลด…</p>;
  }

  const current = clients.find((c) => c.id === currentId) ?? null;
  const buckets = groupProjectsByClient(projects, clients, assign);
  const unassigned = buckets.find((b) => b.client === null)?.items ?? [];
  const mine = current ? projects.filter((p) => assign[p.id] === current.id) : [];

  return (
    <div className="grid gap-5">
      {error && (
        <p role="alert" className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.9rem] text-red-300">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* ---------- รายชื่อลูกค้า ---------- */}
        <div className="grid content-start gap-2">
          {clients.map((c) => {
            const n = projects.filter((p) => assign[p.id] === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCurrentId(c.id)}
                aria-pressed={c.id === currentId}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  c.id === currentId ? "bg-brand-500 text-brand-950" : "bg-surface-overlay text-ink-muted hover:text-ink"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[0.9rem] font-bold">{c.name}</span>
                <span className={`flex-none text-[0.76rem] ${c.id === currentId ? "text-brand-950/70" : "text-ink-faint"}`}>
                  {n}
                </span>
              </button>
            );
          })}

          {clients.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[0.85rem] text-ink-faint">
              ยังไม่มีลูกค้า
            </p>
          )}

          <form
            className="mt-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addClient();
            }}
          >
            <input
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              placeholder="ลูกค้าใหม่"
              aria-label="ชื่อลูกค้าใหม่"
              className={field}
            />
            <button type="submit" className="flex-none rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950">
              เพิ่ม
            </button>
          </form>
        </div>

        {/* ---------- รายละเอียดลูกค้า ---------- */}
        {current ? (
          <div className="grid content-start gap-4">
            <form
              key={current.id}
              className="grid gap-3 rounded-2xl border border-line bg-surface-overlay/40 p-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveClient(e.currentTarget);
              }}
            >
              <label className={label}>
                ชื่อลูกค้า
                <input name="name" defaultValue={current.name} className={field} />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                {CLIENT_FIELDS.map((f) => (
                  <label key={f.name} className={label}>
                    {f.label}
                    <input
                      name={f.name}
                      defaultValue={(current[f.name] as string | null) ?? ""}
                      placeholder={f.placeholder}
                      className={field}
                    />
                  </label>
                ))}
              </div>

              <label className={label}>
                ที่อยู่
                <textarea name="address" defaultValue={current.address ?? ""} rows={2} className={`${field} resize-y`} />
              </label>

              <label className={label}>
                โน้ตภายใน
                <textarea
                  name="note"
                  defaultValue={current.note ?? ""}
                  rows={2}
                  placeholder="เช่น รอบจ่ายของเจ้านี้ · คนอนุมัติจริงคือใคร"
                  className={`${field} resize-y`}
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-brand-500 px-5 py-2.5 text-[0.9rem] font-bold text-brand-950 disabled:opacity-50"
                >
                  {saving ? "กำลังบันทึก…" : "บันทึก"}
                </button>
                <button
                  type="button"
                  onClick={removeClient}
                  className="ml-auto rounded-full border border-red-500/40 px-4 py-2.5 text-[0.9rem] font-bold text-red-300 hover:bg-red-500/10"
                >
                  ลบลูกค้านี้
                </button>
              </div>
            </form>

            {/* ---------- โปรเจกต์ของเจ้านี้ ---------- */}
            <div className="rounded-2xl border border-line bg-surface-overlay/40 p-4">
              <h3 className="mb-3 text-[0.9rem] font-bold">
                โปรเจกต์ของเจ้านี้ <span className="text-ink-faint">{mine.length}</span>
              </h3>

              <ul className="mb-3 grid gap-1.5">
                {mine.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2">
                    <Link href={`/projects/${p.slug}`} className="min-w-0 flex-1 truncate text-[0.9rem] text-ink-muted hover:text-brand-400">
                      {p.name}
                    </Link>
                    <span className="flex-none text-[0.74rem] text-ink-faint">{STATUS_LABEL[p.status]}</span>
                    <button
                      type="button"
                      onClick={() => detach(p.id)}
                      className="flex-none rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-red-400"
                    >
                      เอาออก
                    </button>
                  </li>
                ))}

                {mine.length === 0 && (
                  <li className="text-[0.85rem] text-ink-faint">ยังไม่ได้ผูกโปรเจกต์ไหนกับเจ้านี้</li>
                )}
              </ul>

              {unassigned.length > 0 ? (
                <label className={label}>
                  เพิ่มโปรเจกต์เข้าเจ้านี้
                  <select
                    value=""
                    onChange={(e) => attach(e.target.value)}
                    className={field}
                  >
                    <option value="">— เลือกโปรเจกต์ —</option>
                    {unassigned.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-[0.8rem] text-ink-faint">จัดครบทุกโปรเจกต์แล้ว</p>
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-ink-faint">
            เพิ่มลูกค้าเจ้าแรกทางซ้าย แล้วผูกโปรเจกต์ที่ทำให้เจ้านั้นเข้ามา
          </p>
        )}
      </div>

      {/* ---------- ยังไม่ได้จัด ---------- */}
      {/* แสดงเสมอแม้ว่าง เพื่อให้ตอบได้ทันทีว่า "จัดครบแล้ว" ไม่ใช่ "ไม่มีถังให้ดู" */}
      <div className="rounded-2xl border border-line bg-surface-raised p-4">
        <h3 className="mb-2 text-[0.9rem] font-bold">
          ยังไม่ได้จัดลูกค้า <span className="text-ink-faint">{unassigned.length}</span>
        </h3>
        {unassigned.length === 0 ? (
          <p className="text-[0.85rem] text-ink-faint">ทุกโปรเจกต์มีลูกค้าครบแล้ว</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {unassigned.map((p) => (
              <li key={p.id} className="rounded-lg bg-surface-overlay px-3 py-1.5 text-[0.84rem] text-ink-muted">
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
