import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/resume-pdf";

export const runtime = "nodejs";
// Render on every request so an updated résumé is always served fresh —
// this endpoint is low-traffic and the render is fast, so correctness wins
// over caching. (A static/long-cached response would show a stale résumé for
// up to 24h after an update.)
export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = await renderToBuffer(ResumeDocument({ lang: "en" }));

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition":
        'inline; filename="Watcharin-Kurain-Resume.pdf"',
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
