"use client";

import { useEffect, useState } from "react";
import { api, baht, bkkDate, mapUrl, phoneText, shortDate, type Order } from "./api";
import { Loading } from "./Loading";

type Data = {
  date: string;
  branches: { id: string; slug: string; name: string; code: string; delivery: boolean }[];
  orders: Order[];
  prep: { name: string; qty: number }[];
  totals: { orders: number; money: number; unchecked: number; done: number; pending: number };
};

type Action = "check" | "uncheck" | "done" | "undone" | "cancel";

/** ออร์เดอร์ตามวันรับ/ส่งของ: ของที่ต้องเตรียม + รายการ + ปุ่มเช็กเงิน/ส่งแล้ว/ยกเลิก */
export function OrdersTab() {
  const [date, setDate] = useState(bkkDate());
  const [branch, setBranch] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  /** เพิ่มทีละ 1 = โหลดใหม่ (หลังกดปุ่ม) */
  const [tick, setTick] = useState(0);
  /** วัน|สาขา ของข้อมูลที่โหลดมาล่าสุด — เปลี่ยนวัน/สาขาแล้วยังโหลดไม่เสร็จ ไม่โชว์ของวันเก่าใต้หัววันใหม่ */
  const [loaded, setLoaded] = useState("");

  useEffect(() => {
    let alive = true;
    const q = new URLSearchParams({ date, ...(branch ? { branch } : {}) });
    api<Data>(`orders?${q}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoaded(`${date}|${branch}`);
        setErr("");
      })
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [date, branch, tick]);

  function retry() {
    setErr("");
    setTick((t) => t + 1);
  }

  async function act(o: Order, action: Action) {
    if (action === "cancel" && !window.confirm(`ยกเลิกออร์เดอร์ ${o.order_no} ของ ${o.nickname}?\nแต้มที่ได้จากออร์เดอร์นี้จะถูกหักคืน และย้อนกลับไม่ได้`)) return;
    setBusy(o.id + action);
    setErr("");
    try {
      await api("orders", { method: "PATCH", json: { id: o.id, action } });
      setTick((t) => t + 1);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const today = bkkDate();
  const tomorrow = bkkDate(1);
  const byId = new Map(data?.branches.map((b) => [b.id, b]) ?? []);
  const deliveryOnly = data ? (branch ? !!data.branches.find((b) => b.slug === branch)?.delivery : false) : false;
  const view = data && loaded === `${date}|${branch}` ? data : null;
  const sorted = view ? [...view.orders].sort((a, b) => Number(a.status === "cancelled") - Number(b.status === "cancelled")) : [];

  return (
    <section className="adm-stack">
      <div className="adm-filters">
        <div className="adm-chips" role="group" aria-label="วัน">
          <button type="button" className={date === today ? "is-on" : ""} onClick={() => setDate(today)}>วันนี้</button>
          <button type="button" className={date === tomorrow ? "is-on" : ""} onClick={() => setDate(tomorrow)}>พรุ่งนี้</button>
          <input type="date" aria-label="เลือกวัน" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </div>
        <select aria-label="สาขา" value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">ทุกสาขา</option>
          {data?.branches.map((b) => <option key={b.slug} value={b.slug}>สาขา{b.name}</option>)}
        </select>
      </div>

      <h2 className="adm-h">{!branch ? "รับ/ส่ง" : deliveryOnly ? "ส่ง" : "รับ"} {shortDate(date)}</h2>
      {view && err && <p className="shop-err" role="alert">{err}</p>}
      {!view ? (
        <Loading err={err} onRetry={retry} />
      ) : (
        <>
          <div className="adm-card">
            <div className="adm-sum">
              <span><b>{view.totals.orders}</b> ออร์เดอร์</span>
              <span><b>{baht(view.totals.money)}</b></span>
              {view.totals.unchecked > 0 && <span className="adm-warn">ยังไม่เช็กเงิน {view.totals.unchecked}</span>}
              {view.totals.pending > 0 && <span className="adm-muted">รอจ่าย {view.totals.pending}</span>}
              {view.totals.done > 0 && <span className="adm-muted">ส่ง/รับแล้ว {view.totals.done}</span>}
            </div>
            {view.prep.length > 0 && (
              <>
                <h3>ต้องเตรียม</h3>
                <ul className="adm-prep">
                  {view.prep.map((p) => <li key={p.name}><span>{p.name}</span><b>{p.qty} กล่อง</b></li>)}
                </ul>
              </>
            )}
          </div>

          {!sorted.length && <p className="shop-sub">ยังไม่มีออร์เดอร์ของวันที่เลือก</p>}
          {sorted.map((o) => {
            const b = byId.get(o.branch_id);
            const off = o.status === "cancelled";
            const paid = o.payment_status === "paid";
            return (
              <article key={o.id} className={`adm-card adm-order${off ? " is-off" : ""}`}>
                <div className="adm-order-head">
                  <span className="adm-slot">{o.pickup_slot}</span>
                  <b>{o.order_no}</b>
                  <span>{o.nickname}{o.customer?.code ? ` · ${o.customer.code}` : ""}</span>
                  {!branch && b && <span className="adm-tag">{b.name}</span>}
                </div>
                <div className="adm-badges">
                  {off && <span className="adm-badge is-gray">ยกเลิกแล้ว</span>}
                  {!off && !paid && <span className="adm-badge is-amber">รอจ่าย</span>}
                  {!off && paid && (o.payment_checked ? <span className="adm-badge is-green">เงินเข้าแล้ว</span> : <span className="adm-badge is-amber">ยังไม่เช็กเงิน</span>)}
                  {o.status === "done" && <span className="adm-badge is-green">{b?.delivery ? "ส่งแล้ว" : "รับแล้ว"}</span>}
                  {o.reward_used && <span className="adm-badge">ใช้แต้ม</span>}
                </div>
                <ul className="adm-items">
                  {o.items.map((i) => <li key={i.name}>{i.name} × {i.qty}</li>)}
                </ul>
                <div className="adm-total">{baht(o.total)}{o.discount ? <span className="adm-muted"> (ลด {baht(o.discount)})</span> : null}</div>
                {o.delivery_address && (
                  <div className="adm-addr">
                    <div>📍 {o.delivery_address}</div>
                    <div className="adm-links">
                      {o.delivery_phone && <a href={`tel:${o.delivery_phone}`}>📞 {phoneText(o.delivery_phone)}</a>}
                      {o.delivery_map && <a href={mapUrl(o.delivery_map)} target="_blank" rel="noopener noreferrer">🗺 เปิดแผนที่</a>}
                    </div>
                  </div>
                )}
                {!off && (
                  <div className="adm-actions">
                    {paid && (
                      <button
                        type="button"
                        className={`adm-toggle${o.payment_checked ? " is-on" : ""}`}
                        aria-pressed={o.payment_checked}
                        disabled={!!busy}
                        onClick={() => act(o, o.payment_checked ? "uncheck" : "check")}
                      >
                        {o.payment_checked ? "✓ เช็กเงินเข้าแล้ว" : "เช็กเงินเข้าแล้ว"}
                      </button>
                    )}
                    {paid && (
                      <button
                        type="button"
                        className={`adm-toggle${o.status === "done" ? " is-on" : ""}`}
                        aria-pressed={o.status === "done"}
                        disabled={!!busy}
                        onClick={() => act(o, o.status === "done" ? "undone" : "done")}
                      >
                        {o.status === "done" ? `✓ ${b?.delivery ? "ส่งแล้ว" : "รับแล้ว"}` : b?.delivery ? "ส่งแล้ว" : "รับแล้ว"}
                      </button>
                    )}
                    <button type="button" className="shop-link adm-cancel" disabled={!!busy} onClick={() => act(o, "cancel")}>ยกเลิก</button>
                  </div>
                )}
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
