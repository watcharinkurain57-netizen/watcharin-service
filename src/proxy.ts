import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { siteFeatures } from "@/lib/site-config";
import { isWorkspacePath, workspaceDecision } from "@/lib/site-features";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * ต่ออายุ session ทุก request
 *
 * Server Component เขียนคุกกี้ไม่ได้ ถ้าไม่มีตัวนี้ token
 * จะหมดอายุแล้วผู้ใช้หลุดออกจากระบบเองโดยไม่มีสาเหตุ
 * — ต้องเรียก getUser() ด้วย ไม่ใช่แค่สร้าง client เพราะการต่ออายุเกิดตอนอ่าน user
 *
 * ไฟล์นี้เคยชื่อ middleware.ts — Next 16 เปลี่ยนชื่อ convention เป็น proxy
 * และเลิกรองรับ export ชื่อ `middleware` (ดู docs/upgrading/version-16)
 *
 * ⚠️ ผลข้างเคียงที่ไม่ใช่แค่เปลี่ยนชื่อ: proxy รันบน runtime `nodejs` เสมอ
 * ตั้งเป็น edge ไม่ได้ ต่างจาก middleware เดิมที่ Vercel รันบน edge ให้
 * โค้ดในนี้ใช้ได้ทั้งสอง runtime อยู่แล้ว (createServerClient เป็น fetch ล้วน)
 * แต่ถ้าวันหน้าจะย้ายอะไรเข้ามาในนี้ ให้รู้ไว้ว่ามันรันใกล้ผู้ใช้น้อยลงกว่าเดิม
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const decision = workspaceDecision(siteFeatures, pathname, request.method, request.headers.has("next-action"));
  if (decision.kind === "closed") {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  if (decision.kind === "redirect") {
    // Temporary: reopening the workspace must restore the original URLs.
    return NextResponse.redirect(new URL(decision.destination, request.url), 307);
  }
  // Public portfolio, static demos and contact delivery never need a session.
  if (!siteFeatures.workspace || !isWorkspacePath(pathname) || pathname.startsWith("/api/cron/")) {
    return NextResponse.next({ request });
  }
  let response = NextResponse.next({ request });

  const { url, publishableKey } = getSupabaseEnv();
  const supabase = createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * ข้ามไฟล์นิ่งกับรูป ไม่งั้นเสียเวลาต่ออายุ session ให้ทุกไฟล์ favicon
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)",
  ],
};
