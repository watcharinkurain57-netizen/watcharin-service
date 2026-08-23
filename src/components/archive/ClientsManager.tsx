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
 *
 * ---------------------------------------------------------------------------
 * ลำดับบนหน้าเรียงตาม "สิ่งที่คนเปิดหน้านี้มาหา" ไม่ใช่ตามลำดับของข้อมูล
 *
 * รอบแรกวางฟอร์มข้อมูลบริษัทไว้บนสุดเพราะมันเป็นฟิลด์ของตาราง clients
 * ผลคือช่องเปล่าหกช่องกินพื้นที่ครึ่งจอ แล้วดันรายการโปรเจกต์ซึ่งเป็นของที่
 * มาดูจริง ๆ ตกไปอยู่ล่าง — เจ้าของบอกว่า "รู้สึกแปลก ๆ" ซึ่งตรงจุดนี้
 *
 * ตอนนี้: โปรเจกต์ของเจ้านั้นอยู่บนสุด · ข้อมูลบริษัทย่อเป็นบรรทัดเดียว
 * กางออกเมื่อกดแก้ · ถังยังไม่ได้จัดย้ายไปอยู่ในแถบซ้ายรวมกับลูกค้าเจ้าอื่น
 * ---------------------------------------------------------------------------
 *
 * ⚠️ การจัดกลุ่มตรงนี้ไม่กระทบสิทธิ์ใด ๆ ทั้งสิ้น — คนของลูกค้ายังเห็นเฉพาะ
 * โปรเจกต์ที่ถูกเชิญเข้าเหมือนเดิม (เหตุผลอยู่ท้าย migration 0022)
 */

/** ค่าที่ใช้แทน "ถังยังไม่ได้จัด" ในแถบซ้าย — ไม่ใช่ id ของลูกค้าเจ้าไหน */
const UNASSIGNED = "__unassigned__";

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
  /**
   * ฟอร์มข้อมูลบริษัทซ่อนไว้ก่อน
   * คนเปิดหน้านี้มาดูว่าเจ้านี้มีงานอะไร ไม่ได้มากรอกที่อยู่ทุกครั้ง
   */
  const [editingInfo, setEditingInfo] = useState(false);

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
    // อยู่ที่ถังยังไม่ได้จัดก็ค้างไว้ที่เดิม ไม่ต้องเด้งกลับไปลูกค้าเจ้าแรก
    else if (currentId !== UNASSIGNED && !r.clients.some((c) => c.id === currentId)) {
      setCurrentId(r.clients[0]?.id ?? null);
    }
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
    setEditingInfo(false);
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
    else setEditingInfo(false);
    await reload(current.id);
  }

  async function removeClient() {
    if (!current) return;
    const count = projects.filter((p) => assign[p.id] === current.id).length;
    if (
      !confirm(
        `ลบลูกค้า “${current.name}”?\n${
          count > 0 ? `โปรเจกต์ ${count} โปรเจกต์จะกลับไปเป็นยังไม่จัดลูกค้า ไม่ถูกลบ` : "ยังไม่มีโปรเจกต์ผูกอยู่"
        }`
      )
    )
      return;

    const { error: e } = await supabase.from("clients").delete().eq("id", current.id);
    if (e) setError(friendly(e.code, e.message));
    setCurrentId(null);
    setEditingInfo(false);
    await reload();
  }

  /* ---------- ผูก / ถอดโปรเจกต์ ---------- */

  /**
   * upsert เพราะโปรเจกต์หนึ่งมีลูกค้าได้เจ้าเดียว (project_id เป็น primary key)
   * ย้ายเจ้าจึงเป็นการเขียนทับ ไม่ใช่เพิ่มแถวใหม่
   */
  async function attachTo(projectId: string, clientId: string) {
    if (!projectId || !clientId) return;
    const { error: e } = await supabase
      .from("project_clients")
      .upsert({ project_id: projectId, client_id: clientId }, { onConflict: "project_id" });
    if (e) setError(friendly(e.code, e.message));
    await reload(currentId ?? undefined);
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

  /** ข้อมูลติดต่อเท่าที่กรอกไว้ — ช่องที่ยังว่างไม่ต้องเอามาโชว์เป็นที่ว่าง */
  const summary = current
    ? [current.contact_name, current.contact_phone, current.contact_email, current.tax_id].filter(
        (v): v is string => !!v && v.trim().length > 0
      )
    : [];

  return (
    <div className="grid gap-5">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.9rem] text-red-300"
        >
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[16rem_1fr]">
        {/* ---------- แถบซ้าย: ลูกค้า + ถังยังไม่ได้จัด ---------- */}
        <div className="grid content-start gap-1.5">
          {clients.map((c) => {
            const n = projects.filter((p) => assign[p.id] === c.id).length;
            const on = c.id === currentId;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCurrentId(c.id);
                  setEditingInfo(false);
                }}
                aria-pressed={on}
                className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  on ? "bg-brand-500 text-brand-950" : "bg-surface-overlay text-ink-muted hover:text-ink"
                }`}
              >
                <span className="min-w-0 flex-1 truncate text-[0.9rem] font-bold">{c.name}</span>
                <span className={`flex-none text-[0.76rem] ${on ? "text-brand-950/70" : "text-ink-faint"}`}>{n}</span>
              </button>
            );
          })}

          {/*
            ถังยังไม่ได้จัดอยู่ในแถบเดียวกับลูกค้า ไม่ใช่การ์ดใบใหญ่ท้ายหน้า
            เพราะมันคือถังอีกใบในชุดเดียวกัน และตอนที่ว่าง (ซึ่งคือสถานะที่อยากให้เป็น)
            การ์ดเต็มความกว้างที่บอกว่า "ไม่มีอะไร" คือที่ว่างเปล่า ๆ กลางหน้า
          */}
          <button
            type="button"
            onClick={() => {
              setCurrentId(UNASSIGNED);
              setEditingInfo(false);
            }}
            aria-pressed={currentId === UNASSIGNED}
            className={`mt-1 flex items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors ${
              currentId === UNASSIGNED
                ? "border-brand-500 text-brand-300"
                : "border-line text-ink-faint hover:text-ink-muted"
            }`}
          >
            <span className="min-w-0 flex-1 truncate text-[0.85rem] font-bold">ยังไม่ได้จัด</span>
            <span className="flex-none text-[0.76rem]">{unassigned.length}</span>
          </button>

          <form
            className="mt-2 flex gap-2"
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
            <button
              type="submit"
              className="flex-none rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950"
            >
              เพิ่ม
            </button>
          </form>
        </div>

        {/* ---------- ฝั่งขวา ---------- */}
        {currentId === UNASSIGNED ? (
          <div className="rounded-2xl border border-line bg-surface-raised p-5">
            <h2 className="text-lg font-bold">ยังไม่ได้จัดลูกค้า</h2>
            <p className="mt-1 text-[0.85rem] text-ink-faint">เลือกเจ้าให้แต่ละโปรเจกต์ได้จากตรงนี้เลย</p>

            {unassigned.length === 0 ? (
              <p className="mt-5 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
                ทุกโปรเจกต์มีลูกค้าครบแล้ว
              </p>
            ) : (
              <ul className="mt-4 grid gap-1.5">
                {unassigned.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-[0.9rem] text-ink-muted">{p.name}</span>
                    <span className="flex-none text-[0.74rem] text-ink-faint">{STATUS_LABEL[p.status]}</span>
                    {/* จัดเจ้าได้ทีละแถวตรงนี้ เร็วกว่าต้องไปเลือกลูกค้าก่อนแล้วค่อยหาโปรเจกต์ */}
                    <select
                      value=""
                      aria-label={`เลือกลูกค้าของ ${p.name}`}
                      onChange={(e) => attachTo(p.id, e.target.value)}
                      className={`${field} max-w-[12rem] flex-none`}
                    >
                      <option value="">— เลือกลูกค้า —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : current ? (
          <div className="grid content-start gap-4">
            {/* ---------- โปรเจกต์ของเจ้านี้ — ของหลักของหน้า อยู่บนสุด ---------- */}
            <div className="rounded-2xl border border-line bg-surface-raised p-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{current.name}</h2>
                <span className="flex-none text-[0.8rem] text-ink-faint">{mine.length} โปรเจกต์</span>
              </div>

              <ul className="grid gap-1.5">
                {mine.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-overlay px-3 py-2">
                    <Link
                      href={`/projects/${p.slug}`}
                      className="min-w-0 flex-1 truncate text-[0.9rem] text-ink-muted hover:text-brand-400"
                    >
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
                  <li className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-[0.85rem] text-ink-faint">
                    ยังไม่ได้ผูกโปรเจกต์ไหนกับเจ้านี้
                  </li>
                )}
              </ul>

              {/* ไม่บอกว่า "จัดครบแล้ว" ตรงนี้ — ถังในแถบซ้ายบอกอยู่แล้ว
                  พูดสองที่เรื่องเดียวกันทำให้ต้องหยุดคิดว่าอันไหนหมายถึงอะไร */}
              {unassigned.length > 0 && (
                <label className="mt-3 grid gap-1 text-[0.8rem] text-ink-muted">
                  เพิ่มโปรเจกต์เข้าเจ้านี้
                  <select value="" onChange={(e) => attachTo(e.target.value, current.id)} className={field}>
                    <option value="">— เลือกโปรเจกต์ —</option>
                    {unassigned.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {/* ---------- ข้อมูลบริษัท — งานธุรการ ย่อไว้ก่อน ---------- */}
            <div className="rounded-2xl border border-line bg-surface-overlay/40 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[0.9rem] font-bold">ข้อมูลบริษัท</h3>
                <button
                  type="button"
                  onClick={() => setEditingInfo((v) => !v)}
                  className="ml-auto rounded-lg border border-line px-2.5 py-1 text-[0.78rem] font-bold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300"
                >
                  {editingInfo ? "ปิด" : "แก้ข้อมูล"}
                </button>
              </div>

              {!editingInfo &&
                (summary.length > 0 ? (
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.84rem] text-ink-muted">
                    {summary.map((v) => (
                      <span key={v}>{v}</span>
                    ))}
                  </p>
                ) : (
                  <p className="mt-2 text-[0.84rem] text-ink-faint">ยังไม่ได้กรอกข้อมูลติดต่อ</p>
                ))}

              {editingInfo && (
                <form
                  key={current.id}
                  className="mt-3 grid gap-3"
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
              )}
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-line px-4 py-12 text-center text-sm text-ink-faint">
            เพิ่มลูกค้าเจ้าแรกทางซ้าย แล้วผูกโปรเจกต์ที่ทำให้เจ้านั้นเข้ามา
          </p>
        )}
      </div>
    </div>
  );
}
