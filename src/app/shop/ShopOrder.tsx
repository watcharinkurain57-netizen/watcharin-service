"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { lineDisplayName } from "@/lib/shop/liff";

type MenuItem = {
  name: string;
  description: string;
  price: number;
  points: number;
  redeemable: boolean;
  available: boolean;
  image_url: string;
};
type Config = {
  shopName: string;
  /** delivery = ส่งถึงที่ ลูกค้าใส่ที่อยู่ + เบอร์โทร · slots = เวลาส่ง */
  branch: { slug: string; name: string; pickupNote: string; openchatUrl: string; delivery: boolean };
  cutoffHour: number;
  slots: string[];
  /** null = สาขานี้ปิดรับออร์เดอร์อยู่ */
  pickupLabel: string | null;
  menu: MenuItem[];
  customer: { code: string; nickname: string; points: number } | null;
  /** true = QR จาก Omise ระบบเช็กเงินเข้าเอง */
  gateway: boolean;
  /** ออร์เดอร์ที่จ่ายแล้วของรอบรับของนี้ */
  roundOrders: number;
  /** ธนาคารที่กดจ่ายผ่านแอปได้ (Omise mobile banking) ว่าง = มีแต่ QR */
  banks: string[];
  /** LIFF ของสาขา ไว้ดึงชื่อจากไลน์ — ว่าง = ลูกค้าพิมพ์ชื่อเอง */
  liffId: string;
};
/** เปิด /shop เฉย ๆ ตอนมีหลายสาขา — ให้เลือกสาขาก่อน (ปกติลูกค้าเข้าทางปุ่มในไลน์ของสาขาอยู่แล้ว) */
type Chooser = {
  shopName: string;
  branches: { slug: string; name: string; pickupNote: string; delivery?: boolean }[];
};

const BANK_NAMES: Record<string, string> = {
  kbank: "กสิกรไทย",
  scb: "ไทยพาณิชย์",
  ktb: "กรุงไทย",
  bbl: "กรุงเทพ",
  bay: "กรุงศรี",
};

/** น้อยกว่านี้ไม่โชว์ — "สั่งแล้ว 1 ออร์เดอร์" ดูเงียบมากกว่าน่าเชื่อถือ */
const SHOW_ROUND_FROM = 3;
/** code/earned/points ไม่มี เมื่อธนาคารพากลับมาเปิดในเบราว์เซอร์ที่ไม่รู้จักลูกค้า */
type Placed = {
  orderNo: string;
  code?: string;
  pickupLabel: string;
  slot?: string;
  total: number;
  earned?: number;
  points?: number;
};
/** ออร์เดอร์ที่สร้างแล้ว รอเงินเข้า (โหมด Omise) — เก็บรายการไว้โชว์ เพราะตะกร้ายังไม่ล้างจนกว่าจะจ่าย */
type Bill = {
  orderId: string;
  token: string;
  total: number;
  lines: { name: string; qty: number; price: number }[];
  discount: number;
  freeName: string;
  /** วันรับของจริงของออร์เดอร์ (คิดตอนสั่ง) */
  pickupLabel: string;
};

const TOKEN_KEY = "shop-token";
const NICK_KEY = "shop-nick";
/** สาขาส่งถึงที่: จำที่อยู่ เบอร์ ตำแหน่ง ไว้ในเครื่อง ครั้งหน้าไม่ต้องพิมพ์ใหม่ */
const ADDR_KEY = "shop-addr";
const PHONE_KEY = "shop-phone";
const PIN_KEY = "shop-pin";

/** เบอร์ที่พิมพ์มา → ตัวเลขล้วน 0xxxxxxxxx (+66 → 0) · ไม่ใช่เบอร์ไทย = "" */
function cleanPhone(v: string): string {
  let d = v.replace(/[^0-9]/g, "");
  if (/^66[0-9]{8,9}$/.test(d)) d = `0${d.slice(2)}`;
  return /^0[0-9]{8,9}$/.test(d) ? d : "";
}

/** localStorage อาจโยน error ได้ (โหมดไม่ระบุตัวตน, LINE in-app browser บางรุ่น) */
function load(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* จำไม่ได้ก็แค่ต้องกรอกชื่อใหม่ครั้งหน้า */
  }
}
const baht = (n: number) => `${n.toLocaleString("th-TH")} บ.`;

/**
 * QR ของ Omise เป็น SVG — มือถือหลายรุ่นกดค้างบันทึก SVG ไม่ได้ จึงวาดลง canvas เป็น PNG
 * route อยู่โดเมนเดียวกัน canvas ไม่ติด taint
 */
async function qrToPng(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("qr");
  const blob = await res.blob();
  const src = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const w = 720;
    const h = Math.round(w * ((img.naturalHeight || 1) / (img.naturalWidth || 1)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(src);
  }
}

/** branch = slug จาก /shop/<slug> · ไม่ส่ง = /shop (สาขาเดียวใช้สาขานั้น หลายสาขาให้เลือก) */
export function ShopOrder({ branch }: { branch?: string }) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [choose, setChoose] = useState<Chooser | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [nick, setNick] = useState("");
  /** มีชื่อแล้ว (จำไว้ / จากไลน์) โชว์เป็นบรรทัดเดียว กด "แก้" ถึงจะเป็นช่องพิมพ์ */
  const [editNick, setEditNick] = useState(true);
  const [slot, setSlot] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  /** "lat,lng" จากปุ่มใช้ตำแหน่งตอนนี้ (ไม่บังคับ) */
  const [pin, setPin] = useState("");
  const [locating, setLocating] = useState(false);
  const [useReward, setUseReward] = useState(false);
  const [step, setStep] = useState<"menu" | "pay" | "done">("menu");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [qr, setQr] = useState("");
  const [expired, setExpired] = useState(false);
  /** กลับมาจากแอปธนาคาร (/shop/<สาขา>?paid=<order id>) — รอเช็กว่าจ่ายสำเร็จไหม */
  const [back, setBack] = useState<{ orderId: string; failed: boolean } | null>(null);
  const checking = useRef(false);

  useEffect(() => {
    const token = load(TOKEN_KEY);
    const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    fetch(`/api/shop/config${query}`, { headers: token ? { "x-shop-token": token } : {} })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "โหลดเมนูไม่สำเร็จ");
        if (body.branches) {
          setChoose(body);
          return;
        }
        setCfg(body);
        setSlot(body.slots[0] ?? "");
        if (body.branch?.delivery) {
          setAddress(load(ADDR_KEY));
          setPhone(load(PHONE_KEY));
          setPin(load(PIN_KEY));
        }
        const paidId = new URLSearchParams(window.location.search).get("paid");
        if (paidId) setBack({ orderId: paidId, failed: false });
        const known = load(NICK_KEY) || body.customer?.nickname || "";
        setNick(known);
        if (known) setEditNick(false);
        // เปิดจากไลน์และยังไม่เคยมีชื่อ — ใช้ชื่อที่แสดงในไลน์ (ถ้ายังไม่ได้เริ่มพิมพ์เอง)
        else
          lineDisplayName(body.liffId).then((n) => {
            if (!n) return;
            setNick((cur) => {
              if (cur) return cur;
              setEditNick(false);
              return n;
            });
          });
      })
      .catch((e: Error) => setLoadError(e.message || "โหลดเมนูไม่สำเร็จ ลองรีเฟรช"));
  }, [branch]);

  const points = cfg?.customer?.points ?? 0;

  const sum = useMemo(() => {
    if (!cfg) return { lines: [], sub: 0, discount: 0, freeName: "", total: 0, count: 0 };
    const lines = cfg.menu
      .filter((m) => cart[m.name])
      .map((m) => ({ ...m, qty: cart[m.name] }));
    const sub = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    // แลกฟรีกล่องที่แพงที่สุดที่แลกได้ — ตรงกับ shop_place_order()
    const best = useReward && points >= 10
      ? lines.filter((l) => l.redeemable).sort((a, b) => b.price - a.price)[0]
      : undefined;
    const discount = best?.price ?? 0;
    return { lines, sub, discount, freeName: best?.name ?? "", total: sub - discount, count };
  }, [cfg, cart, useReward, points]);

  const change = (name: string, delta: number) =>
    setCart((c) => ({ ...c, [name]: Math.min(20, Math.max(0, (c[name] ?? 0) + delta)) }));

  function goPay() {
    if (!cfg?.pickupLabel) {
      setError("สาขานี้ปิดรับออร์เดอร์อยู่");
      return;
    }
    if (!nick.trim()) {
      setError("กรอกชื่อเล่นก่อนนะคะ");
      setEditNick(true);
      document.getElementById("shop-nick")?.focus();
      return;
    }
    if (cfg.branch.delivery) {
      if (address.trim().length < 5) {
        setError("กรอกที่อยู่สำหรับส่งของก่อนนะคะ");
        document.getElementById("shop-addr")?.focus();
        return;
      }
      const p = cleanPhone(phone);
      if (!p) {
        setError("เบอร์โทรไม่ถูกต้อง ใส่เบอร์มือถือ 10 หลัก");
        document.getElementById("shop-phone")?.focus();
        return;
      }
      save(ADDR_KEY, address.trim());
      save(PHONE_KEY, p);
      save(PIN_KEY, pin);
    }
    setError("");
    save(NICK_KEY, nick.trim());
    if (cfg?.gateway) {
      void placeOrder();
      return;
    }
    setStep("pay");
    window.scrollTo(0, 0);
  }

  function finish(result: Placed) {
    setPlaced(result);
    const { code, points } = result;
    if (code && points !== undefined) {
      setCfg((c) => (c ? { ...c, customer: { code, nickname: nick.trim(), points } } : c));
    }
    setBack(null);
    if (window.location.search.includes("paid=")) window.history.replaceState(null, "", window.location.pathname);
    setCart({});
    setUseReward(false);
    setBill(null);
    setQr("");
    setStep("done");
    window.scrollTo(0, 0);
  }

  /** ส่งออร์เดอร์ — โหมดเดิม: หลังกด "โอนแล้ว" · โหมด Omise: ตอนกด "ไปจ่ายเงิน" เพื่อเอา QR */
  async function placeOrder() {
    setSending(true);
    setError("");
    const token = load(TOKEN_KEY);
    try {
      const res = await fetch("/api/shop/order", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-shop-token": token } : {}) },
        body: JSON.stringify({
          branch: cfg?.branch.slug,
          nickname: nick.trim(),
          slot,
          items: sum.lines.map((l) => ({ name: l.name, qty: l.qty })),
          useReward: sum.discount > 0,
          ...(cfg?.branch.delivery ? { delivery: { address: address.trim(), phone: cleanPhone(phone), map: pin } } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      save(TOKEN_KEY, body.token);
      if (body.payment === "omise" && body.paymentStatus !== "paid") {
        setBill({
          orderId: body.orderId,
          token: body.token,
          total: body.total,
          lines: sum.lines.map((l) => ({ name: l.name, qty: l.qty, price: l.price })),
          discount: sum.discount,
          freeName: sum.freeName,
          pickupLabel: body.pickupLabel,
        });
        setQr("");
        setExpired(false);
        setStep("pay");
        window.scrollTo(0, 0);
      } else {
        finish(body);
      }
    } catch (e) {
      setError((e as Error).message || "ส่งออร์เดอร์ไม่สำเร็จ ลองอีกครั้ง หรือทักแอดมินในไลน์");
    } finally {
      setSending(false);
    }
  }

  /** ปักหมุดจากตำแหน่งมือถือ — ไลน์/เบราว์เซอร์ถามขออนุญาตก่อน ไม่ให้ก็ใช้ที่อยู่ที่พิมพ์อย่างเดียว */
  function locate() {
    if (!navigator.geolocation) {
      setError("มือถือนี้ใช้ตำแหน่งไม่ได้ พิมพ์ที่อยู่อย่างเดียวก็พอค่ะ");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin(`${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`);
        setLocating(false);
      },
      () => {
        setError("เปิดตำแหน่งไม่ได้ (ไม่ได้อนุญาต หรือสัญญาณไม่พอ) พิมพ์ที่อยู่อย่างเดียวก็พอค่ะ");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  // QR ของออร์เดอร์ → PNG ให้กดค้างบันทึกได้ (แปลงไม่ได้ก็ใช้ SVG ตรง ๆ)
  useEffect(() => {
    if (!bill) return;
    const url = `/api/shop/pay?order=${bill.orderId}&t=${bill.token}`;
    let alive = true;
    qrToPng(url)
      .then((png) => alive && setQr(png))
      .catch(() => alive && setQr(url));
    return () => {
      alive = false;
    };
  }, [bill]);

  // รอเงินเข้า: ถามทุก 3 วิ และทันทีที่ลูกค้าสลับกลับมาจากแอปธนาคาร
  const check = useCallback(async () => {
    if (!bill || checking.current) return;
    checking.current = true;
    try {
      const res = await fetch(`/api/shop/pay/status?order=${bill.orderId}`, {
        headers: { "x-shop-token": bill.token },
        cache: "no-store",
      });
      const body = await res.json();
      if (body.status === "paid") finish(body);
      else if (body.status === "expired") setExpired(true);
    } catch {
      /* เน็ตสะดุด รอบหน้าค่อยถามใหม่ */
    } finally {
      checking.current = false;
    }
    // finish ใช้ state ล่าสุดผ่าน setter ทั้งหมด ไม่ต้องใส่ใน deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill]);

  /** เปลี่ยนจาก QR ไปจ่ายในแอปธนาคาร — Omise พาเข้าแอปแล้วธนาคารส่งกลับมา /shop?paid=… */
  async function payByBank(bank: string) {
    if (!bill) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/shop/pay/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shop-token": bill.token },
        body: JSON.stringify({ order: bill.orderId, bank }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      window.location.href = body.url;
    } catch (e) {
      setError((e as Error).message || "เปิดแอปธนาคารไม่สำเร็จ ลองสแกน QR แทน");
      setSending(false);
    }
  }

  // กลับมาจากแอปธนาคาร: ถามสถานะจนรู้ผล (token อาจไม่มี ถ้าเปิดในเบราว์เซอร์อื่น)
  useEffect(() => {
    if (!back || back.failed) return;
    let alive = true;
    const token = load(TOKEN_KEY);
    const ask = async () => {
      try {
        const res = await fetch(`/api/shop/pay/status?order=${back.orderId}`, {
          headers: token ? { "x-shop-token": token } : {},
          cache: "no-store",
        });
        const body = await res.json();
        if (!alive) return;
        if (body.status === "paid") finish(body);
        else if (body.status === "expired" || res.status === 404) setBack({ ...back, failed: true });
      } catch {
        /* เน็ตสะดุด รอบหน้าค่อยถามใหม่ */
      }
    };
    void ask();
    const timer = setInterval(ask, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [back]);

  useEffect(() => {
    if (step !== "pay" || !bill || expired) return;
    const timer = setInterval(check, 3000);
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [step, bill, expired, check]);

  if (choose) {
    return (
      <main id="main-content" className="shop-app">
        <div className="shop-wrap">
          <header className="shop-head">
            <h1>{choose.shopName}</h1>
            <p className="shop-sub">เลือกสาขาที่จะรับของ</p>
          </header>
          <nav className="shop-branches" aria-label="สาขา">
            {choose.branches.map((b) => (
              <a key={b.slug} className="shop-branch" href={`/shop/${b.slug}`}>
                <b>สาขา{b.name}</b>
                {b.delivery ? <span>ส่งถึงที่</span> : b.pickupNote && <span>{b.pickupNote}</span>}
              </a>
            ))}
          </nav>
        </div>
      </main>
    );
  }

  if (!cfg) {
    return (
      <main id="main-content" className="shop-app">
        <div className="shop-wrap">
          <h1>แซลดอง กุ้งแช่</h1>
          <p className="shop-sub">{loadError || "กำลังโหลดเมนู…"}</p>
        </div>
      </main>
    );
  }

  /** สาขาส่งถึงที่เขียนว่า "ส่ง…" แทน "รับ…" */
  const verb = cfg.branch.delivery ? "ส่ง" : "รับ";

  return (
    <main id="main-content" className="shop-app">
      <div className="shop-wrap">
        {back && step !== "done" && (
          <section className="shop-pay">
            {back.failed ? (
              <>
                <h2>ยังไม่ได้รับเงิน</h2>
                <p className="shop-err">การจ่ายในแอปธนาคารไม่สำเร็จหรือถูกยกเลิก ออร์เดอร์นี้ยังไม่ถูกส่งให้ร้าน</p>
                <button
                  type="button"
                  className="shop-btn"
                  onClick={() => {
                    setBack(null);
                    window.history.replaceState(null, "", window.location.pathname);
                  }}
                >
                  กลับไปสั่งใหม่
                </button>
              </>
            ) : (
              <>
                <h2>กำลังเช็กการจ่ายเงิน</h2>
                <p className="shop-wait" role="status"><span className="shop-dot" aria-hidden="true" />รอธนาคารยืนยัน… หน้านี้เปลี่ยนเอง</p>
              </>
            )}
          </section>
        )}

        {!back && step === "menu" && (
          <section>
            <header className="shop-head">
              <h1>{cfg.shopName}</h1>
              <p className="shop-where">
                สาขา{cfg.branch.name}
                {cfg.branch.delivery ? (
                  <span> · ส่งถึงที่</span>
                ) : (
                  cfg.branch.pickupNote && <span> · รับของที่ {cfg.branch.pickupNote}</span>
                )}
              </p>
              {cfg.pickupLabel ? (
                <>
                  {/* สาขาเปิดแค่บางวัน (เช่น เสาร์-อาทิตย์) "วันทำการถัดไป" ไม่ตรง — วันรับจริงอยู่ในป้ายข้างล่าง */}
                  <p className="shop-sub">สั่งและโอนก่อน {cfg.cutoffHour}:00 ของวันก่อน{cfg.branch.delivery ? "ส่ง" : "รับของ"}</p>
                  <span className="shop-pill">ออร์เดอร์ตอนนี้ {verb}{cfg.pickupLabel}</span>
                </>
              ) : (
                <span className="shop-pill is-closed">ตอนนี้สาขานี้ปิดรับออร์เดอร์</span>
              )}
              {cfg.pickupLabel && cfg.roundOrders >= SHOW_ROUND_FROM && (
                <span className="shop-social">🔥 รอบนี้สั่งแล้ว {cfg.roundOrders} ออร์เดอร์</span>
              )}
              {cfg.branch.openchatUrl && (
                <a className="shop-link" href={cfg.branch.openchatUrl} target="_blank" rel="noopener noreferrer">
                  เข้ากลุ่มลูกค้าของสาขา (OpenChat)
                </a>
              )}
            </header>

            <div className="shop-menu">
              {cfg.menu.map((m) => {
                const qty = cart[m.name] ?? 0;
                return (
                  <article
                    key={m.name}
                    className={`shop-card${m.available ? "" : " is-off"}${qty ? " is-picked" : ""}`}
                  >
                    <div className="shop-photo">
                      {m.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- รูปจาก Supabase Storage ที่เจ้าของร้านอัปโหลดเอง
                        <img src={m.image_url} alt={m.name} loading="lazy" decoding="async" />
                      ) : (
                        <span className="shop-initial" aria-hidden="true">{m.name.slice(0, 1)}</span>
                      )}
                      {m.points > 1 && <span className="shop-badge">{m.points} แต้ม</span>}
                    </div>
                    <div className="shop-info">
                      <div className="shop-name">{m.name}</div>
                      {m.description && <div className="shop-desc">{m.description}</div>}
                    </div>
                    <div className="shop-foot">
                      <span className="shop-price">{baht(m.price)}</span>
                      {!m.available ? (
                        <span className="shop-note">วันนี้ไม่มี</span>
                      ) : qty === 0 ? (
                        <div className="shop-qty">
                          <button type="button" className="is-add" aria-label={`เพิ่ม ${m.name}`} onClick={() => change(m.name, 1)}>+</button>
                        </div>
                      ) : (
                        <div className="shop-qty">
                          <button type="button" aria-label={`ลด ${m.name}`} onClick={() => change(m.name, -1)}>−</button>
                          <span aria-live="polite">{qty}</span>
                          <button type="button" className="is-add" aria-label={`เพิ่ม ${m.name}`} onClick={() => change(m.name, 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="shop-section">
              <h2>{cfg.branch.delivery ? "ส่งถึงที่" : "รับของ"}</h2>
              {nick.trim() && !editNick ? (
                <div className="shop-name-row">
                  <span>สั่งในชื่อ <b>{nick}</b></span>
                  <button type="button" className="shop-link" onClick={() => setEditNick(true)}>แก้</button>
                </div>
              ) : (
                <div className="shop-field">
                  <label htmlFor="shop-nick">ชื่อเล่น (ใช้ชื่อในไลน์หรือชื่อเล่นก็ได้)</label>
                  <input id="shop-nick" value={nick} maxLength={30} autoComplete="nickname" placeholder="เช่น ต้น" onChange={(e) => setNick(e.target.value)} />
                </div>
              )}
              {cfg.branch.delivery && (
                <>
                  <div className="shop-field">
                    <label htmlFor="shop-addr">ที่อยู่สำหรับส่ง</label>
                    <textarea
                      id="shop-addr"
                      value={address}
                      rows={3}
                      maxLength={300}
                      autoComplete="street-address"
                      placeholder="บ้านเลขที่ ซอย ถนน หมู่บ้าน/คอนโด และจุดสังเกต"
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="shop-field">
                    <label htmlFor="shop-phone">เบอร์โทร (ไว้โทรตอนไปส่ง)</label>
                    <input
                      id="shop-phone"
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      maxLength={15}
                      autoComplete="tel"
                      placeholder="08x-xxx-xxxx"
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  {pin ? (
                    <div className="shop-name-row">
                      <span>
                        📍 ปักหมุดแล้ว ·{" "}
                        <a href={`https://www.google.com/maps?q=${pin}`} target="_blank" rel="noopener noreferrer">ดูแผนที่</a>
                      </span>
                      <button type="button" className="shop-link" onClick={() => setPin("")}>เอาออก</button>
                    </div>
                  ) : (
                    <button type="button" className="shop-link shop-locate" disabled={locating} onClick={locate}>
                      {locating ? "กำลังหาตำแหน่ง…" : "📍 ใช้ตำแหน่งตอนนี้ปักหมุด (ไม่บังคับ)"}
                    </button>
                  )}
                </>
              )}
              <div className="shop-field">
                <label htmlFor="shop-slot">{cfg.branch.delivery ? "เวลาส่ง" : "เวลารับ"}</label>
                <select id="shop-slot" value={slot} onChange={(e) => setSlot(e.target.value)}>
                  {cfg.slots.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              {cfg.customer && (
                <div className="shop-points">
                  แต้มสะสม <b>{points}</b> แต้ม · รหัส {cfg.customer.code}
                  <div className="shop-stamps" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, k) => <i key={k} className={k < Math.min(points, 10) ? "is-on" : ""} />)}
                  </div>
                  {points >= 10 && (
                    <label className="shop-check">
                      <input type="checkbox" checked={useReward} onChange={(e) => setUseReward(e.target.checked)} />
                      ใช้ 10 แต้ม แลกฟรี 1 กล่อง (ยกเว้นเซ็ตรวม)
                    </label>
                  )}
                </div>
              )}
              {error && <p className="shop-err">{error}</p>}
            </div>
          </section>
        )}

        {step === "pay" && bill && (
          <section className="shop-pay">
            <h2>สแกนจ่ายด้วยพร้อมเพย์</h2>
            <div className="shop-amount">{baht(bill.total)}</div>
            {expired ? (
              <p className="shop-err">QR หมดอายุ หรือการจ่ายไม่สำเร็จ กดสร้าง QR ใหม่ได้เลย</p>
            ) : qr ? (
              // eslint-disable-next-line @next/next/no-img-element -- PNG จาก canvas ต้องกดค้างบันทึกได้
              <img className="shop-qr is-gateway" src={qr} alt={`QR พร้อมเพย์ ${bill.total} บาท`} />
            ) : (
              <div className="shop-qr is-gateway is-loading" aria-label="กำลังโหลด QR" />
            )}
            {!expired && (
              <>
                <p className="shop-wait" role="status"><span className="shop-dot" aria-hidden="true" />รอเงินเข้า… จ่ายแล้วหน้านี้เปลี่ยนเอง</p>
                {qr.startsWith("data:") && (
                  <a className="shop-btn is-ghost" href={qr} download={`qr-${bill.total}.png`}>บันทึกรูป QR</a>
                )}
                <p className="shop-note">สั่งจากมือถือเครื่องเดียวกับที่จะโอน: บันทึกรูป QR → เปิดแอปธนาคาร → สแกนจากรูป แล้วกลับมาหน้านี้</p>
                {cfg.banks.length > 0 && bill.total >= 20 && (
                  <div className="shop-banks">
                    <p className="shop-note">หรือกดจ่ายในแอปธนาคารเลย (บนมือถือ)</p>
                    <div className="shop-bank-grid">
                      {cfg.banks.map((b) => (
                        <button key={b} type="button" className="shop-btn is-ghost" disabled={sending} onClick={() => payByBank(b)}>
                          {BANK_NAMES[b] ?? b}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="shop-lines">
              {bill.lines.map((l) => (
                <div key={l.name}><span>{l.name} × {l.qty}</span><span>{baht(l.price * l.qty)}</span></div>
              ))}
              {bill.discount > 0 && <div><span>แลกแต้ม ฟรี {bill.freeName}</span><span>−{baht(bill.discount)}</span></div>}
              <div><span>{verb}{bill.pickupLabel} เวลา {slot}</span><span /></div>
              {cfg.branch.delivery && <div><span>ส่งที่ {address.trim()}</span><span /></div>}
            </div>
            {error && <p className="shop-err">{error}</p>}
            <div className="shop-row">
              <button type="button" className="shop-btn is-ghost" onClick={() => { setBill(null); setStep("menu"); }}>แก้ออร์เดอร์</button>
              {expired && (
                <button type="button" className="shop-btn" disabled={sending} onClick={placeOrder}>
                  {sending ? "กำลังสร้าง…" : "สร้าง QR ใหม่"}
                </button>
              )}
            </div>
          </section>
        )}

        {step === "pay" && !bill && (
          <section className="shop-pay">
            <h2>สแกนจ่ายด้วยพร้อมเพย์</h2>
            <div className="shop-amount">{baht(sum.total)}</div>
            {sum.total > 0 ? (
              // eslint-disable-next-line @next/next/no-img-element -- PNG จาก route ต้องกดค้างบันทึกได้
              <img className="shop-qr" src={`/api/shop/qr?amount=${sum.total}`} width={240} height={240} alt={`QR พร้อมเพย์ ${sum.total} บาท`} />
            ) : (
              <p>ยอด 0 บาท ไม่ต้องโอน</p>
            )}
            <p className="shop-note">สั่งจากมือถือเครื่องเดียวกับที่จะโอน: กดค้างที่ QR → บันทึกรูป → เปิดแอปธนาคาร → สแกนจากรูป</p>
            <div className="shop-lines">
              {sum.lines.map((l) => (
                <div key={l.name}><span>{l.name} × {l.qty}</span><span>{baht(l.price * l.qty)}</span></div>
              ))}
              {sum.discount > 0 && <div><span>แลกแต้ม ฟรี {sum.freeName}</span><span>−{baht(sum.discount)}</span></div>}
              <div><span>{verb}{cfg.pickupLabel} เวลา {slot}</span><span /></div>
              {cfg.branch.delivery && <div><span>ส่งที่ {address.trim()}</span><span /></div>}
            </div>
            {error && <p className="shop-err">{error}</p>}
            <div className="shop-row">
              <button type="button" className="shop-btn is-ghost" onClick={() => setStep("menu")}>แก้ออร์เดอร์</button>
              <button type="button" className="shop-btn" disabled={sending} onClick={placeOrder}>
                {sending ? "กำลังส่ง…" : "โอนแล้ว ยืนยันออร์เดอร์"}
              </button>
            </div>
          </section>
        )}

        {step === "done" && placed && (
          <section className="shop-done">
            <div className="shop-big">✓ รับออร์เดอร์แล้ว</div>
            <p>
              เลขออร์เดอร์ <b>{placed.orderNo}</b>
              <br />{verb}{placed.pickupLabel} เวลา {placed.slot ?? slot}
              {placed.code && <><br />รหัสลูกค้าของคุณ <b>{placed.code}</b></>}
            </p>
            {placed.points !== undefined ? (
              <div className="shop-points">
                ได้ +{placed.earned} แต้ม รวมตอนนี้ <b>{placed.points}</b> แต้ม
                {placed.points >= 10 && <><br />ครบ 10 แล้ว ครั้งหน้าแลกฟรีได้ 1 กล่อง</>}
              </div>
            ) : (
              <p className="shop-note">แต้มเข้าบัญชีแล้ว ดูแต้มได้ตอนเปิดหน้าร้านจากไลน์</p>
            )}
            <p className="shop-note">
              ร้านสรุปออร์เดอร์ตอน {cfg.cutoffHour}:00 แล้ว{cfg.branch.delivery ? "นำไปส่งตามเวลาที่เลือก" : "เตรียมของให้ตามเวลาที่เลือก"}
            </p>
            <button type="button" className="shop-btn is-ghost" onClick={() => setStep("menu")}>สั่งเพิ่ม</button>
          </section>
        )}
      </div>

      {!back && step === "menu" && (
        <div className="shop-bar">
          <div className="shop-bar-in">
            <div className="shop-total">
              <div className="shop-note">
                {sum.count ? `${sum.count} กล่อง${sum.discount ? ` (ฟรี ${sum.freeName})` : ""}` : "ยังไม่ได้เลือก"}
              </div>
              <b>{baht(sum.total)}</b>
            </div>
            <button type="button" className="shop-btn" disabled={!sum.count || sending || !cfg.pickupLabel} onClick={goPay}>
              {!cfg.pickupLabel ? "ปิดรับออร์เดอร์" : sending ? "กำลังสร้าง QR…" : "ไปจ่ายเงิน"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
