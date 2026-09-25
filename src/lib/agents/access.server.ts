import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { can, type Viewer, type ViewerRole } from "@/lib/archive-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * ด่านหน้าของทุกเส้น /api/agents/* — ใครเรียก เป็นอะไรในโปรเจกต์นี้ ใช้ผู้ช่วยได้ไหม
 *
 * คืน `db` ที่เป็น session ของคนเรียกกลับไปด้วย เส้นที่เรียกต้องใช้ตัวนี้ตัวเดียว
 * ทุกอย่างที่ผู้ช่วยอ่านหรือเขียนจึงผ่าน RLS ในนามของคนนั้นเสมอ
 */

export type AgentAccess =
  | { ok: true; db: SupabaseClient; userId: string; viewer: Viewer }
  | { ok: false; status: number; error: string };

export async function agentAccess(projectId: string): Promise<AgentAccess> {
  const db = await createSupabaseServerClient();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "ต้องเข้าสู่ระบบก่อน" };

  const { data: member } = await db
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  const viewer: Viewer = { role: (member?.role as ViewerRole) ?? "public" };
  if (!can(viewer, "project.agents.use")) {
    return { ok: false, status: 403, error: "บัญชีนี้ใช้ผู้ช่วย AI ในโปรเจกต์นี้ไม่ได้" };
  }

  return { ok: true, db, userId: user.id, viewer };
}

/** อ่านตัวเลขจาก env พร้อมกรอบ — ตั้งผิดรูปแบบก็ยังได้ค่าที่ปลอดภัย ไม่ใช่ NaN */
export function envNumber(name: string, fallback: number, min: number, max: number): number {
  const n = Number(process.env[name]?.trim());
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, n));
}
