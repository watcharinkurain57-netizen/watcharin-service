import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectForm } from "@/components/archive/ProjectForm";
import { fetchProject } from "@/lib/project-archive-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "แก้ไขโปรเจกต์",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export default async function EditProjectPage({ params }: Params) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${slug}/edit`);

  const project = await fetchProject(slug);
  if (!project) notFound();

  // เช็คสิทธิ์ที่ฝั่งเซิร์ฟเวอร์เพื่อไม่ให้ฟอร์มโผล่มาแล้วค่อยฟ้องตอนกดบันทึก
  // ตัวที่กันจริงยังเป็น RLS อยู่ดี
  const { data: member } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: admin } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (member?.role !== "owner" && !admin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-8">
        <h1 className="text-2xl font-bold">แก้โปรเจกต์นี้ไม่ได้</h1>
        <p className="mt-2 text-ink-muted">
          บัญชี {user.email} ไม่ได้เป็นเจ้าของโปรเจกต์นี้
        </p>
        <Link
          href={`/projects/${slug}`}
          className="mt-6 inline-block rounded-full bg-surface-overlay px-5 py-2.5 font-bold text-ink transition-colors hover:text-brand-400"
        >
          กลับไปหน้าโปรเจกต์
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-8">
      <Link
        href={`/projects/${slug}`}
        className="mb-3 inline-block text-sm font-bold text-brand-400 hover:underline"
      >
        ← กลับไปหน้าโปรเจกต์
      </Link>
      <h1 className="text-3xl font-black tracking-tight">แก้ไข {project.name}</h1>
      <p className="mt-2 text-ink-muted">
        บันทึกแล้วหน้าคลังกับหน้าแรกจะอัปเดตทันที ไม่ต้องรอรอบรีเฟรช
      </p>

      <div className="mt-8">
        <ProjectForm project={project} />
      </div>
    </div>
  );
}
