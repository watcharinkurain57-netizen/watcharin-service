import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewProjectForm } from "@/components/archive/NewProjectForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "เพิ่มโปรเจกต์",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/projects/new");

  // เช็คซ้ำที่ฝั่งเซิร์ฟเวอร์เพื่อไม่ให้หน้าโผล่มาแล้วค่อยฟ้องตอนกดบันทึก
  // ตัวที่กันจริงยังเป็น RLS อยู่ดี ตรงนี้แค่ทำให้ประสบการณ์ใช้งานไม่งง
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
          บัญชี {user.email} ยังไม่ได้เป็นแอดมิน — เพิ่มเข้าตาราง app_admins ก่อน
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-black tracking-tight">เพิ่มโปรเจกต์</h1>
      <p className="mt-2 max-w-[52ch] text-ink-muted">
        บันทึกแล้วจะขึ้นในคลังทันที และคุณจะเป็นเจ้าของโปรเจกต์นั้นเอง
        รูปหน้าปกใส่ทีหลังได้ ยังไม่ใส่ก็ใช้พื้นไล่สีแทน
      </p>

      <div className="mt-8">
        <NewProjectForm />
      </div>
    </div>
  );
}
