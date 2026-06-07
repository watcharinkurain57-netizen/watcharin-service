import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/resume-pdf";

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const buffer = await renderToBuffer(createElement(ResumeDocument));

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'inline; filename="Watcharin-Kurain-Resume.pdf"',
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
