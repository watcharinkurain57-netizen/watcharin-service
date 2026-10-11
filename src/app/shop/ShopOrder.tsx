"use client";

import { useEffect, useMemo, useState } from "react";

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
    setStep("pay");
    window.scrollTo(0, 0);
  }

  async function confirm() {
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
      setPlaced(body);
      setCfg((c) => (c ? { ...c, customer: { code: body.code, nickname: nick.trim(), points: body.points } } : c));
      setCart({});
      setUseReward(false);
      setStep("done");
      window.scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message || "ส่งออร์เดอร์ไม่สำเร็จ ลองอีกครั้ง หรือทักแอดมินในไลน์");
    } finally {
      setSending(false);
    }
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

        {step === "pay" && (
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
              <button type="button" className="shop-btn" disabled={sending} onClick={confirm}>
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
            <button type="button" className="shop-btn" disabled={!sum.count} onClick={goPay}>ไปจ่ายเงิน</button>
          </div>
        </div>
      )}
    </main>
  );
}
