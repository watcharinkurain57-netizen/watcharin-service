"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * ปุ่ม "เพิ่มโปรเจกต์" — โผล่เฉพาะเจ้าของเว็บ
 *
 * เช็คฝั่งเบราว์เซอร์เพื่อไม่ให้หน้าคลังกลายเป็น dynamic
 * ปุ่มนี้แค่ซ่อน/แสดง ตัวที่กันจริงคือ RLS ของตาราง projects
 */
export function AdminActions() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // RLS ปล่อยให้เห็นเฉพาะแถวของตัวเอง มีแถว = เป็นแอดมิน
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
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/projects/new"
      className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-brand-950 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
    >
      ＋ เพิ่มโปรเจกต์
    </Link>
  );
}
