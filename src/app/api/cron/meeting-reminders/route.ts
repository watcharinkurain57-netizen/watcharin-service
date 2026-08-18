import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  reminderHtml,
  reminderSubject,
  reminderText,
  type ReminderMeeting,
} from "@/lib/meeting-reminder-mail";

/**
 * ส่งอีเมลเตือนก่อนถึงเวลาประชุม — ถูกเรียกจาก pg_cron ทุก 5 นาที
 * (ตัวตั้งเวลาอยู่ใน supabase/cron_meeting_reminders.sql ตั้งเฉพาะ prod)
 *
 * ⚠️ เส้นนี้ใช้ service key ซึ่งข้าม RLS ทั้งหมด จึงต้องกันด้วย CRON_SECRET
 * ถ้าไม่ได้ตั้ง CRON_SECRET เส้นนี้จะปฏิเสธทุกคำขอ ไม่ใช่เปิดให้ใครก็เรียกได้
 */

export const runtime = "nodejs";
/** ห้าม cache เด็ดขาด ผลลัพธ์ขึ้นกับเวลาปัจจุบันล้วน ๆ */
export const dynamic = "force-dynamic";

/** เพดานของ remind_minutes ใน 0017 คือ 7 วัน — ดึงมาไม่เกินนั้นก็พอ */
const MAX_LOOKAHEAD_MS = 7 * 24 * 60 * 60 * 1000;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://watcharin-service.com";

type Row = ReminderMeeting & {
  id: string;
  project_id: string;
};

/** เทียบแบบไม่รั่วเวลา — ป้องกันการเดาคีย์ทีละตัวอักษรจากเวลาที่ใช้ตอบ */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "ยังไม่ได้ตั้ง CRON_SECRET" }, { status: 503 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ") || !safeEqual(auth.slice(7), secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "ยังไม่ได้ตั้ง SUPABASE_SECRET_KEY" }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: "ยังไม่ได้ตั้ง RESEND_API_KEY" }, { status: 503 });
  }

  // service key ข้าม RLS — จำเป็นเพราะ cron ไม่ได้เป็นผู้ใช้คนไหน
  const db = createClient(url, serviceKey, { auth: { persistSession: false } });
  const resend = new Resend(process.env.RESEND_API_KEY);

  const now = Date.now();

  const { data, error } = await db
    .from("project_meetings")
    .select("id, project_id, title, starts_at, minutes, meet_url, note, remind_minutes")
    .is("reminded_at", null)
    .not("remind_minutes", "is", null)
    .gt("starts_at", new Date(now).toISOString())
    .lt("starts_at", new Date(now + MAX_LOOKAHEAD_MS).toISOString())
    .order("starts_at");

  if (error) return Response.json({ error: error.message }, { status: 500 });

  /**
   * กรองด้วย remind_minutes ของแต่ละนัดในโค้ด ไม่ใช่ใน query
   * เพราะ PostgREST เทียบ "คอลัมน์เวลา ลบ คอลัมน์จำนวนนาที" ไม่ได้
   * จำนวนแถวที่ดึงมาน้อยมากอยู่แล้ว (นัดใน 7 วันที่ยังไม่ได้เตือน)
   */
  const due = ((data ?? []) as Row[]).filter(
    (m) => new Date(m.starts_at).getTime() - now <= m.remind_minutes * 60_000
  );

  let sent = 0;
  const failed: string[] = [];

  for (const m of due) {
    /**
     * จองก่อนส่ง ไม่ใช่ส่งก่อนจอง
     *
     * ถ้า cron สองรอบทับกัน (รอบก่อนยังส่งไม่เสร็จ) การจองด้วย
     * `is('reminded_at', null)` จะมีแค่รอบเดียวที่ได้แถวไป อีกรอบได้ 0 แถวแล้วข้าม
     * ยอมเสี่ยง "ส่งไม่ออกแล้วไม่มีใครลองใหม่" ดีกว่า "ยิงอีเมลซ้ำสองรอบ"
     * เพราะอีเมลเตือนที่มาสองครั้งน่ารำคาญกว่าที่ไม่มา
     */
    const { data: claimed } = await db
      .from("project_meetings")
      .update({ reminded_at: new Date().toISOString() })
      .eq("id", m.id)
      .is("reminded_at", null)
      .select("id");

    if (!claimed || claimed.length === 0) continue;

    const [{ data: project }, { data: members }] = await Promise.all([
      db.from("projects").select("name, slug").eq("id", m.project_id).maybeSingle(),
      db
        .from("project_members")
        .select("profiles!inner(email)")
        .eq("project_id", m.project_id),
    ]);

    const emails = ((members ?? []) as unknown as { profiles: { email: string | null } }[])
      .map((r) => r.profiles?.email)
      .filter((e): e is string => !!e);

    if (emails.length === 0) continue;

    const projectName = project?.name ?? "โปรเจกต์";
    const projectUrl = `${SITE}/projects/${project?.slug ?? ""}`;

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "onboarding@resend.dev",
        // ส่งเป็น bcc ทั้งชุด คนรับจึงไม่เห็นอีเมลของกันและกัน
        // (ลูกค้าคนละเจ้าอาจอยู่โปรเจกต์เดียวกันในอนาคต)
        to: process.env.RESEND_FROM ?? "onboarding@resend.dev",
        bcc: emails,
        subject: reminderSubject(m, projectName),
        html: reminderHtml(m, projectName, projectUrl),
        text: reminderText(m, projectName, projectUrl),
      });
      sent += 1;
    } catch (e) {
      failed.push(`${m.id}: ${e instanceof Error ? e.message : "ส่งไม่สำเร็จ"}`);
    }
  }

  return Response.json({ checked: (data ?? []).length, due: due.length, sent, failed });
}
