"use client";

import { useEffect, useState } from "react";
import { api, authLost } from "./api";
import { BranchesTab } from "./BranchesTab";
import { CustomersTab } from "./CustomersTab";
import { MenuTab } from "./MenuTab";
import { OrdersTab } from "./OrdersTab";
import { SalesTab } from "./SalesTab";

const TABS = [
  { key: "orders", label: "ออร์เดอร์" },
  { key: "sales", label: "ยอดขาย" },
  { key: "menu", label: "เมนู" },
  { key: "customers", label: "ลูกค้า" },
  { key: "branches", label: "สาขา" },
] as const;
type Tab = (typeof TABS)[number]["key"];
const TAB_KEY = "shop-admin-tab";

/**
 * หลังบ้านร้าน — เข้าด้วยลิงก์ที่ระบบส่งไปที่ไลน์ของเจ้าของร้าน (ไม่มีรหัสผ่าน)
 * ?login=<รหัส> มาจากลิงก์ในไลน์: ต้องกดปุ่มยืนยันก่อน (ไลน์แอบเปิดลิงก์ไปทำตัวอย่างลิงก์ ถ้าใช้ตอนเปิดจะเสียลิงก์)
 */
/** แท็บที่เปิดค้างไว้ครั้งก่อน (หน้าแรกขึ้น "กำลังโหลด" ก่อนเสมอ ค่าจากเบราว์เซอร์จึงไม่ทำให้หน้าเพี้ยนตอนโหลด) */
function savedTab(): Tab {
  try {
    const saved = typeof window === "undefined" ? null : localStorage.getItem(TAB_KEY);
    return TABS.find((t) => t.key === saved)?.key ?? "orders";
  } catch {
    return "orders";
  }
}

export function ShopAdmin() {
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [login, setLogin] = useState(() =>
    typeof window === "undefined" ? "" : (new URLSearchParams(window.location.search).get("login") ?? ""),
  );
  const [tab, setTab] = useState<Tab>(savedTab);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ admin: boolean }>("session")
      .then((r) => setAdmin(r.admin))
      .catch(() => setAdmin(false));
    const lost = () => setAdmin(false);
    authLost?.addEventListener("lost", lost);
    return () => authLost?.removeEventListener("lost", lost);
  }, []);

  function pick(t: Tab) {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ไม่เป็นไร */
    }
  }

  async function sendLink() {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await api("login", { method: "POST", json: {} });
      setMsg("ส่งลิงก์ไปที่ไลน์ของร้านแล้ว เปิดแชทไลน์ร้าน (สาขาแรก) แล้วกดลิงก์ได้เลย ลิงก์ใช้ได้ 15 นาที");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmLogin() {
    setBusy(true);
    setErr("");
    try {
      await api("session", { method: "POST", json: { login } });
      window.history.replaceState(null, "", window.location.pathname);
      setLogin("");
      setAdmin(true);
    } catch (e) {
      setErr((e as Error).message);
      setLogin("");
      window.history.replaceState(null, "", window.location.pathname);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await api("session", { method: "DELETE" }).catch(() => {});
    setAdmin(false);
  }

  if (admin === null) {
    return (
      <main id="main-content" className="shop-app adm">
        <div className="adm-gate"><p className="shop-sub">กำลังโหลด…</p></div>
      </main>
    );
  }

  if (!admin || login) {
    return (
      <main id="main-content" className="shop-app adm">
        <div className="adm-gate">
          <h1>หลังบ้านร้าน</h1>
          {login && !admin ? (
            <>
              <p className="shop-sub">กดปุ่มเพื่อเข้าระบบด้วยลิงก์จากไลน์ เครื่องนี้จะจำไว้ 30 วัน</p>
              <button type="button" className="shop-btn" disabled={busy} onClick={confirmLogin}>
                {busy ? "กำลังเข้า…" : "เข้าสู่ระบบ"}
              </button>
            </>
          ) : login && admin ? (
            <>
              <p className="shop-sub">เครื่องนี้เข้าระบบอยู่แล้ว</p>
              <button
                type="button"
                className="shop-btn"
                onClick={() => {
                  setLogin("");
                  window.history.replaceState(null, "", window.location.pathname);
                }}
              >
                ไปหน้าหลังบ้าน
              </button>
            </>
          ) : (
            <>
              <p className="shop-sub">
                ไม่ต้องใช้รหัสผ่าน กดปุ่มแล้วระบบจะส่งลิงก์เข้าระบบไปที่ไลน์ร้านของเจ้าของร้าน
                (คนอื่นกดได้ แต่ลิงก์ไม่ไปถึงเขา)
              </p>
              <button type="button" className="shop-btn" disabled={busy} onClick={sendLink}>
                {busy ? "กำลังส่ง…" : "ส่งลิงก์เข้าระบบไปที่ไลน์ร้าน"}
              </button>
            </>
          )}
          {msg && <p className="adm-ok" role="status">{msg}</p>}
          {err && <p className="shop-err" role="alert">{err}</p>}
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="shop-app adm">
      <header className="adm-top">
        <div className="adm-top-in">
          <b>หลังบ้าน แซลดอง กุ้งแช่</b>
          <button type="button" className="shop-link" onClick={logout}>ออกจากระบบ</button>
        </div>
        <nav className="adm-tabs" aria-label="เมนูหลังบ้าน">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? "is-on" : ""}
              aria-current={tab === t.key ? "page" : undefined}
              onClick={() => pick(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="adm-wrap">
        {tab === "orders" && <OrdersTab />}
        {tab === "sales" && <SalesTab />}
        {tab === "menu" && <MenuTab />}
        {tab === "customers" && <CustomersTab />}
        {tab === "branches" && <BranchesTab />}
      </div>
    </main>
  );
}
