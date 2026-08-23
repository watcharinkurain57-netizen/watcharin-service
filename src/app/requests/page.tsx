import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RequestsAdmin } from "@/components/archive/RequestsAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "คำขอเริ่มโปรเจกต์",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * กล่องคำขอ — ของเจ้าของเว็บ
 *
 * เช็คสิทธิ์ซ้ำที่ฝั่งเซิร์ฟเวอร์เพื่อไม่ให้หน้าโผล่มาแล้วค่อยฟ้อง
 * ตัวที่กันจริงคือ policy ใน 0023 (คนขออ่านได้เฉพาะใบของตัวเอง)
 */
export default async function RequestsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/requests");

  const { data: admin } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
        <h1 className="text-2xl font-bold">หน้านี้สำหรับเจ้าของเว็บเท่านั้น</h1>
        <p className="mt-2 text-ink-muted">
          ถ้าคุณเคยส่งคำขอไว้ ดูสถานะได้ที่{" "}
          <Link href="/start" className="font-semibold text-brand-400 hover:underline">
            หน้าเล่าโปรเจกต์
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <Link href="/projects/mine" className="text-[0.9rem] font-semibold text-brand-400 hover:underline">
        ← โปรเจกต์ของฉัน
      </Link>

      <h1 className="mt-4 text-3xl font-black tracking-tight">คำขอเริ่มโปรเจกต์</h1>
      <p className="mt-2 max-w-[58ch] text-[0.92rem] text-ink-muted">
        คนที่กด “เล่าโปรเจกต์ให้ฟัง” บนหน้าแรกจะมาโผล่ที่นี่ · ตกลงรับงานแล้วค่อยไปสร้างโปรเจกต์จริง
        แล้วส่งลิงก์เชิญให้เขาเข้ามา
      </p>

      <div className="mt-8">
        <RequestsAdmin />
      </div>
    </div>
  );
}
