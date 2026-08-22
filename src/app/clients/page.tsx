import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClientsManager } from "@/components/archive/ClientsManager";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ลูกค้า",
  robots: { index: false, follow: false },
};

/** ผลลัพธ์ขึ้นกับว่าใครเปิด เรนเดอร์ล่วงหน้าไม่ได้ และไม่ควรให้ Google เก็บ index */
export const dynamic = "force-dynamic";

/**
 * หน้าจัดลูกค้า — ของฝั่งเราล้วน
 *
 * เช็คสิทธิ์ซ้ำที่ฝั่งเซิร์ฟเวอร์เพื่อไม่ให้หน้าโผล่มาแล้วค่อยฟ้องตอนกดบันทึก
 * ตัวที่กันจริงคือ policy is_app_admin() ใน 0022 ตรงนี้แค่ทำให้ไม่งง
 */
export default async function ClientsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/clients");

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
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <Link href="/projects/mine" className="text-[0.9rem] font-semibold text-brand-400 hover:underline">
        ← โปรเจกต์ของฉัน
      </Link>

      {/* คำอธิบายเหลือบรรทัดเดียว — สามย่อหน้าซ้อนกันก่อนถึงเนื้อหาทำให้หน้าดูหนัก
          ทั้งที่คนที่เข้ามาซ้ำรู้อยู่แล้วว่าหน้านี้คืออะไร */}
      <h1 className="mt-4 text-3xl font-black tracking-tight">ลูกค้า</h1>
      <p className="mt-2 max-w-[62ch] text-[0.92rem] text-ink-muted">
        จัดกลุ่มโปรเจกต์ตามคนที่จ้าง · เป็นข้อมูลภายในล้วน ลูกค้าไม่เห็นและไม่ขึ้นในคลังสาธารณะ ·
        ไม่กระทบสิทธิ์ที่มีอยู่
      </p>

      <div className="mt-7">
        <ClientsManager />
      </div>
    </div>
  );
}
