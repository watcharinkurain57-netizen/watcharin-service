"use client";

import { useEffect, useState } from "react";
import { api, baht, shrinkImage, type MenuItem } from "./api";
import { Loading } from "./Loading";

type Draft = { name: string; description: string; price: string; points: string; redeemable: boolean };
const blank: Draft = { name: "", description: "", price: "", points: "1", redeemable: true };
const toDraft = (m: MenuItem): Draft => ({
  name: m.name,
  description: m.description,
  price: String(m.price),
  points: String(m.points),
  redeemable: m.redeemable,
});

/** เมนูของร้าน (ทุกสาขาใช้ร่วมกัน): แก้ เพิ่ม ลบ เปิด/ปิดขาย เลื่อนลำดับ ใส่รูป */
export function MenuTab() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [edit, setEdit] = useState<string | null>(null); // id ที่กำลังแก้ · "new" = เพิ่มใหม่
  const [draft, setDraft] = useState<Draft>(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  /** เพิ่มทีละ 1 = โหลดเมนูใหม่ */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api<{ menu: MenuItem[] }>("menu")
      .then((r) => alive && setMenu(r.menu))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [tick]);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
      setTick((t) => t + 1);
      return true;
    } catch (e) {
      setErr((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function open(m: MenuItem | null) {
    setErr("");
    setEdit(m ? m.id : "new");
    setDraft(m ? toDraft(m) : blank);
  }

  async function save() {
    const fields = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: Number(draft.price),
      points: Number(draft.points),
      redeemable: draft.redeemable,
    };
    const ok = await run(() =>
      edit === "new"
        ? api("menu", { method: "POST", json: { ...fields, available: true } })
        : api("menu", { method: "PATCH", json: { id: edit, ...fields } }),
    );
    if (ok) setEdit(null);
  }

  async function remove(m: MenuItem) {
    if (!window.confirm(`ลบเมนู "${m.name}"?\nออร์เดอร์เก่าไม่หาย แต่ลูกค้าจะสั่งเมนูนี้ไม่ได้อีก`)) return;
    if (await run(() => api(`menu?id=${m.id}`, { method: "DELETE" }))) setEdit(null);
  }

  async function upload(m: MenuItem, file: File | undefined) {
    if (!file) return;
    await run(async () => {
      const jpeg = await shrinkImage(file);
      await api(`menu/image?id=${m.id}`, { body: jpeg, type: "image/jpeg" });
    });
  }

  if (!menu) return <Loading err={err} onRetry={() => (setErr(""), setTick((t) => t + 1))} />;

  const form = (m: MenuItem | null) => (
    <div className="adm-form">
      <label>ชื่อเมนู<input value={draft.name} maxLength={60} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
      <label>คำอธิบาย (ไม่บังคับ)<input value={draft.description} maxLength={200} placeholder="เช่น เนื้อ 150 ก. + น้ำดอง" onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
      <div className="adm-row2">
        <label>ราคา (บาท)<input type="number" inputMode="numeric" min={1} value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></label>
        <label>แต้มต่อกล่อง<input type="number" inputMode="numeric" min={0} value={draft.points} onChange={(e) => setDraft({ ...draft, points: e.target.value })} /></label>
      </div>
      <label className="shop-check">
        <input type="checkbox" checked={draft.redeemable} onChange={(e) => setDraft({ ...draft, redeemable: e.target.checked })} />
        ใช้ 10 แต้มแลกเมนูนี้ฟรีได้
      </label>
      {m && (
        <div className="adm-photo-row">
          <label className="shop-btn is-ghost adm-file">
            {m.image_url ? "เปลี่ยนรูป" : "ใส่รูป"}
            <input type="file" accept="image/*" disabled={busy} onChange={(e) => upload(m, e.target.files?.[0])} />
          </label>
          {m.image_url && (
            <button type="button" className="shop-link" disabled={busy} onClick={() => run(() => api("menu", { method: "PATCH", json: { id: m.id, image_url: "" } }))}>
              เอารูปออก
            </button>
          )}
        </div>
      )}
      <div className="adm-actions">
        <button type="button" className="shop-btn" disabled={busy} onClick={save}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
        <button type="button" className="shop-btn is-ghost" disabled={busy} onClick={() => setEdit(null)}>ยกเลิก</button>
        {m && <button type="button" className="shop-link adm-cancel" disabled={busy} onClick={() => remove(m)}>ลบเมนู</button>}
      </div>
    </div>
  );

  return (
    <section className="adm-stack">
      <p className="shop-sub">ใช้ร่วมกันทุกสาขา · ปิด “มีขาย” = หน้าร้านขึ้นว่าวันนี้ไม่มี</p>
      {err && <p className="shop-err" role="alert">{err}</p>}
      {menu.map((m, k) => (
        <article key={m.id} className={`adm-card adm-menu${m.available ? "" : " is-off"}`}>
          <div className="adm-menu-row">
            <div className="adm-thumb">
              {m.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- รูปจาก Storage/โค้ดเว็บ ขนาดเล็ก
                <img src={m.image_url} alt="" loading="lazy" />
              ) : (
                <span aria-hidden="true">{m.name.slice(0, 1)}</span>
              )}
            </div>
            <div className="adm-menu-info">
              <b>{m.name}</b>
              <span>{baht(m.price)} · {m.points} แต้ม{m.redeemable ? "" : " · แลกแต้มไม่ได้"}</span>
            </div>
            <div className="adm-move">
              <button type="button" aria-label={`เลื่อน ${m.name} ขึ้น`} disabled={busy || k === 0} onClick={() => run(() => api("menu", { method: "PATCH", json: { id: m.id, move: "up" } }))}>↑</button>
              <button type="button" aria-label={`เลื่อน ${m.name} ลง`} disabled={busy || k === menu.length - 1} onClick={() => run(() => api("menu", { method: "PATCH", json: { id: m.id, move: "down" } }))}>↓</button>
            </div>
          </div>
          <div className="adm-actions">
            <button
              type="button"
              className={`adm-toggle${m.available ? " is-on" : ""}`}
              aria-pressed={m.available}
              disabled={busy}
              onClick={() => run(() => api("menu", { method: "PATCH", json: { id: m.id, available: !m.available } }))}
            >
              {m.available ? "✓ มีขาย" : "ปิดขายอยู่"}
            </button>
            {edit !== m.id && <button type="button" className="shop-link" onClick={() => open(m)}>แก้</button>}
          </div>
          {edit === m.id && form(m)}
        </article>
      ))}
      {edit === "new" ? (
        <article className="adm-card">
          <h3>เพิ่มเมนู</h3>
          {form(null)}
          <p className="shop-note">บันทึกแล้วค่อยกด “แก้” เพื่อใส่รูป</p>
        </article>
      ) : (
        <button type="button" className="shop-btn is-ghost" onClick={() => open(null)}>+ เพิ่มเมนู</button>
      )}
    </section>
  );
}
