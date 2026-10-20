"use client";

import { useEffect, useState } from "react";
import { api, baht, bkkDateTime, mapUrl, phoneText, shortDate, type Customer, type Order } from "./api";
import { Loading } from "./Loading";

/** ลูกค้า: ค้นชื่อเล่น/รหัส · แตะเพื่อดูออร์เดอร์ล่าสุด แก้แต้ม และจดโน้ต */
export function CustomersTab() {
  const [q, setQ] = useState("");
  const [list, setList] = useState<Customer[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // พิมพ์ค้นหา: รอหยุดพิมพ์แป๊บหนึ่งค่อยถาม
    const t = setTimeout(() => {
      api<{ customers: Customer[] }>(`customers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`)
        .then((r) => alive && (setList(r.customers), setErr("")))
        .catch((e: Error) => alive && setErr(e.message));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, tick]);

  return (
    <section className="adm-stack">
      <input type="search" aria-label="ค้นหาลูกค้า" placeholder="ค้นชื่อเล่น หรือรหัส เช่น S012" value={q} onChange={(e) => setQ(e.target.value)} />
      {list && err && <p className="shop-err" role="alert">{err}</p>}
      {!list ? (
        <Loading err={err} onRetry={() => (setErr(""), setTick((t) => t + 1))} />
      ) : !list.length ? (
        <p className="shop-sub">ไม่พบลูกค้า</p>
      ) : (
        list.map((c) => (
          <article key={c.id} className="adm-card adm-cust">
            <button type="button" className="adm-cust-row" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="adm-code">{c.code}</span>
              <b>{c.nickname}</b>
              <span className="adm-muted">{c.points} แต้ม · {c.orders ?? 0} ออร์เดอร์ · {baht(c.total_spent)}</span>
              {c.note && <span className="adm-note">📝 {c.note}</span>}
            </button>
            {open === c.id && (
              <Detail
                id={c.id}
                onSaved={(u) => setList((l) => l?.map((x) => (x.id === u.id ? { ...x, ...u } : x)) ?? l)}
              />
            )}
          </article>
        ))
      )}
    </section>
  );
}

function Detail({ id, onSaved }: { id: string; onSaved: (c: Customer) => void }) {
  const [data, setData] = useState<{ customer: Customer; orders: Order[] } | null>(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api<{ customer: Customer; orders: Order[] }>(`customers?id=${id}`)
      .then((r) => {
        if (!alive) return;
        setData(r);
        setPoints(String(r.customer.points));
        setNote(r.customer.note);
      })
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [id, tick]);

  async function save() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api<{ customer: Customer }>("customers", { method: "PATCH", json: { id, points: Number(points), note } });
      onSaved(r.customer);
      setMsg("บันทึกแล้ว");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <Loading err={err} onRetry={() => (setErr(""), setTick((t) => t + 1))} />;
  const addr = data.orders.find((o) => o.delivery_address);
  return (
    <div className="adm-detail">
      <p className="adm-muted">
        เป็นลูกค้าตั้งแต่ {shortDate(data.customer.created_at)} · สั่งล่าสุด {bkkDateTime(data.customer.last_order_at)} · แลกแต้มไปแล้ว {data.customer.rewards_used} ครั้ง
        {" · "}
        {data.customer.line ? "ผูกบัญชีไลน์แล้ว (เปลี่ยนมือถือก็ได้แต้มเดิม)" : "ยังไม่ผูกบัญชีไลน์ (มือถือจำไว้)"}
      </p>
      {addr && (
        <div className="adm-addr">
          <div>📍 {addr.delivery_address}</div>
          <div className="adm-links">
            {addr.delivery_phone && <a href={`tel:${addr.delivery_phone}`}>📞 {phoneText(addr.delivery_phone)}</a>}
            {addr.delivery_map && <a href={mapUrl(addr.delivery_map)} target="_blank" rel="noopener noreferrer">🗺 เปิดแผนที่</a>}
          </div>
        </div>
      )}
      <div className="adm-form">
        <div className="adm-row2">
          <label>แต้มสะสม<input type="number" inputMode="numeric" min={0} max={1000} value={points} onChange={(e) => setPoints(e.target.value)} /></label>
        </div>
        <label>โน้ต (เห็นแค่ร้าน)<textarea rows={2} maxLength={300} value={note} placeholder="เช่น ไม่ทานเผ็ด" onChange={(e) => setNote(e.target.value)} /></label>
        <div className="adm-actions">
          <button type="button" className="shop-btn" disabled={busy} onClick={save}>{busy ? "กำลังบันทึก…" : "บันทึก"}</button>
          {msg && <span className="adm-ok" role="status">{msg}</span>}
        </div>
        {err && <p className="shop-err" role="alert">{err}</p>}
      </div>
      <h3>ออร์เดอร์ล่าสุด</h3>
      {data.orders.length ? (
        <ul className="adm-hist">
          {data.orders.map((o) => (
            <li key={o.id} className={o.status === "cancelled" ? "is-off" : ""}>
              <span>{o.order_no} · {shortDate(o.pickup_date)}</span>
              <span>{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</span>
              <b>{baht(o.total)}{o.status === "cancelled" ? " (ยกเลิก)" : o.payment_status === "pending" ? " (ไม่ได้จ่าย)" : ""}</b>
            </li>
          ))}
        </ul>
      ) : (
        <p className="shop-sub">ยังไม่มีออร์เดอร์</p>
      )}
    </div>
  );
}
