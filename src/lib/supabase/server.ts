import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase สำหรับฝั่งเซิร์ฟเวอร์ (Server Component / Route Handler)
 *
 * ใช้ publishable key ตัวเดียวกับฝั่งเบราว์เซอร์ — ที่กันข้อมูลจริงคือ RLS
 * ไม่ใช่การซ่อนคีย์ เพราะฉะนั้นทุกตารางต้องเปิด RLS เสมอ
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component เขียนคุกกี้ไม่ได้ — ปกติ ไม่ใช่ error
          // การต่ออายุ session ทำใน src/proxy.ts แทน
        }
      },
    },
  });
}
