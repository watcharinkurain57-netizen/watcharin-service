"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { GoogleMark } from "./GoogleMark";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const target = next && next.startsWith("/") ? next : "/";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}`,
      },
    });

    // ถ้าสำเร็จเบราว์เซอร์จะเด้งไป Google แล้ว โค้ดข้างล่างจะไม่ทำงาน
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={signIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-line bg-surface-raised px-5 py-3.5 font-bold text-ink shadow-sm transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
      >
        <GoogleMark />
        {busy ? "กำลังพาไปที่ Google…" : "เข้าสู่ระบบด้วย Google"}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-[0.88rem] text-red-700">
          {error}
        </p>
      )}
    </>
  );
}
