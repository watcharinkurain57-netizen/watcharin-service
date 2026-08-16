"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * ปุ่มขวาบนของคลังโปรเจกต์ — เปลี่ยนตามว่าใครเปิด
 *
 * เจ้าของเว็บ  → เพิ่มโปรเจกต์  (เพราะเข้ามาที่นี่เพื่อจัดการงานของตัวเอง)
 * คนอื่น       → เล่าโปรเจกต์ให้ฟัง (เพราะเข้ามาดูผลงานแล้วอยากคุยงาน)
 *
 * ปุ่มนี้แค่เปลี่ยนหน้าตา ตัวที่กันสิทธิ์จริงคือ RLS ของตาราง projects
 */
export function ArchiveNavCta() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setIsAdmin(false);
        return;
      }

      const { data } = await supabase
        .from("app_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (alive) setIsAdmin(!!data);
    })();

    return () => {
      alive = false;
    };
  }, [pathname]);

  // กันปุ่มสลับหน้าตาให้เห็นตอนโหลดครั้งแรก
  if (isAdmin === null) return <span className="h-9 w-32" aria-hidden="true" />;

  if (isAdmin) {
    return (
      <Link
        href="/projects/new"
        className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-brand-950 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
      >
        ＋ เพิ่มโปรเจกต์
      </Link>
    );
  }

  return (
    <Link
      href="/#talk"
      className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
    >
      เล่าโปรเจกต์ให้ฟัง
    </Link>
  );
}
