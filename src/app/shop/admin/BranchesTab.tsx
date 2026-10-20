"use client";

import { useEffect, useState } from "react";
import { DAY_NAMES, api, bkkDate, shortDate, type Branch } from "./api";

/** ตั้งค่าสาขา: เปิด/ปิดรับ ส่งถึงที่ เวลาปิดรับ วันเปิด รอบเวลา วันหยุด จุดรับของ OpenChat */
export function BranchesTab() {
  const [list, setList] = useState<Branch[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ branches: Branch[] }>("branches")
      .then((r) => setList(r.branches))
      .catch((e: Error) => setErr(e.message));
  }, []);

  if (!list) return err ? <p className="shop-err" role="alert">{err}</p> : <p className="shop-sub">กำลังโหลด…</p>;
  return (
    <section className="adm-stack">
      <p className="shop-sub">เมนูและราคาใช้ร่วมกันทุกสาขา ส่วนนี้ตั้งแยกแต่ละสาขา</p>
      {list.map((b) => (
        <BranchCard key={b.id} branch={b} onSaved={(u) => setList((l) => l?.map((x) => (x.id === u.id ? u : x)) ?? l)} />
      ))}
    </section>
  );
}

function BranchCard({ branch, onSaved }: { branch: Branch; onSaved: (b: Branch) => void }) {
  const [b, setB] = useState(branch);
  const [slots, setSlots] = useState(branch.pickup_slots.join(", "));
  const [newDate, setNewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const r = await api<{ branch: Branch }>("branches", {
        method: "PATCH",
        json: {
          id: b.id,
          accepting: b.accepting,
          delivery: b.delivery,
          cutoff_hour: b.cutoff_hour,
          open_days: b.open_days,
          pickup_slots: slots.split(/[\s,]+/).filter(Boolean),
          closed_dates: b.closed_dates,
          pickup_note: b.pickup_note,
          openchat_url: b.openchat_url,
        },
      });
      setB(r.branch);
      setSlots(r.branch.pickup_slots.join(", "));
      onSaved(r.branch);
      setMsg("บันทึกแล้ว หน้าร้านเปลี่ยนทันที");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggleDay = (d: number) =>
    setB({ ...b, open_days: b.open_days.includes(d) ? b.open_days.filter((x) => x !== d) : [...b.open_days, d].sort() });
  const today = bkkDate();

  return (
    <article className="adm-card adm-branch">
      <div className="adm-branch-head">
        <h3>สาขา{b.name} <span className="adm-code">{b.code}</span></h3>
        <span className="adm-muted">ไลน์ {b.line_id || "-"}</span>
      </div>
      {b.orderLink && (
        <p className="adm-muted adm-break">
          ปุ่มสั่งอาหาร: <a href={b.orderLink} target="_blank" rel="noopener noreferrer">{b.orderLink}</a>
        </p>
      )}
      <div className="adm-actions">
        <button type="button" className={`adm-toggle${b.accepting ? " is-on" : ""}`} aria-pressed={b.accepting} onClick={() => setB({ ...b, accepting: !b.accepting })}>
          {b.accepting ? "✓ เปิดรับออร์เดอร์" : "ปิดรับชั่วคราว"}
        </button>
        <button type="button" className={`adm-toggle${b.delivery ? " is-on" : ""}`} aria-pressed={b.delivery} onClick={() => setB({ ...b, delivery: !b.delivery })}>
          {b.delivery ? "✓ ส่งถึงที่" : "ลูกค้ามารับเอง"}
        </button>
      </div>
      <div className="adm-form">
        <label>
          ปิดรับออร์เดอร์ของวันถัดไปตอน
          <select value={b.cutoff_hour} onChange={(e) => setB({ ...b, cutoff_hour: Number(e.target.value) })}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </label>
        <fieldset className="adm-days">
          <legend>วันที่{b.delivery ? "ส่ง" : "รับของ"}ได้</legend>
          {DAY_NAMES.map((name, d) => (
            <button key={d} type="button" className={b.open_days.includes(d) ? "is-on" : ""} aria-pressed={b.open_days.includes(d)} onClick={() => toggleDay(d)}>
              {name}
            </button>
          ))}
        </fieldset>
        <label>
          รอบเวลา{b.delivery ? "ส่ง" : "รับ"} (คั่นด้วยจุลภาค)
          <input value={slots} placeholder="18:00, 18:30, 19:00" onChange={(e) => setSlots(e.target.value)} />
        </label>
        <div>
          <span className="adm-label">วันหยุดพิเศษ</span>
          <div className="adm-dates">
            {b.closed_dates.filter((d) => d >= today).map((d) => (
              <span key={d} className="adm-date">
                {shortDate(d)}
                <button type="button" aria-label={`เอาวันหยุด ${d} ออก`} onClick={() => setB({ ...b, closed_dates: b.closed_dates.filter((x) => x !== d) })}>×</button>
              </span>
            ))}
            <input type="date" aria-label="เพิ่มวันหยุด" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
            <button
              type="button"
              className="shop-link"
              disabled={!newDate}
              onClick={() => {
                if (newDate && !b.closed_dates.includes(newDate)) setB({ ...b, closed_dates: [...b.closed_dates, newDate].sort() });
                setNewDate("");
              }}
            >
              เพิ่มวันหยุด
            </button>
          </div>
        </div>
        {!b.delivery && (
          <label>
            จุดรับของ (โชว์บนหน้าร้าน)
            <input value={b.pickup_note} maxLength={120} placeholder="เช่น ล็อบบี้ชั้น 1" onChange={(e) => setB({ ...b, pickup_note: e.target.value })} />
          </label>
        )}
        <label>
          ลิงก์ OpenChat ของสาขา (ไม่บังคับ)
          <input value={b.openchat_url} inputMode="url" placeholder="https://line.me/ti/g2/…" onChange={(e) => setB({ ...b, openchat_url: e.target.value })} />
        </label>
        <div className="adm-actions">
          <button type="button" className="shop-btn" disabled={busy} onClick={save}>{busy ? "กำลังบันทึก…" : "บันทึกสาขานี้"}</button>
          {msg && <span className="adm-ok" role="status">{msg}</span>}
        </div>
        {err && <p className="shop-err" role="alert">{err}</p>}
      </div>
    </article>
  );
}
