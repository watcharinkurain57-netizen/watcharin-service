import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ error?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error, next } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ล็อกอินอยู่แล้วก็ไม่ต้องเห็นหน้านี้
  if (user) redirect(next && next.startsWith("/") ? next : "/");

  return (
    <div className="theme-soft flex min-h-screen flex-col bg-surface text-ink">
      <main id="main-content" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <Link href="/" className="mb-8 flex items-center gap-2 text-[1.05rem] font-extrabold tracking-tight">
          <span className="grid size-6.5 place-items-center rounded-lg bg-brand-600 text-[0.78rem] font-black text-white">
            W
          </span>
          watcharin-service
        </Link>

        <h1 className="text-3xl font-black tracking-tight">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-ink-muted">
          เข้าเพื่อดูโปรเจกต์ของคุณ ความคืบหน้า ไฟล์ส่งมอบ และตารางงวดจ่าย
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.92rem] text-red-800"
          >
            เข้าสู่ระบบไม่สำเร็จ — {error}
          </p>
        )}

        <div className="mt-8 rounded-3xl border border-line bg-surface-raised p-6 shadow-sm">
          <GoogleSignInButton next={next} />
          <p className="mt-4 text-[0.85rem] text-ink-faint">
            ยังไม่ได้อยู่ในโปรเจกต์ไหน? เข้ามาแล้วจะยังไม่เห็นอะไรเพิ่ม
            ต้องให้เจ้าของส่งลิงก์เชิญมาก่อน
          </p>
        </div>

        <Link href="/" className="mt-8 text-[0.92rem] font-semibold text-brand-700 hover:underline">
          ← กลับหน้าแรก
        </Link>
      </main>
    </div>
  );
}
