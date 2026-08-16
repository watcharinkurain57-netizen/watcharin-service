import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * ต่ออายุ session ทุก request
 *
 * Server Component เขียนคุกกี้ไม่ได้ ถ้าไม่มี middleware ตัวนี้ token
 * จะหมดอายุแล้วผู้ใช้หลุดออกจากระบบเองโดยไม่มีสาเหตุ
 * — ต้องเรียก getUser() ด้วย ไม่ใช่แค่สร้าง client เพราะการต่ออายุเกิดตอนอ่าน user
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
