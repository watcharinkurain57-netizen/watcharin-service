import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ปลายทางที่ Supabase ส่งกลับมาหลังผู้ใช้ยืนยันตัวตนกับ Google
 *
 * ลำดับคือ เว็บเรา → Supabase → Google → Supabase → ที่นี่
 * ตรงนี้เอา code แลกเป็น session แล้วเขียนลงคุกกี้
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // กลับไปหน้าที่ผู้ใช้กดเข้าสู่ระบบ ไม่ใช่โยนกลับหน้าแรกเสมอ
  const next = searchParams.get("next") ?? "/";

  // ผู้ใช้กดยกเลิกที่หน้า Google หรือ Google ตอบ error กลับมา
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=ไม่พบรหัสยืนยันจากผู้ให้บริการ`);
  }

  const supabase = await createSupabaseServerClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  // กันเปิดช่องให้เว็บอื่นพาผู้ใช้ออกไป — รับเฉพาะพาธภายในเว็บเรา
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
