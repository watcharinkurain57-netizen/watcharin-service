import { Resend } from "resend";

export const runtime = "nodejs";

const TO_EMAIL =
  process.env.CONTACT_TO_EMAIL ?? "watcharin@watcharin-service.com";
const FROM_EMAIL = process.env.RESEND_FROM ?? "onboarding@resend.dev";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  website?: unknown; // honeypot
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  if (!process.env.RESEND_API_KEY) {
    return Response.json(
      { error: "Contact form is not configured yet." },
      { status: 503 }
    );
  }

  let body: ContactPayload;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.website === "string" && body.website.length > 0) {
    return Response.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 2 || name.length > 80) {
    return Response.json({ error: "กรุณากรอกชื่อ (2–80 ตัวอักษร)" }, { status: 400 });
  }
  if (!isEmail(email) || email.length > 120) {
    return Response.json({ error: "กรุณากรอกอีเมลให้ถูกต้อง" }, { status: 400 });
  }
  if (message.length < 10 || message.length > 4000) {
    return Response.json(
      { error: "ข้อความสั้นหรือยาวเกินไป (10–4000 ตัวอักษร)" },
      { status: 400 }
    );
  }

  // NOTE: everything wrapped so we never crash uncaught (which Cloudflare masks
  // as a generic "error code: 502" page).
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const subject = `[watcharin-service.com] New inquiry from ${name}`;

    const { data, error } = await resend.emails.send({
      from: `Watcharin Service <${FROM_EMAIL}>`,
      to: TO_EMAIL,
      replyTo: email,
      subject,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        "Message:",
        message,
        "",
        "—",
        "Sent from watcharin-service.com contact form",
      ].join("\n"),
    });

    if (error) {
      console.error("Resend error:", error);
      // TEMP DIAGNOSTIC: 422 passes through Cloudflare (5xx is masked).
      return Response.json(
        {
          error: "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
          _diag: {
            stage: "resend-error",
            from: FROM_EMAIL,
            to: TO_EMAIL,
            name: error.name,
            message: error.message,
          },
        },
        { status: 422 }
      );
    }

    return Response.json({ ok: true, id: data?.id });
  } catch (err) {
    console.error("Contact handler exception:", err);
    // TEMP DIAGNOSTIC: 422 passes through Cloudflare (5xx is masked).
    return Response.json(
      {
        error: "เกิดข้อผิดพลาดภายในระบบ",
        _diag: {
          stage: "exception",
          from: FROM_EMAIL,
          to: TO_EMAIL,
          message: err instanceof Error ? err.message : String(err),
        },
      },
      { status: 422 }
    );
  }
}
