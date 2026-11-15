import { Resend } from "resend";
import { createContactHandler, getContactConfig } from "@/lib/contact";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getContactConfig(process.env);
  return createContactHandler(config, async (email, options) => {
    const resend = new Resend(config!.apiKey);
    return resend.emails.send(email, options);
  })(request);
}
