"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ล้างแคชของหน้าที่แสดงรายการโปรเจกต์ หลังเพิ่มหรือแก้โปรเจกต์
 *
 * ทำไมต้องมี: /projects กับ / เป็นหน้า static ที่ revalidate ทุก 5 นาที
 * สร้างโปรเจกต์เสร็จแล้วกลับไปหน้าคลังอาจยังไม่เห็นของใหม่จนกว่าจะครบรอบ
 * router.refresh() ล้างแค่ router cache ฝั่งเบราว์เซอร์ ไม่ได้แตะ cache ฝั่งเซิร์ฟเวอร์
 *
 * ต้องเช็คสิทธิ์ในนี้ด้วย เพราะ Server Action เปิดให้ใครยิงก็ได้
 * ถ้าไม่เช็ค ใครก็ยิงรัว ๆ ให้เว็บต้องเรนเดอร์ใหม่ทุกวินาทีได้
 */
export async function revalidateArchive(): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: admin } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!admin) return;

  revalidatePath("/projects");
  revalidatePath("/");
}
