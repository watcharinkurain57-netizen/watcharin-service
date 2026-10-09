import { contactTopic } from "./contact-topics.ts";

type ContactEnvironment = Record<string, string | undefined>;
export type ContactEmail = { from: string; to: string; replyTo: string; subject: string; text: string };
type ContactConfig = { apiKey: string; from: string; to: string };
type SendResult = { data: { id: string } | null; error: unknown };
type ContactSender = (email: ContactEmail, options?: { idempotencyKey: string }) => Promise<SendResult>;

const isEmail = (value: string) => /^[^\s@<>\u0000-\u001f\u007f]+@[^\s@<>\u0000-\u001f\u007f]+\.[^\s@<>\u0000-\u001f\u007f]+$/.test(value);
const singleLine = (value: string) => !/[\u0000-\u001f\u007f]/.test(value);

// A key alone does not make a usable form. Require an explicitly configured
// sender rather than Resend's restricted testing address.
export function getContactConfig(env: ContactEnvironment): ContactConfig | null {
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const from = env.RESEND_FROM?.trim() ?? "";
  const to = env.CONTACT_TO_EMAIL?.trim() || "watcharin@watcharin-service.com";
  return apiKey && singleLine(apiKey) && isEmail(from) && isEmail(to) ? { apiKey, from, to } : null;
}

function result(body: object, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Inject delivery to check failures and retries without real email/credentials.
export function createContactHandler(config: ContactConfig | null, send: ContactSender) {
  return async (request: Request) => {
    let body: unknown;
    try { body = await request.json(); }
    catch { return result({ error: "ข้อมูลไม่ถูกต้อง กรุณาลองใหม่" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return result({ error: "ข้อมูลไม่ถูกต้อง กรุณาลองใหม่" }, 400);
    }
    const input = body as Record<string, unknown>;
    if (typeof input.website === "string" && input.website.length > 0) return result({ ok: true });
    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim() : "";
    const message = typeof input.message === "string" ? input.message.trim() : "";
    const topicKey = input.topic ?? "";
    const topic = contactTopic(topicKey);
    const requestId = input.requestId;
    if (name.length < 2 || name.length > 80 || !singleLine(name)) {
      return result({ error: "กรุณากรอกชื่อ (2–80 ตัวอักษร)" }, 400);
    }
    if (!isEmail(email) || email.length > 120) {
      return result({ error: "กรุณากรอกอีเมลให้ถูกต้อง" }, 400);
    }
    if (message.length < 10 || message.length > 4000) {
      return result({ error: "กรุณากรอกข้อความ (10–4000 ตัวอักษร)" }, 400);
    }
    if (topicKey !== "" && !topic) return result({ error: "กรุณาเลือกประเภทงานใหม่" }, 400);
    if (requestId !== undefined && (typeof requestId !== "string" || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(requestId))) {
      return result({ error: "ข้อมูลคำขอไม่ถูกต้อง กรุณาโหลดหน้าใหม่" }, 400);
    }
    if (!config) return result({ error: "ขณะนี้ส่งผ่านแบบฟอร์มไม่ได้ กรุณาติดต่อทางอีเมล" }, 503);
    try {
      const { data, error } = await send({
        from: `Watcharin Service <${config.from}>`, to: config.to, replyTo: email,
        subject: `[Watcharin Service] ${topic ? `${topic.name} / ` : ""}${name}`,
        text: [`Name: ${name}`, `Email: ${email}`,
          ...(topic ? [`Topic: ${topic.name} — ${topic.detail}`] : []),
          "", "Message:", message, "", "Sent from watcharin-service.com contact form"].join("\n"),
      }, typeof requestId === "string" ? { idempotencyKey: `contact/${requestId}` } : undefined);
      // Acceptance is the success boundary; it does not prove inbox delivery.
      if (error || !data?.id) {
        console.error("Contact email was not accepted by the provider");
        return result({ error: "ยังยืนยันการส่งไม่ได้ กรุณาลองอีกครั้งหรือติดต่อทางอีเมล" }, 502);
      }
      return result({ ok: true });
    } catch {
      console.error("Contact delivery request failed");
      return result({ error: "ยังยืนยันการส่งไม่ได้ กรุณาลองอีกครั้งหรือติดต่อทางอีเมล" }, 502);
    }
  };
}
