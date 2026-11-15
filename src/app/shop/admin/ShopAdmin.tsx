"use client";

import { useEffect, useState } from "react";
import { api, authLost } from "./api";
import { BranchesTab } from "./BranchesTab";
import { GoogleMark } from "@/components/auth/GoogleMark";
import { CustomersTab } from "./CustomersTab";
import { Loading } from "./Loading";
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
/** ผลจากการเข้าด้วย Google (/api/shop/admin/google ส่งกลับมาเป็น ?google=…) */
const GOOGLE_RESULT: Record<string, string> = {
  denied: "บัญชี Google นี้ไม่ได้เป็นแอดมินของเว็บ ลองเลือกบัญชีอื่น",
  cancelled: "ยกเลิกการเข้าด้วย Google แล้ว",
  failed: "เข้าด้วย Google ไม่สำเร็จ ลองอีกครั้ง",
};

/** แอปไลน์ (เปิดลิงก์ในแชท) — Google ไม่ให้ล็อกอินในเบราว์เซอร์ของแอป */
const inLineApp = () => typeof navigator !== "undefined" && / Line\//i.test(navigator.userAgent);

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
  const [err, setErr] = useState(() =>
    typeof window === "undefined" ? "" : (GOOGLE_RESULT[new URLSearchParams(window.location.search).get("google") ?? ""] ?? ""),
  );
  const [lineApp] = useState(inLineApp);
  /** เช็กว่าเข้าระบบอยู่ไหมไม่สำเร็จ (เน็ต/เว็บช้า) — ขึ้นปุ่มลองใหม่ ไม่เด้งไปหน้าขอลิงก์ */
  const [bootErr, setBootErr] = useState("");
  const [boot, setBoot] = useState(0);

  useEffect(() => {
    let alive = true;
    api<{ admin: boolean }>("session")
      .then((r) => alive && setAdmin(r.admin))
      .catch((e: Error) => alive && setBootErr(e.message));
    return () => {
      alive = false;
    };
  }, [boot]);

  useEffect(() => {
    // ?google=… อ่านแล้ว ลบออกจากแถบที่อยู่ (กดรีเฟรชแล้วข้อความไม่ค้าง)
    if (new URLSearchParams(window.location.search).has("google")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
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
        <div className="adm-gate">
          <Loading err={bootErr} onRetry={() => (setBootErr(""), setBoot((b) => b + 1))} />
        </div>
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
              {lineApp ? (
                <>
                  <p className="shop-sub">
                    Google ไม่ให้เข้าสู่ระบบในแอปไลน์ เปิดหน้านี้ใน Safari หรือ Chrome ก่อน
                    (กดปุ่มเมนูของหน้านี้ แล้วเลือกเปิดในเบราว์เซอร์)
                  </p>
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- ต้องโหลดใหม่ทั้งหน้า ไลน์ถึงจะเปิดออกไปเบราว์เซอร์ */}
                  <a className="shop-btn adm-google" href="/shop/admin?openExternalBrowser=1">เปิดใน Safari / Chrome</a>
                </>
              ) : (
                <>
                  <p className="shop-sub">เข้าด้วยบัญชี Google ที่เป็นแอดมินของเว็บ เครื่องนี้จะจำไว้ 30 วัน</p>
                  <a className="shop-btn adm-google" href="/api/shop/admin/google">
                    <GoogleMark className="adm-gmark" />
                    เข้าสู่ระบบด้วย Google
                  </a>
                </>
              )}
              <p className="shop-sub adm-or">หรือให้ระบบส่งลิงก์เข้าระบบไปที่ไลน์ร้านของเจ้าของร้าน (คนอื่นกดได้ แต่ลิงก์ไม่ไปถึงเขา)</p>
              <button type="button" className="shop-btn is-ghost" disabled={busy} onClick={sendLink}>
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
