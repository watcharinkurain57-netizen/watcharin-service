"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  cutoffHour: number;
  slots: string[];
  pickupLabel: string;
  menu: MenuItem[];
  customer: { code: string; nickname: string; points: number } | null;
  /** true = QR จาก Omise ระบบเช็กเงินเข้าเอง */
  gateway: boolean;
};
type Placed = {
  orderNo: string;
  code: string;
  token: string;
  pickupLabel: string;
  total: number;
  earned: number;
  points: number;
};
/** ออร์เดอร์ที่สร้างแล้ว รอเงินเข้า (โหมด Omise) — เก็บรายการไว้โชว์ เพราะตะกร้ายังไม่ล้างจนกว่าจะจ่าย */
type Bill = {
  orderId: string;
  token: string;
  total: number;
  lines: { name: string; qty: number; price: number }[];
  discount: number;
  freeName: string;
};

const TOKEN_KEY = "shop-token";
const NICK_KEY = "shop-nick";

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

export function ShopOrder() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [nick, setNick] = useState("");
  const [slot, setSlot] = useState("");
  const [useReward, setUseReward] = useState(false);
  const [step, setStep] = useState<"menu" | "pay" | "done">("menu");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [bill, setBill] = useState<Bill | null>(null);
  const [qr, setQr] = useState("");
  const [expired, setExpired] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    const token = load(TOKEN_KEY);
    fetch("/api/shop/config", { headers: token ? { "x-shop-token": token } : {} })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "โหลดเมนูไม่สำเร็จ");
        setCfg(body);
        setSlot(body.slots[0] ?? "");
        setNick(load(NICK_KEY) || body.customer?.nickname || "");
      })
      .catch((e: Error) => setLoadError(e.message || "โหลดเมนูไม่สำเร็จ ลองรีเฟรช"));
  }, []);

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
    if (!nick.trim()) {
      setError("กรอกชื่อเล่นก่อนนะคะ");
      document.getElementById("shop-nick")?.focus();
      return;
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
    setCfg((c) => (c ? { ...c, customer: { code: result.code, nickname: nick.trim(), points: result.points } } : c));
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
          nickname: nick.trim(),
          slot,
          items: sum.lines.map((l) => ({ name: l.name, qty: l.qty })),
          useReward: sum.discount > 0,
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

  return (
    <main id="main-content" className="shop-app">
      <div className="shop-wrap">
        {step === "menu" && (
          <section>
            <header className="shop-head">
              <h1>{cfg.shopName}</h1>
              <p className="shop-sub">สั่งและโอนก่อน {cfg.cutoffHour}:00 รับของวันทำการถัดไป</p>
              <span className="shop-pill">ออร์เดอร์ตอนนี้ รับ{cfg.pickupLabel}</span>
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
              <h2>รับของ</h2>
              <div className="shop-field">
                <label htmlFor="shop-nick">ชื่อเล่น (ใช้ชื่อในไลน์หรือชื่อเล่นก็ได้)</label>
                <input id="shop-nick" value={nick} maxLength={30} autoComplete="nickname" placeholder="เช่น ต้น" onChange={(e) => setNick(e.target.value)} />
              </div>
              <div className="shop-field">
                <label htmlFor="shop-slot">เวลารับ</label>
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
              <p className="shop-err">QR หมดอายุแล้ว (30 นาที) กดสร้างใหม่ได้เลย</p>
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
              </>
            )}
            <div className="shop-lines">
              {bill.lines.map((l) => (
                <div key={l.name}><span>{l.name} × {l.qty}</span><span>{baht(l.price * l.qty)}</span></div>
              ))}
              {bill.discount > 0 && <div><span>แลกแต้ม ฟรี {bill.freeName}</span><span>−{baht(bill.discount)}</span></div>}
              <div><span>รับ{cfg.pickupLabel} เวลา {slot}</span><span /></div>
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
              <div><span>รับ{cfg.pickupLabel} เวลา {slot}</span><span /></div>
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
              <br />รับ{placed.pickupLabel} เวลา {slot}
              <br />รหัสลูกค้าของคุณ <b>{placed.code}</b>
            </p>
            <div className="shop-points">
              ได้ +{placed.earned} แต้ม รวมตอนนี้ <b>{placed.points}</b> แต้ม
              {placed.points >= 10 && <><br />ครบ 10 แล้ว ครั้งหน้าแลกฟรีได้ 1 กล่อง</>}
            </div>
            <p className="shop-note">ร้านสรุปออร์เดอร์ตอน {cfg.cutoffHour}:00 แล้วเตรียมของให้ตามเวลาที่เลือก</p>
            <button type="button" className="shop-btn is-ghost" onClick={() => setStep("menu")}>สั่งเพิ่ม</button>
          </section>
        )}
      </div>

      {step === "menu" && (
        <div className="shop-bar">
          <div className="shop-bar-in">
            <div className="shop-total">
              <div className="shop-note">
                {sum.count ? `${sum.count} กล่อง${sum.discount ? ` (ฟรี ${sum.freeName})` : ""}` : "ยังไม่ได้เลือก"}
              </div>
              <b>{baht(sum.total)}</b>
            </div>
            <button type="button" className="shop-btn" disabled={!sum.count || sending} onClick={goPay}>
              {sending ? "กำลังสร้าง QR…" : "ไปจ่ายเงิน"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
