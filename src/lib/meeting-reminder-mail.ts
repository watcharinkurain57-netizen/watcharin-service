/**
 * เนื้ออีเมลเตือนประชุม — แยกจาก route เพื่อให้ทดสอบได้โดยไม่ต้องมี Resend
 *
 * ⚠️ ที่นี่ทำงานบนเซิร์ฟเวอร์ซึ่งตั้งเวลาเป็น UTC ไม่ใช่เครื่องผู้อ่าน
 * จะใช้ getHours() ตรง ๆ แบบฝั่งเบราว์เซอร์ไม่ได้ เวลาจะเพี้ยนไป 7 ชั่วโมง
 *
 * ไทยเป็น UTC+7 คงที่ ไม่มีเวลาออมแสง จึงบวกเองได้ตรง ๆ
 * แม่นกว่าและอ่านง่ายกว่าการพึ่ง Intl ที่ภาษาไทยให้ปี พ.ศ. มาโดยไม่ได้ขอ
 */

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** เวลาไทยแบบอ่านออก เช่น "20 ส.ค. 14:00 น." */
export function bangkokTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + BANGKOK_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  // ใช้ getUTC* เพราะบวก offset เข้าไปแล้ว การอ่านแบบ UTC จึงได้เวลาไทย
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} น.`;
}

export type ReminderMeeting = {
  title: string;
  starts_at: string;
  minutes: number;
  meet_url: string | null;
  note: string | null;
  remind_minutes: number;
};

export function reminderSubject(m: ReminderMeeting, projectName: string): string {
  return `อีก ${minutesLabel(m.remind_minutes)} ประชุม “${m.title}” · ${projectName}`;
}

export function minutesLabel(mins: number): string {
  if (mins < 60) return `${mins} นาที`;
  if (mins < 1440) {
    const h = Math.round(mins / 60);
    return `${h} ชั่วโมง`;
  }
  return `${Math.round(mins / 1440)} วัน`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * ตัวอีเมล — เขียน HTML ตรง ๆ ไม่ใช้ตัวจัดวางอะไร
 * เพราะโปรแกรมอ่านอีเมลรองรับ CSS ได้ไม่เท่ากัน inline style ปลอดภัยที่สุด
 */
export function reminderHtml(m: ReminderMeeting, projectName: string, projectUrl: string): string {
  const when = bangkokTime(m.starts_at);
  const rows: string[] = [
    `<p style="margin:0 0 6px"><strong>เมื่อ</strong> ${escapeHtml(when)} (ยาว ${m.minutes} นาที)</p>`,
  ];
  if (m.note) rows.push(`<p style="margin:0 0 6px"><strong>หัวข้อ</strong> ${escapeHtml(m.note)}</p>`);

  const button = m.meet_url
    ? `<p style="margin:18px 0"><a href="${escapeHtml(m.meet_url)}" style="background:#0B8F72;color:#fff;padding:11px 20px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block">เข้าห้องประชุม</a></p>`
    : `<p style="margin:18px 0;color:#b45309">ยังไม่ได้ใส่ลิงก์ห้องประชุม — เปิดในเว็บเพื่อใส่ก่อนถึงเวลา</p>`;

  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.7;color:#111;max-width:520px">
<p style="margin:0 0 4px;color:#666;font-size:13px">${escapeHtml(projectName)}</p>
<h2 style="margin:0 0 14px;font-size:19px">อีก ${minutesLabel(m.remind_minutes)} จะถึงเวลาประชุม</h2>
<p style="margin:0 0 10px;font-size:17px;font-weight:bold">${escapeHtml(m.title)}</p>
${rows.join("\n")}
${button}
<p style="margin:20px 0 0;font-size:13px;color:#666">ดูรายละเอียดทั้งหมดที่ <a href="${escapeHtml(projectUrl)}" style="color:#0B8F72">หน้าโปรเจกต์</a></p>
</div>`;
}

/** ตัวหนังสือล้วน เผื่อโปรแกรมอ่านอีเมลที่ไม่แสดง HTML */
export function reminderText(m: ReminderMeeting, projectName: string, projectUrl: string): string {
  return [
    `${projectName}`,
    `อีก ${minutesLabel(m.remind_minutes)} จะถึงเวลาประชุม`,
    ``,
    m.title,
    `เมื่อ ${bangkokTime(m.starts_at)} (ยาว ${m.minutes} นาที)`,
    m.note ? `หัวข้อ ${m.note}` : null,
    ``,
    m.meet_url ? `เข้าห้องประชุม: ${m.meet_url}` : `ยังไม่ได้ใส่ลิงก์ห้องประชุม`,
    `หน้าโปรเจกต์: ${projectUrl}`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
