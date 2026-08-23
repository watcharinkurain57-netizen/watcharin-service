import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StartProject } from "@/components/StartProject";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "เล่าโปรเจกต์ให้ฟัง",
  robots: { index: false, follow: false },
};

/** ผลลัพธ์ขึ้นกับว่าใครเปิด เรนเดอร์ล่วงหน้าไม่ได้ */
export const dynamic = "force-dynamic";

/**
 * หน้าเริ่มต้นคุยงาน — ล็อกอินแล้วเล่าโปรเจกต์
 *
 * ใช้ธีมเดียวกับหน้าแรก (theme-soft) เพราะคนมาถึงหน้านี้จากปุ่มบนหน้าแรก
 * ถ้าจู่ ๆ พื้นเปลี่ยนเป็นสีเข้มแบบคลังโปรเจกต์ จะรู้สึกเหมือนหลุดไปอีกเว็บ
 */
export default async function StartPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ยังไม่ล็อกอิน → ไปล็อกอินแล้วกลับมาที่นี่เอง
  // ไม่ใช่ให้กรอกก่อนแล้วค่อยเด้งไปล็อกอิน ซึ่งจะทำให้สิ่งที่พิมพ์ไว้หายหมด
  if (!user) redirect("/login?next=/start");

  return (
    <div className="theme-soft min-h-screen bg-surface text-ink">
      <HomeNav />

      <main id="main-content" className="mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <Link href="/" className="text-[0.9rem] font-semibold text-brand-700 hover:underline">
          ← กลับหน้าแรก
        </Link>

        <span className="mt-6 mb-4 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
          เริ่มคุยงาน
        </span>

        <h1 className="max-w-[18ch] text-[2.1rem] font-black leading-[1.1] tracking-tighter text-balance sm:text-4xl">
          เล่าโปรเจกต์<span className="text-brand-600">ให้ฟัง</span>
        </h1>

        <p className="mt-4 max-w-[48ch] text-[1.05rem] text-ink-muted">
          กรอกแค่สองช่อง เดี๋ยวผมเข้าไปอ่านแล้วทักกลับ รายละเอียดที่เหลือค่อยเติมตอนคุยกัน
          — เข้าระบบเป็น <span className="font-semibold text-ink">{user.email}</span>
        </p>

        <div className="mt-9">
          <StartProject />
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
