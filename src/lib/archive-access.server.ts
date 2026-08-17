import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Viewer, ViewerRole } from "@/lib/archive-access";

/**
 * ดูว่าคนที่กำลังเปิดหน้าอยู่เป็นใครในโปรเจกต์นี้
 *
 * ⚠️ ฟังก์ชันนี้อ่านคุกกี้ หน้าไหนเรียกใช้จะกลายเป็น dynamic ทันที
 * เรนเดอร์ล่วงหน้าไม่ได้อีก ใช้เฉพาะกับส่วนที่ต้องรู้จริง ๆ ว่าใครเปิด
 * ส่วนหน้าที่ทุกคนเห็นเหมือนกัน ให้ใช้ PUBLIC_VIEWER แล้วปล่อยให้เป็น static
 *
 * รับ projectId เพราะคนคนเดียวกันเป็น client ในโปรเจกต์หนึ่ง
 * แต่เป็นคนนอกในอีกโปรเจกต์หนึ่งได้
 */
export async function getViewer(projectId?: string): Promise<Viewer> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !projectId) return { role: "public" };

  const { data } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  // ล็อกอินแล้วแต่ไม่ได้อยู่ในโปรเจกต์นี้ ก็ยังเป็นคนนอกอยู่ดี
  return { role: (data?.role as ViewerRole) ?? "public" };
}
