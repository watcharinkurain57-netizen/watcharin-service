import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
