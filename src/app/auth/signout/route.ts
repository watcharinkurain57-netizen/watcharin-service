import { siteFeatures } from "@/lib/site-config";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** ออกจากระบบ — ใช้ POST เพื่อไม่ให้ตัวโหลดลิงก์ล่วงหน้าเผลอเตะผู้ใช้ออก */
export async function POST(request: NextRequest) {
  if (!siteFeatures.workspace) return new Response(null, { status: 404 });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
