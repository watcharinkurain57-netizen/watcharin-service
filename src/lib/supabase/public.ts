import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * ตัวอ่านข้อมูลสาธารณะ — ไม่แตะคุกกี้ ไม่มี session
 *
 * ทำไมต้องแยกจาก server.ts:
 * ตัวใน server.ts เรียก cookies() ซึ่งทำให้ Next ถือว่าหน้านั้นเป็น dynamic
 * ต้องเรนเดอร์ใหม่ทุก request หน้าคลังที่ทุกคนเห็นเหมือนกันจึงเสีย prerender
 * ไปโดยไม่ได้อะไรกลับมา เพราะยังไม่มีอะไรขึ้นกับว่าใครเปิด
 *
 * ใช้ตัวนี้กับข้อมูลที่ทุกคนเห็นเหมือนกัน (คลังโปรเจกต์ หน้ารายละเอียด)
 * ส่วนของที่ขึ้นกับว่าใครล็อกอินอยู่ ค่อยใช้ server.ts
 */
let client: SupabaseClient | undefined;
export function getSupabasePublicClient() {
  if (!client) {
    const { url, publishableKey } = getSupabaseEnv();
    client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
