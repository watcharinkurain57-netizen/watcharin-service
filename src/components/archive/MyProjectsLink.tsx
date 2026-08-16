"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * ลิงก์ "โปรเจกต์ของฉัน" — โผล่เฉพาะคนที่อยู่ในโปรเจกต์อย่างน้อยหนึ่งอัน
 *
 * เช็คฝั่งเบราว์เซอร์เพื่อไม่ให้หน้าคลังกลายเป็น dynamic
 * ถ้ายังไม่ล็อกอิน หรือล็อกอินแล้วแต่ไม่ได้อยู่ในโปรเจกต์ไหนเลย
 * ลิงก์นี้จะไม่ขึ้น เพราะกดเข้าไปก็เจอหน้าว่าง
 */
export function MyProjectsLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // RLS ปล่อยให้เห็นเฉพาะแถวของโปรเจกต์ที่ตัวเองอยู่ จึงนับตรง ๆ ได้เลย
      const { count: n } = await supabase
        .from("project_members")
        .select("project_id", { count: "exact", head: true });

      if (alive) setCount(n ?? 0);
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (count === 0) return null;

  return (
    <Link href="/projects/mine" className="transition-colors hover:text-ink">
      โปรเจกต์ของฉัน
      <span className="ml-1.5 rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[0.7rem] font-bold text-brand-400">
        {count}
      </span>
    </Link>
  );
}
