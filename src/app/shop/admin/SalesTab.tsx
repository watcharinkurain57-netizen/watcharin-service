"use client";

import { useEffect, useState } from "react";
import { api, baht, shortDate } from "./api";
import { Loading } from "./Loading";

type Sum = { orders: number; money: number };
type Stats = {
  date: string;
  monthOf: string;
  today: Sum;
  tomorrow: Sum;
  week: Sum;
  month: Sum;
  branches: { slug: string; name: string; today: Sum; week: Sum; month: Sum }[];
  daily: ({ date: string } & Sum)[];
  topMenu: { name: string; qty: number; money: number }[];
  customers: number;
};

/** ยอดขายตามวันรับ/ส่งของ (เฉพาะที่จ่ายแล้ว ไม่ถูกยกเลิก) */
export function SalesTab() {
  const [d, setD] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api<Stats>("stats")
      .then((r) => alive && setD(r))
      .catch((e: Error) => alive && setErr(e.message));
    return () => {
      alive = false;
    };
  }, [tick]);

  if (!d) return <Loading err={err} onRetry={() => (setErr(""), setTick((t) => t + 1))} />;

  const max = Math.max(1, ...d.daily.map((x) => x.money));
  const tiles: [string, Sum][] = [
    ["วันนี้", d.today],
    ["พรุ่งนี้ (สั่งไว้แล้ว)", d.tomorrow],
    ["7 วันล่าสุด", d.week],
    ["เดือนนี้", d.month],
  ];
  return (
    <section className="adm-stack">
      <p className="shop-sub">นับเฉพาะออร์เดอร์ที่จ่ายแล้ว ตามวันรับ/ส่งของ · ลูกค้าทั้งหมด {d.customers} คน</p>
      <div className="adm-tiles">
        {tiles.map(([label, v]) => (
          <div key={label} className="adm-tile">
            <span>{label}</span>
            <b>{baht(v.money)}</b>
            <span>{v.orders} ออร์เดอร์</span>
          </div>
        ))}
      </div>

      <div className="adm-card">
        <h3>แยกสาขา</h3>
        <table className="adm-table">
          <thead>
            <tr><th>สาขา</th><th>วันนี้</th><th>7 วัน</th><th>เดือนนี้</th></tr>
          </thead>
          <tbody>
            {d.branches.map((b) => (
              <tr key={b.slug}>
                <td>{b.name}</td>
                <td>{baht(b.today.money)}</td>
                <td>{baht(b.week.money)}</td>
                <td>{baht(b.month.money)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-card">
        <h3>รายวัน 14 วันล่าสุด</h3>
        <ul className="adm-bars">
          {[...d.daily].reverse().map((x) => (
            <li key={x.date}>
              <span className="adm-bar-day">{shortDate(x.date)}</span>
              <span className="adm-bar"><i style={{ width: `${(x.money / max) * 100}%` }} /></span>
              <span className="adm-bar-num">{x.money ? baht(x.money) : "-"}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="adm-card">
        <h3>เมนูขายดีเดือนนี้</h3>
        {d.topMenu.length ? (
          <ul className="adm-prep">
            {d.topMenu.map((m) => <li key={m.name}><span>{m.name}</span><b>{m.qty} กล่อง · {baht(m.money)}</b></li>)}
          </ul>
        ) : (
          <p className="shop-sub">ยังไม่มียอดเดือนนี้</p>
        )}
      </div>
    </section>
  );
}
