import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  bangkokDate,
  bangkokHour,
  branchSlug,
  pickupLabel,
  readBranches,
  shopDb,
  type ShopBranch,
} from "@/lib/shop/shop.server";
import { enabledBanks, omiseEnabled, omiseTestKeyIgnored } from "@/lib/shop/omise";
import { buildCommunityPost, buildSummary, type SummaryRow } from "@/lib/shop/summary";

/**
 * สรุปออร์เดอร์ตอนปิดรับของแต่ละสาขา — pg_cron เรียกทุกชั่วโมง นาทีที่ 5 (supabase/cron_shop_summary.sql)
 * สาขาที่เวลาปิดรับ (cutoff_hour) ตรงกับชั่วโมงนี้ → สรุปออร์เดอร์ที่รับของพรุ่งนี้ของสาขานั้น
 * (ออร์เดอร์ของวัน P ปิดรับตอน cutoff ของวันก่อนหน้า P เสมอ ดู shop_branch_pickup ใน 0027)
 * ไม่มีคนสั่ง = ไม่ส่งอะไร
 *
 * ส่งผ่านไลน์ของสาขานั้น: SHOP_LINE_TOKEN_<SLUG> + SHOP_LINE_TO_<SLUG>
 *   SLUG ตัวใหญ่ ขีดเป็นขีดล่าง เช่น shinawatra3 → SHOP_LINE_TOKEN_SHINAWATRA3
 *   ไม่ตั้งของสาขา = ใช้ตัวกลาง SHOP_LINE_CHANNEL_TOKEN + SHOP_LINE_TO
 *   ผู้รับใส่ได้หลายคน คั่นด้วยจุลภาค · ผู้รับต้องแอดไลน์ของสาขานั้นเป็นเพื่อนก่อน ไม่งั้นไลน์ไม่ส่งให้
 * และ/หรืออีเมล (RESEND_API_KEY + RESEND_FROM + SHOP_SUMMARY_EMAIL)
 *
 * ทดสอบเองไม่ต้องรอเวลา: ?branch=<slug> (ส่งเลย) และ &date=YYYY-MM-DD (ไม่ใส่ = พรุ่งนี้)
 *
 * ⚠️ กันด้วย CRON_SECRET ตัวเดียวกับ meeting-reminders ไม่ตั้ง = ปฏิเสธทุกคำขอ
 *
 * ทดสอบไลน์ของทุกสาขา: ?test=1 [&branch=<slug>] ไม่ต้องใช้ CRON_SECRET · ไม่แตะออร์เดอร์
 *   เว็บ Preview (ต้องล็อกอิน Vercel ก่อนถึงจะเปิดได้): ส่งข้อความสั้นๆ ผ่านไลน์ของแต่ละสาขาถึงผู้รับสรุปจริง
 *   เว็บจริง (ใครก็เปิดได้): ไม่ส่งข้อความ แค่ถามไลน์ว่า token เป็นของไลน์สาขานั้น และผู้รับสรุปแอดไลน์นั้น
 *     เป็นเพื่อนแล้ว — ไม่กินโควตา ไม่โชว์ค่า token/ID · ไว้เช็กค่าฝั่ง Production ตอนเปิดร้าน
 *     บอกด้วยว่าเว็บจริงรับเงินแบบไหน (QR พร้อมเพย์ของร้าน หรือ Omise บัญชีจริง) โดยไม่โชว์คีย์
 *   ตอบเป็นภาษาไทยว่าสาขาไหนพร้อม/ไม่พร้อม เพราะอะไร
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** ค่าที่วางใน Vercel: ตัดช่องว่างหัวท้าย เครื่องหมายคำพูด และคำว่า Bearer ที่เผลอก๊อปมาด้วย */
function cleanToken(v: string | undefined): string {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
}

/** คีย์ไลน์ของสาขา — ไม่ตั้งแยก ใช้ตัวกลาง (สาขาแรกที่ตั้งไว้ก่อนมีระบบสาขา) */
function lineFor(slug: string) {
  const key = slug.toUpperCase().replace(/-/g, "_");
  const ownVar = `SHOP_LINE_TOKEN_${key}`;
  const own = cleanToken(process.env[ownVar]);
  const token = own || cleanToken(process.env.SHOP_LINE_CHANNEL_TOKEN);
  const to = (process.env[`SHOP_LINE_TO_${key}`] || process.env.SHOP_LINE_TO || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return { token, to, ownVar, tokenVar: own ? ownVar : token ? "SHOP_LINE_CHANNEL_TOKEN" : "" };
}

/** ผู้รับในไลน์: user ID (U…) กลุ่ม (C…) ห้อง (R…) ตามด้วย hex 32 ตัว — Channel ID (ตัวเลขล้วน) ใช้ไม่ได้ */
const LINE_TO = /^[UCR][0-9a-f]{32}$/i;

type Push = { ok: boolean; status: number; error: string };

async function pushLine(token: string, to: string[], texts: string[]): Promise<Push> {
  const many = to.length > 1;
  const res = await fetch(`https://api.line.me/v2/bot/message/${many ? "multicast" : "push"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ to: many ? to : to[0], messages: texts.map((text) => ({ type: "text", text })) }),
  });
  if (res.ok) return { ok: true, status: res.status, error: "" };
  // ไลน์บอกเหตุผลมาใน {"message": "..."} เช่น token ผิด / ผู้รับผิด / เกินโควตา
  const body = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, status: res.status, error: body?.message ?? "" };
}

type Result = { branch: string; orders: number; sent: string[]; failed: string[] };

async function summarize(db: SupabaseClient, b: ShopBranch, date: string): Promise<Result> {
  const result: Result = { branch: b.slug, orders: 0, sent: [], failed: [] };
  const { data, error } = await db
    .from("shop_orders")
    .select("order_no, nickname, pickup_slot, items, total, discount, payment_checked")
    .eq("branch_id", b.id)
    .eq("pickup_date", date)
    .neq("status", "cancelled")
    // ออร์เดอร์ที่สร้าง QR Omise แล้วไม่จ่าย ค้างเป็น pending — ไม่ต้องเตรียมของ
    .eq("payment_status", "paid")
    .order("pickup_slot")
    .order("order_no");
  if (error) {
    console.error("[shop] summary:", b.slug, error.message);
    result.failed.push("db");
    return result;
  }
  result.orders = data.length;
  if (!data.length) return result;

  const rows = data as SummaryRow[];
  const label = pickupLabel(date);
  const text = buildSummary(label, rows, b.name);

  const line = lineFor(b.slug);
  if (line.token && line.to.length) {
    const r = await pushLine(line.token, line.to, [
      text.slice(0, 4900),
      // ข้อความที่ 2: กดค้าง → ส่งต่อ → เลือก OpenChat ของสาขา
      buildCommunityPost(label, rows, b.line_id),
    ]);
    if (!r.ok) console.error("[shop] summary line:", b.slug, r.status, r.error);
    (r.ok ? result.sent : result.failed).push(`line:${r.status}`);
  }

  const mailTo = process.env.SHOP_SUMMARY_EMAIL?.trim();
  if (mailTo && process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    const { error: mailError } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: process.env.RESEND_FROM,
      to: mailTo,
      subject: `สรุปออร์เดอร์ สาขา${b.name} รับ${label}`,
      text,
    });
    (mailError ? result.failed : result.sent).push("email");
  }

  // มีออร์เดอร์แต่ไม่ได้ตั้งช่องทางส่งเลย — ให้ cron ขึ้นว่าล้มเหลว เจ้าของร้านจะได้รู้
  if (!result.sent.length && !result.failed.length) result.failed.push("no-channel");
  return result;
}

/** หน้าตาของค่าที่ใส่ไว้ โดยไม่โชว์ค่าจริง — token ตัวจริงยาวราว 170 ตัว */
function describeToken(v: string): string {
  if (/^[0-9a-f]{32}$/i.test(v)) return "ค่าที่ใส่ยาว 32 ตัว น่าจะเป็น Channel secret";
  if (/^\d+$/.test(v)) return `ค่าที่ใส่เป็นตัวเลข ${v.length} ตัว น่าจะเป็น Channel ID`;
  if (LINE_TO.test(v)) return "ค่าที่ใส่น่าจะเป็น user ID";
  if (/\s/.test(v)) return "ค่าที่ใส่มีช่องว่างหรือขึ้นบรรทัดปนอยู่ ให้วางใหม่ให้ติดกันบรรทัดเดียว";
  if (v.length >= 150) {
    return `ค่าที่ใส่ยาว ${v.length} ตัว หน้าตาเหมือน token แล้ว แต่อาจก๊อปมาไม่ครบหรือถูก Reissue ไปแล้ว ให้ก๊อปตัวล่าสุดมาใส่ใหม่`;
  }
  return `ค่าที่ใส่ยาว ${v.length} ตัว แต่ token ตัวจริงยาวราว 170 ตัว`;
}

/** token นี้เป็นของไลน์ร้านไหน (ไม่ใช่การส่งข้อความ ไม่กินโควตา) */
async function botInfo(token: string): Promise<{ status: number; ids: string[] }> {
  const res = await fetch("https://api.line.me/v2/bot/info", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { status: res.status, ids: [] };
  const j = (await res.json().catch(() => null)) as { basicId?: string; premiumId?: string } | null;
  return { status: res.status, ids: [j?.basicId, j?.premiumId].filter((x): x is string => !!x) };
}

/**
 * ผู้รับคนนี้แอดไลน์ของ token นี้เป็นเพื่อนแล้วหรือยัง: 200 = แอดแล้ว, 404 = ยังไม่แอด หรือ ID มาจาก provider อื่น
 * ไม่ใช่การส่งข้อความ ไม่กินโควตา · ไม่อ่านเนื้อหา (มีชื่อในไลน์ของผู้รับ)
 */
async function profileStatus(token: string, userId: string): Promise<number> {
  const res = await fetch(`https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await res.body?.cancel().catch(() => {});
  return res.status;
}

/**
 * ?test=1 — บอกผลทีละสาขาเป็นภาษาไทยให้เจ้าของร้านอ่านเอง
 * dry (เว็บจริง) = เช็กอย่างเดียว ไม่ส่งข้อความ · ไม่ dry (เว็บ Preview) = ส่งข้อความทดสอบจริง
 */
async function testLine(branches: ShopBranch[], all: ShopBranch[], dry: boolean): Promise<string> {
  const lines: string[] = [];
  for (const b of branches) lines.push(await testBranch(b, all, dry));
  if (dry) {
    // เว็บจริงไม่ได้ฝังเวลาสร้างเว็บไว้ (next.config.ts) → บอกให้ Redeploy หลังแก้แทน
    const out = [
      "เช็กไลน์ของเว็บจริง (ไม่ส่งข้อความ ไม่กินโควตา)",
      "อ่านค่าที่ตั้งไว้สำหรับ Production ใน Vercel",
      "",
      ...lines,
      "",
      paymentLine(),
    ];
    if (lines.some((l) => l.startsWith("❌"))) {
      out.push(
        "",
        "แก้ค่าในช่องที่ติ๊ก Production แล้วต้อง Redeploy เว็บจริงก่อน " +
          "(Vercel → Deployments → แถว Production บนสุด → ⋯ → Redeploy) แล้วค่อยเปิดหน้านี้ใหม่",
      );
    }
    return out.join("\n");
  }
  // ค่าใน Vercel ถูกอ่านตอนสร้างเว็บ แก้แล้วไม่ Redeploy = หน้านี้ยังเห็นค่าเก่า → บอกเวลาสร้างไว้ให้เทียบ
  const built = process.env.SHOP_BUILT_AT;
  // แถวที่ต้อง Redeploy ในหน้า Deployments ของ Vercel (มีชื่อ commit กำกับ)
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "";
  const when = built
    ? new Intl.DateTimeFormat("th-TH", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(built))
    : "";
  const out = [
    "ทดสอบส่งสรุปเข้าไลน์ (เว็บทดสอบ)",
    `อ่านค่าที่ตั้งไว้สำหรับ Preview ใน Vercel${when ? ` · เว็บนี้สร้างเมื่อ ${when} น.` : ""}`,
    "",
    ...lines,
  ];
  if (lines.some((l) => l.startsWith("❌"))) {
    out.push(
      "",
      "แก้ค่าแล้วยังขึ้นแบบเดิม เช็ก 2 อย่าง: แก้ช่องที่ติ๊ก Preview ไว้ (ไม่ใช่แค่ Production) และ Redeploy ตัว Preview หลังแก้ " +
        `(Vercel → Deployments → แถว Preview${commit ? ` ของ commit ${commit}` : ""} → ⋯ → Redeploy) ` +
        "โดยเวลา “สร้างเมื่อ” ด้านบนต้องหลังเวลาที่แก้",
    );
  }
  return out.join("\n");
}

/** เว็บจริงรับเงินแบบไหน — บรรทัดเดียว ไม่โชว์ค่าคีย์ (ลูกค้าเห็นแบบเดียวกันอยู่แล้วตอนจ่าย) */
function paymentLine(): string {
  const manual = "การจ่ายเงิน: QR พร้อมเพย์ของร้าน ลูกค้ากด “โอนแล้ว” เอง เจ้าของร้านเช็กยอดในแอปธนาคาร";
  if (omiseTestKeyIgnored()) {
    return `${manual} · ช่อง Production มีคีย์ทดสอบของ Omise (skey_test_…) เว็บจริงไม่ใช้คีย์นี้ ลบออกจากช่อง Production ได้`;
  }
  if (!omiseEnabled()) return `${manual} (ยังไม่ได้ใส่คีย์ Omise บัญชีจริง)`;
  const banks = enabledBanks();
  return (
    "การจ่ายเงิน: Omise บัญชีจริง เงินเข้าแล้วออร์เดอร์ยืนยันเอง · " +
    (banks.length ? `ปุ่มจ่ายผ่านแอปธนาคาร: ${banks.join(", ")}` : "ยังไม่เปิดปุ่มจ่ายผ่านแอปธนาคาร (ใส่ OMISE_BANKS)")
  );
}

/** ผลของสาขาเดียว หนึ่งบรรทัด ขึ้นต้นด้วย ✅ หรือ ❌ */
async function testBranch(b: ShopBranch, all: ShopBranch[], dry: boolean): Promise<string> {
  const head = `สาขา${b.name}${b.line_id ? ` (${b.line_id})` : ""}`;
  const line = lineFor(b.slug);
  if (!line.token) return `❌ ${head}: ยังไม่ได้ใส่ token ใน Vercel (${line.ownVar} หรือ SHOP_LINE_CHANNEL_TOKEN)`;
  if (!line.to.length) return `❌ ${head}: ยังไม่ได้ใส่ SHOP_LINE_TO ใน Vercel`;
  if (!line.to.every((t) => LINE_TO.test(t))) {
    const digits = line.to.some((t) => /^\d+$/.test(t));
    return (
      `❌ ${head}: SHOP_LINE_TO ไม่ใช่ user ID ต้องขึ้นต้นด้วย U ยาว 33 ตัว` +
      (digits ? " (ตอนนี้เป็นตัวเลขล้วน น่าจะเป็น Channel ID)" : "")
    );
  }
  // token ของสาขานี้เอง (หรือตัวกลางของสาขาแรก) — สาขาอื่นที่ยังไม่มีของตัวเองจะยืมตัวกลางไปก่อน
  const own = line.tokenVar === line.ownVar || b.id === all[0]?.id;
  const borrowed = own ? "" : ` (ยังไม่ได้ใส่ ${line.ownVar} เลยใช้ตัวนี้แทน)`;
  const badToken = `ไลน์ไม่รับ token (401) ${describeToken(line.token)} · แก้ที่ ${line.tokenVar}${borrowed}`;

  const info = await botInfo(line.token);
  if (info.status === 401) return `❌ ${head}: ${badToken}`;
  // token ต้องเป็นของไลน์สาขานี้ ไม่งั้นสรุปจะไปโผล่ผิดแชท
  const want = (b.line_id || "").toLowerCase();
  if (own && want && info.ids.length && !info.ids.some((id) => id.toLowerCase() === want)) {
    return (
      `❌ ${head}: ${line.tokenVar} เป็น token ของไลน์ ${info.ids[0]} ไม่ใช่ ${b.line_id} · ` +
      `ใน LINE Developers ให้เข้า channel ที่แท็บ Messaging API ขึ้น Bot basic ID ${b.line_id} ` +
      "แล้วก๊อป Channel access token จากหน้านั้นมาใส่แทน"
    );
  }

  if (dry) {
    // ถามไลน์ว่าผู้รับเป็นเพื่อนกับไลน์นี้ไหม แทนการส่งจริง — กลุ่ม/ห้อง (C…/R…) เช็กแบบนี้ไม่ได้ ข้ามไป
    const oa = info.ids[0] ?? "";
    for (const u of line.to.filter((t) => /^U/i.test(t))) {
      const s = await profileStatus(line.token, u);
      if (s === 401) return `❌ ${head}: ${badToken}`;
      if (s === 404) {
        return (
          `❌ ${head}: token ใช้ได้ แต่ผู้รับสรุปใน SHOP_LINE_TO ยังไม่ได้แอดไลน์ ${oa || "นี้"} เป็นเพื่อน ` +
          "(หรือเป็น user ID จาก provider อื่น) · ใช้บัญชีไลน์ที่จะรับสรุป แอดไลน์นี้เป็นเพื่อน แล้วเปิดหน้านี้ใหม่"
        );
      }
      if (s !== 200) return `❌ ${head}: ไลน์ตอบ ${s} ตอนเช็กผู้รับสรุป ลองเปิดหน้านี้ใหม่อีกครั้ง`;
    }
    const from = oa ? ` token เป็นของไลน์ ${oa}` : "";
    const via = own ? "" : ` · ยังไม่ได้ใส่ ${line.ownVar} สรุปจะมาทางไลน์ของสาขา${all[0]?.name}`;
    return `✅ ${head}: พร้อมส่ง${from} (ใช้ ${line.tokenVar}${via}) และผู้รับสรุปแอดไลน์นี้เป็นเพื่อนแล้ว`;
  }

  const r = await pushLine(line.token, line.to, [
    `✅ ทดสอบระบบส่งสรุป ${head} สำเร็จ\nสรุปออร์เดอร์ของสาขานี้ตอน ${b.cutoff_hour}:00 จะมาที่แชทนี้`,
  ]);
  if (r.status === 401) return `❌ ${head}: ${badToken}`;
  if (!r.ok) {
    const hint =
      r.status === 400 && /'to'/.test(r.error)
        ? " · เช็ก SHOP_LINE_TO ว่าเป็น Your user ID จาก provider เดียวกับไลน์ร้าน"
        : "";
    return `❌ ${head}: ไลน์ตอบ ${r.status} ${r.error}${hint}`.trim();
  }
  const from = info.ids[0] ? ` จากไลน์ ${info.ids[0]}` : "";
  const via = own ? "" : ` · ยังไม่ได้ใส่ ${line.ownVar} ข้อความจึงมาทางไลน์ของสาขา${all[0]?.name}`;
  return `✅ ${head}: ส่งแล้ว${from} (ใช้ ${line.tokenVar}${via}) ถ้าไม่เห็นข้อความ ให้แอดไลน์นี้เป็นเพื่อนก่อน`;
}

async function handle(req: Request) {
  const q = new URL(req.url).searchParams;
  // ?test=1 ให้เจ้าของร้านกดลิงก์เองได้ ไม่ต้องรู้ CRON_SECRET
  // เว็บ Preview เปิดได้เฉพาะคนที่ล็อกอิน Vercel → ส่งข้อความทดสอบจริง
  // เว็บจริงใครก็เปิดได้ → เช็กอย่างเดียว ไม่ส่งข้อความ (คนกดเล่นจะได้ไม่เผาโควตาข้อความของร้าน)
  const env = process.env.VERCEL_ENV;
  const testing = q.get("test") === "1" && (env === "preview" || env === "production");
  const dry = env === "production";
  if (!testing) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return Response.json({ error: "ยังไม่ได้ตั้ง CRON_SECRET" }, { status: 503 });
    const auth = req.headers.get("authorization") ?? "";
    if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), secret)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const db = shopDb();
  if (!db) return Response.json({ error: "ยังไม่ได้ตั้ง SUPABASE_SECRET_KEY" }, { status: 503 });

  const only = branchSlug(q.get("branch"));
  if (testing) {
    const all = await readBranches(db);
    const picked = only ? all.filter((b) => b.slug === only) : all;
    if (!picked.length) return Response.json({ error: "ไม่พบสาขานี้" }, { status: 404 });
    return new Response(await testLine(picked, all, dry), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const date = q.get("date")?.trim() ?? "";
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "date ต้องเป็น YYYY-MM-DD" }, { status: 400 });
  }

  const branches = await readBranches(db);
  const hour = bangkokHour();
  const due = only ? branches.filter((b) => b.slug === only) : branches.filter((b) => b.cutoff_hour === hour);
  if (only && !due.length) return Response.json({ error: "ไม่พบสาขานี้" }, { status: 404 });

  const pickup = date || bangkokDate(1);
  const results: Result[] = [];
  for (const b of due) results.push(await summarize(db, b, pickup));

  const failed = results.some((r) => r.failed.length);
  return Response.json({ date: pickup, hour, branches: results }, { status: failed ? 502 : 200 });
}

export const POST = handle;
export const GET = handle;
