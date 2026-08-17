import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInvite } from "@/components/archive/AcceptInvite";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "คำเชิญเข้าโปรเจกต์",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

type Peek = {
  project_name: string | null;
  member_role: "owner" | "client" | null;
  valid: boolean;
  reason: string | null;
};

export default async function InvitePage({ params }: Params) {
  const { token } = await params;

  // เรียกด้วยตัวอ่านสาธารณะ เพราะคนกดลิงก์มาอาจยังไม่ได้ล็อกอิน
  // ฟังก์ชันเป็น security definer จึงอ่านคำเชิญได้ทั้งที่ตารางปิดอยู่
  const { data, error } = await supabasePublic.rpc("peek_project_invite", { p_token: token });
  const peek = (Array.isArray(data) ? data[0] : data) as Peek | undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bad = error || !peek || !peek.valid;

  return (
    <div className="theme-soft flex min-h-screen flex-col bg-surface text-ink">
      <main id="main-content" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-16">
        <Link href="/" className="mb-8 flex items-center gap-2 text-[1.05rem] font-extrabold tracking-tight">
          <span className="grid size-6.5 place-items-center rounded-lg bg-brand-600 text-[0.78rem] font-black text-white">
            W
          </span>
          watcharin-service
        </Link>

        {bad ? (
          <>
            <h1 className="text-2xl font-black tracking-tight">ใช้ลิงก์นี้ไม่ได้</h1>
            <p className="mt-2 text-ink-muted">
              {peek?.reason ?? error?.message ?? "ลิงก์เชิญไม่ถูกต้อง"}
            </p>
            <p className="mt-4 text-[0.92rem] text-ink-faint">
              ขอลิงก์ใหม่จากคนที่ส่งมาให้ได้เลย ลิงก์เชิญมีวันหมดอายุและจำนวนครั้งที่ใช้ได้
            </p>
            <Link href="/" className="mt-8 text-[0.92rem] font-semibold text-brand-700 hover:underline">
              ← กลับหน้าแรก
            </Link>
          </>
        ) : (
          <>
            <span className="mb-3 inline-block w-fit rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
              คำเชิญเข้าโปรเจกต์
            </span>

            <h1 className="text-3xl font-black leading-tight tracking-tight">{peek!.project_name}</h1>
            <p className="mt-2 text-ink-muted">
              คุณถูกเชิญเข้าร่วมในฐานะ{" "}
              <b className="font-bold text-ink">
                {peek!.member_role === "owner" ? "เจ้าของร่วม" : "คนในโปรเจกต์"}
              </b>
              {peek!.member_role === "owner"
                ? " — เห็นและแก้ได้ทุกอย่างรวมถึงเรื่องเงิน"
                : " — เห็นงาน ไฟล์ส่งมอบ และตารางงวดจ่ายของโปรเจกต์นี้"}
            </p>

            <div className="mt-8 rounded-3xl border border-line bg-surface-raised p-6 shadow-sm">
              <AcceptInvite token={token} signedIn={!!user} email={user?.email ?? null} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
