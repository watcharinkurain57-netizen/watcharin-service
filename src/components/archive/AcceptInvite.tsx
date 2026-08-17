"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Result = { slug: string; project_name: string; already_member: boolean };

/**
 * ปุ่มกดเข้าร่วมโปรเจกต์
 *
 * การเพิ่มตัวเองเข้า project_members ทำตรง ๆ ไม่ได้ เพราะ RLS ให้เฉพาะเจ้าของเขียน
 * ต้องผ่าน redeem_project_invite ซึ่งเป็น security definer ที่ตรวจเงื่อนไขให้ครบ
 * ก่อนจะยอมเพิ่ม — ประตูแคบ ๆ ที่เราคุมได้ ดีกว่าเปิด policy ทั้งตาราง
 */
export function AcceptInvite({
  token,
  signedIn,
  email,
}: {
  token: string;
  signedIn: boolean;
  email: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <>
        <p className="mb-4 text-[0.95rem] text-ink-muted">
          เข้าสู่ระบบด้วย Google ก่อน แล้วระบบจะพากลับมาที่หน้านี้เพื่อเข้าร่วมต่อ
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
          className="block w-full rounded-full bg-brand-600 px-5 py-3.5 text-center font-bold text-white transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          เข้าสู่ระบบเพื่อเข้าร่วม
        </Link>
      </>
    );
  }

  async function accept() {
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { data, error: e } = await supabase.rpc("redeem_project_invite", { p_token: token });

    if (e) {
      setError(e.message);
      setBusy(false);
      return;
    }

    const r = (Array.isArray(data) ? data[0] : data) as Result | undefined;
    if (!r) {
      setError("เข้าร่วมไม่สำเร็จ ลองใหม่อีกครั้ง");
      setBusy(false);
      return;
    }

    router.push(`/projects/${r.slug}`);
    router.refresh();
  }

  return (
    <>
      <p className="mb-4 text-[0.95rem] text-ink-muted">
        เข้าระบบเป็น <b className="font-semibold text-ink">{email}</b>
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[0.9rem] text-red-800">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={accept}
        disabled={busy}
        className="w-full rounded-full bg-brand-600 px-5 py-3.5 font-bold text-white transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
      >
        {busy ? "กำลังเข้าร่วม…" : "เข้าร่วมโปรเจกต์"}
      </button>

      <p className="mt-3 text-center text-[0.82rem] text-ink-faint">
        ถ้าอยู่ในโปรเจกต์นี้อยู่แล้ว กดแล้วจะพาเข้าไปเลย ไม่ซ้ำซ้อน
      </p>
    </>
  );
}
