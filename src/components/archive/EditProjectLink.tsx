"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * ปุ่มแก้ไข — โผล่เฉพาะเจ้าของโปรเจกต์นี้
 * เช็คฝั่งเบราว์เซอร์เพื่อให้หน้าโปรเจกต์ยังเรนเดอร์ล่วงหน้าเป็น static ได้
 */
export function EditProjectLink({ projectId, slug }: { projectId: string; slug: string }) {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (alive) setCanEdit(data?.role === "owner");
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  if (!canEdit) return null;

  return (
    <Link
      href={`/projects/${slug}/edit`}
      className="rounded-full border border-line-strong px-4 py-2 text-sm font-bold text-ink transition-colors hover:border-brand-500 hover:text-brand-400"
    >
      แก้ไขโปรเจกต์
    </Link>
  );
}
