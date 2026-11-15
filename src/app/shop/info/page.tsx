import type { Metadata } from "next";
import { enabledBanks, omiseEnabled } from "@/lib/shop/omise";
import { branchSlug, cutoffText, readBranches, readSettings, shopDb, type ShopBranch } from "@/lib/shop/shop.server";
import { shopMetadata, shopViewport } from "../meta";
import "../shop.css";

export const metadata: Metadata = {
  ...shopMetadata,
  title: "ข้อมูลร้านและนโยบาย · แซลดอง กุ้งแช่",
  description: "ช่องทางติดต่อ เมนูและราคา วิธีสั่งและชำระเงิน การรับและส่งสินค้า นโยบายยกเลิกและคืนเงิน และนโยบายความเป็นส่วนตัว",
};
export const viewport = shopViewport;
/** สาขา เมนู ราคา แก้ได้จากหลังบ้านทุกเมื่อ — อ่านสดทุกครั้ง */
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ from?: string }> };
type MenuRow = { name: string; description: string; price: number; points: number; redeemable: boolean; available: boolean };

const UPDATED = "28 ตุลาคม 2569";
const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

/** [1,2,3,4,5] → "จันทร์-ศุกร์" · [6,0] → "เสาร์-อาทิตย์" (เริ่มนับจากวันจันทร์) */
function daysText(days: number[]): string {
  const order = [...new Set(days)].map((d) => (d + 6) % 7).sort((a, b) => a - b);
  if (!order.length) return "ยังไม่ระบุวัน";
  if (order.length === 7) return "ทุกวัน";
  const name = (i: number) => DAY_NAMES[(i + 1) % 7];
  const inRow = order.every((d, i) => i === 0 || d === order[i - 1] + 1);
  if (inRow && order.length > 2) return `${name(order[0])}-${name(order[order.length - 1])}`;
  return order.map(name).join(inRow ? "-" : ", ");
}

function slotsText(slots: string[]): string {
  if (!slots.length) return "";
  return slots.length === 1 ? slots[0] : `${slots[0]}-${slots[slots.length - 1]}`;
}

/** "@463zgiwx" → ลิงก์เพิ่มเพื่อนในไลน์ */
function lineUrl(id: string): string {
  return `https://line.me/R/ti/p/${/^@[a-z0-9._-]+$/i.test(id) ? id : encodeURIComponent(id)}`;
}

const baht = (n: number) => `${n.toLocaleString("th-TH")} บาท`;

async function loadShop() {
  const db = shopDb();
  if (!db) return { shopName: "แซลดอง กุ้งแช่", branches: [] as ShopBranch[], menu: [] as MenuRow[] };
  const [settings, branches, menu] = await Promise.all([
    readSettings(db),
    readBranches(db),
    db.from("shop_menu").select("name, description, price, points, redeemable, available").order("sort"),
  ]);
  if (menu.error) console.error("[shop] info menu:", menu.error.message);
  return {
    shopName: settings?.shop_name || "แซลดอง กุ้งแช่",
    branches,
    menu: (menu.data ?? []) as MenuRow[],
  };
}

/**
 * ข้อมูลร้านและนโยบาย (/shop/info) — ลิงก์จากหน้าร้านทุกสาขา
 * ผู้ให้บริการรับชำระเงิน (Omise) ใช้ตรวจว่าร้านมีช่องทางติดต่อ ราคา และนโยบายครบ
 * สาขา ไลน์ วันเวลา เมนู ราคา ดึงจากฐานข้อมูล ส่วนนโยบายเป็นข้อความคงที่ด้านล่าง
 * ห้ามใส่อีเมลหรือเบอร์ส่วนตัวของเจ้าของร้านในไฟล์นี้ (repo เป็นสาธารณะ)
 */
export default async function ShopInfoPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const { shopName, branches, menu } = await loadShop();
  const back = branches.find((b) => b.slug === branchSlug(from));
  const cutoffs = [...new Set(branches.map(cutoffText))];
  const cutoff = cutoffs.length === 1 ? cutoffs[0] : "เวลาปิดรับของสาขา";
  const delivery = branches.filter((b) => b.delivery);
  const gateway = omiseEnabled();
  const banks = gateway && enabledBanks().length > 0;

  return (
    <main id="main-content" className="shop-app">
      <div className="shop-wrap shop-doc">
        <a className="shop-link shop-back" href={back ? `/shop/${back.slug}` : "/shop"}>
          ← กลับไปหน้าสั่งอาหาร{back ? ` สาขา${back.name}` : ""}
        </a>
        <header className="shop-head">
          <h1>{shopName}</h1>
          <p className="shop-sub">ข้อมูลร้านและนโยบาย · ปรับปรุงล่าสุด {UPDATED}</p>
        </header>

        <section className="shop-section" aria-labelledby="about">
          <h2 id="about">เกี่ยวกับร้าน</h2>
          <p>
            ร้าน{shopName}{" "}ขายอาหารทะเลดองและซาชิมิที่ร้านทำเอง (โฮมเมด) แบบสั่งล่วงหน้าเท่านั้น
            ร้านทำตามจำนวนที่ลูกค้าสั่งในแต่ละรอบ ลูกค้าสั่งและชำระเงินผ่านหน้าเว็บนี้ ซึ่งเปิดจากปุ่ม &ldquo;สั่งอาหาร&rdquo; ในไลน์ของแต่ละสาขา
          </p>
        </section>

        <section className="shop-section" aria-labelledby="contact">
          <h2 id="contact">ติดต่อร้าน</h2>
          <p>ติดต่อร้านทางไลน์ของสาขาที่สั่ง (กดลิงก์เพื่อเพิ่มเพื่อน แล้วพิมพ์ข้อความได้เลย) ร้านตอบทุกวันที่เปิดรับออร์เดอร์</p>
          {branches.length > 0 ? (
            <ul className="shop-contact">
              {branches.map((b) => (
                <li key={b.slug}>
                  <div>
                    <b>สาขา{b.name}</b>
                    {b.line_id && (
                      <>
                        {" · ไลน์ "}
                        <a href={lineUrl(b.line_id)} target="_blank" rel="noopener noreferrer">{b.line_id}</a>
                      </>
                    )}
                  </div>
                  <span>
                    {b.delivery ? "ส่งถึงที่" : "รับเองที่สาขา"} วัน{daysText(b.open_days)}
                    {b.pickup_slots.length > 0 && ` เวลา ${slotsText(b.pickup_slots)}\u00a0น.`}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="shop-note">ดูไลน์ของสาขาได้จากนามบัตรของร้าน</p>
          )}
          <p className="shop-note">ไลน์ทางการของร้านมีเฉพาะบัญชีข้างบนนี้ (บัญชีละสาขา) ทุกบัญชีดูแลโดยเจ้าของร้านคนเดียวกัน</p>
        </section>

        {menu.length > 0 && (
          <section className="shop-section" aria-labelledby="menu">
            <h2 id="menu">เมนูและราคา</h2>
            <ul className="shop-price-list">
              {menu.map((m) => (
                <li key={m.name}>
                  <span>
                    {m.name}
                    {m.description && <small>{m.description}</small>}
                  </span>
                  <b>{baht(m.price)}</b>
                </li>
              ))}
            </ul>
            <p className="shop-note">
              ราคาเป็นเงินบาท ใช้ราคาที่ขึ้นตอนสั่ง ยอดที่ต้องจ่ายคือยอดในหน้าชำระเงิน ไม่มีค่าใช้จ่ายอื่นเพิ่ม
              เมนูที่ขึ้นว่า &ldquo;วันนี้ไม่มี&rdquo; สั่งไม่ได้ในรอบนั้น
            </p>
          </section>
        )}

        <section className="shop-section" aria-labelledby="order">
          <h2 id="order">วิธีสั่งและชำระเงิน</h2>
          <ol>
            <li>เปิดไลน์ของสาขา กดปุ่ม &ldquo;สั่งอาหาร&rdquo; เลือกเมนูและจำนวน</li>
            <li>
              ใส่ชื่อเล่นและเลือกเวลา{delivery.length ? "รับ (สาขาส่งถึงที่ใส่ที่อยู่และเบอร์โทรสำหรับส่งด้วย)" : "รับ"}
            </li>
            <li>
              ชำระเงินด้วย QR พร้อมเพย์ (Thai QR Payment) สแกนจ่ายได้จากแอปธนาคารทุกธนาคาร
              {banks && " หรือกดจ่ายในแอปธนาคารที่ร้านรองรับ"}
            </li>
            <li>ชำระแล้วจะได้เลขออร์เดอร์ ร้านเตรียมของตามวันและเวลาที่เลือก</li>
          </ol>
          <p>
            เป็นการสั่งล่วงหน้า สั่งและชำระเงินก่อน {cutoff} น. ของวันก่อนรับของ หน้าสั่งอาหารจะบอกวันรับของของออร์เดอร์นั้นก่อนจ่ายเงินทุกครั้ง
            ออร์เดอร์ที่ยังไม่ได้ชำระเงิน ร้านยังไม่รับ
          </p>
          {gateway && (
            <p className="shop-note">
              ระบบรับชำระเงินให้บริการโดย Opn Payments (Omise) ร้านไม่เห็นและไม่เก็บข้อมูลบัญชีธนาคารหรือบัตรของลูกค้า
            </p>
          )}
        </section>

        <section className="shop-section" aria-labelledby="pickup">
          <h2 id="pickup">การรับสินค้าและการจัดส่ง</h2>
          <ul>
            {branches.map((b) => (
              <li key={b.slug}>
                <b>สาขา{b.name}</b>:{" "}
                {b.delivery
                  ? `ส่งถึงที่ตามที่อยู่ที่ลูกค้าใส่ วัน${daysText(b.open_days)} ในเวลาที่ลูกค้าเลือก ร้านโทรหาเบอร์ที่ให้ไว้ตอนไปถึง`
                  : `รับเองที่สาขา${b.pickup_note ? ` (${b.pickup_note})` : ""} วัน${daysText(b.open_days)} ตามเวลาที่ลูกค้าเลือก`}
              </li>
            ))}
            {delivery.length > 0 && (
              <li>ถ้าที่อยู่ไกลเกินกว่าที่ร้านส่งได้ ร้านทักไลน์แจ้งลูกค้าก่อนวันส่ง และคืนเงินเต็มจำนวน</li>
            )}
            <li>
              ร้านเก็บของให้ถึงเวลารับรอบสุดท้ายของวันนั้น ถ้าไม่ได้มารับ{delivery.length ? "หรือติดต่อผู้รับไม่ได้" : ""} และไม่ได้แจ้งร้านล่วงหน้า
              ร้านขอไม่คืนเงิน เพราะเป็นอาหารสดที่ทำตามออร์เดอร์
            </li>
            <li>วันหยุดหรือวันที่ร้านปิดรับ ร้านแจ้งในไลน์ของสาขา และหน้าสั่งอาหารจะไม่ให้เลือกวันนั้น</li>
          </ul>
        </section>

        <section className="shop-section" aria-labelledby="refund">
          <h2 id="refund">การยกเลิกและคืนเงิน</h2>
          <ul>
            <li>
              <b>ยกเลิกก่อนปิดรับ</b> ({cutoff} น. ของวันก่อนรับของ): ทักไลน์ของสาขาพร้อมเลขออร์เดอร์ ร้านคืนเงินเต็มจำนวน
            </li>
            <li>
              <b>หลังปิดรับ</b>: ร้านเริ่มเตรียมวัตถุดิบตามออร์เดอร์แล้ว จึงยกเลิกหรือคืนเงินไม่ได้ ยกเว้นสินค้ามีปัญหาตามข้อถัดไป
            </li>
            <li>
              <b>สินค้ามีปัญหา</b> เช่น ได้ไม่ครบ ผิดเมนู กล่องเสียหาย หรือไม่สด: ทักไลน์ของสาขาภายในวันที่รับของ พร้อมรูปถ่ายและเลขออร์เดอร์
              ร้านทำใหม่ให้ในรอบถัดไป หรือคืนเงินตามรายการที่มีปัญหา ตามที่ลูกค้าเลือก
            </li>
            <li>
              <b>ร้านยกเลิกเอง</b> เช่น วัตถุดิบไม่พอหรือปิดร้านกะทันหัน: ร้านแจ้งทางไลน์และคืนเงินเต็มจำนวน
            </li>
            <li>
              ร้านคืนเงินผ่านช่องทางที่ชำระมา หรือโอนเข้าพร้อมเพย์/บัญชีที่ลูกค้าแจ้งทางไลน์ ภายใน 7 วันนับจากวันที่ร้านยืนยันการคืนเงิน
            </li>
            <li>ออร์เดอร์ที่ยกเลิก แต้มที่ได้จากออร์เดอร์นั้นจะถูกหักออก และแต้มที่ใช้แลกจะคืนเข้าบัตร</li>
          </ul>
        </section>

        <section className="shop-section" aria-labelledby="storage">
          <h2 id="storage">การเก็บรักษาและคำเตือน</h2>
          <ul>
            <li>เก็บในตู้เย็น 0-4°C ทันทีที่ได้รับ</li>
            <li>ซาชิมิแซลมอนและกุ้งแช่น้ำปลา ควรทานภายในวันที่รับ · แซลมอนดองและกุ้งดอง ควรทานภายใน 2 วัน</li>
            <li>เป็นอาหารดิบ ไม่เหมาะกับหญิงตั้งครรภ์ เด็กเล็ก ผู้มีภูมิคุ้มกันต่ำ และผู้แพ้อาหารทะเล</li>
            <li>มีส่วนผสมของปลา กุ้ง ซีอิ๊ว (ถั่วเหลือง ข้าวสาลี) และอาจมีงา ถ้าแพ้อาหารอะไรแจ้งร้านทางไลน์ก่อนสั่ง</li>
          </ul>
        </section>

        <section className="shop-section" aria-labelledby="points">
          <h2 id="points">แต้มสะสม</h2>
          <ul>
            <li>ทุกกล่องได้แต้ม (ส่วนใหญ่ 1 กล่อง = 1 แต้ม เมนูที่ได้มากกว่ามีป้ายบอกในหน้าสั่งอาหาร)</li>
            <li>ครบ 10 แต้ม แลกฟรีได้ 1 กล่อง ในออร์เดอร์ถัดไป ยกเว้นเซ็ตรวม</li>
            <li>แต้มผูกกับบัญชีไลน์ของลูกค้า ใช้ได้ทุกสาขา ไม่มีวันหมดอายุระหว่างที่ร้านยังเปิด และแลกเป็นเงินสดไม่ได้</li>
          </ul>
        </section>

        <section className="shop-section" aria-labelledby="privacy">
          <h2 id="privacy">นโยบายความเป็นส่วนตัว</h2>
          <p>ร้านเก็บข้อมูลเท่าที่จำเป็นต่อการทำและส่งออร์เดอร์ ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562</p>
          <ul>
            <li>
              <b>ข้อมูลที่เก็บ</b>: ชื่อเล่นหรือชื่อที่แสดงในไลน์ รหัสบัญชีไลน์ (ใช้ผูกแต้ม ร้านไม่เห็นเบอร์โทรหรืออีเมลในไลน์ของลูกค้า)
              รายการที่สั่ง ยอดเงิน และแต้ม
              {delivery.length > 0 && " · สาขาส่งถึงที่เก็บที่อยู่ เบอร์โทร และตำแหน่งที่ลูกค้าเลือกปักหมุดเพิ่ม"}
            </li>
            <li>
              <b>ใช้เพื่อ</b>: เตรียมและส่งออร์เดอร์ ติดต่อลูกค้าเรื่องออร์เดอร์ นับแต้ม และสรุปยอดขายของร้าน ไม่ใช้ส่งโฆษณาถ้าลูกค้าไม่ได้ขอ
            </li>
            <li>
              <b>ไม่ขายหรือส่งต่อข้อมูล</b> ให้ผู้อื่น ยกเว้นผู้ให้บริการที่ระบบต้องใช้ ได้แก่ LINE ระบบรับชำระเงิน และฐานข้อมูลบนคลาวด์ที่เก็บออร์เดอร์
            </li>
            <li>ร้านไม่เก็บข้อมูลบัญชีธนาคารหรือบัตรของลูกค้า</li>
            <li>
              มือถือของลูกค้าจำชื่อเล่น รหัสบัตรลูกค้า{delivery.length > 0 && " ที่อยู่และเบอร์โทร"} ไว้ในเครื่อง ครั้งหน้าจะได้ไม่ต้องกรอกใหม่
              ลบได้โดยล้างข้อมูลเว็บไซต์ในเบราว์เซอร์
            </li>
            <li>ขอดู แก้ไข หรือลบข้อมูลของตัวเองได้ทุกเมื่อ ทางไลน์ของสาขาที่สั่ง</li>
          </ul>
        </section>

        {branches.length > 0 && (
          <nav className="shop-section shop-order-links" aria-label="สั่งอาหาร">
            <h2>สั่งอาหาร</h2>
            {branches.map((b) => (
              <a key={b.slug} className="shop-btn is-ghost" href={`/shop/${b.slug}`}>
                สาขา{b.name}
              </a>
            ))}
          </nav>
        )}
      </div>
    </main>
  );
}
