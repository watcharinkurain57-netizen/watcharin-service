"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * ปุ่มเข้าสู่ระบบ / ชื่อผู้ใช้ ที่มุมขวาบน
 *
 * เช็ค session ฝั่งเบราว์เซอร์ ไม่ใช่ฝั่งเซิร์ฟเวอร์ เพื่อให้หน้าที่วางปุ่มนี้
 * ยังเรนเดอร์ล่วงหน้าเป็น static ได้ — ถ้าอ่านคุกกี้ฝั่งเซิร์ฟเวอร์
 * ทั้งหน้าจะกลายเป็น dynamic เพียงเพราะปุ่มเดียว
 */
export function AccountButton() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // กันปุ่มกระพริบสลับไปมาตอนโหลดครั้งแรก
  if (!ready) return <span className="h-9 w-24" aria-hidden="true" />;

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-line px-4 py-2 text-[0.88rem] font-bold text-ink-muted transition-colors hover:text-ink"
      >
        เข้าสู่ระบบ
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className="hidden max-w-[14ch] truncate text-[0.85rem] text-ink-muted sm:inline"
        title={email}
      >
        {email}
      </span>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-full border border-line px-3.5 py-2 text-[0.85rem] font-bold text-ink-muted transition-colors hover:text-ink"
        >
          ออกจากระบบ
        </button>
      </form>
    </div>
  );
}
