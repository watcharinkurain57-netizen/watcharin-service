import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/archive/ProjectCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ArchiveProject } from "@/lib/project-archive";

export const metadata: Metadata = {
  title: "โปรเจกต์ของฉัน",
  robots: { index: false, follow: false },
};

/**
 * หน้านี้ต่างจาก /projects ตรงที่ผลลัพธ์ขึ้นกับว่าใครเปิด
 * จึงต้องเป็น dynamic — เรนเดอร์ล่วงหน้าไม่ได้ และไม่ควรให้ Google เก็บ index
 */
export const dynamic = "force-dynamic";

type Row = {
  role: "owner" | "client";
  projects: {
    id: string;
    slug: string;
    name: string;
    tagline: string;
    status: ArchiveProject["status"];
    kind: ArchiveProject["kind"];
    collaborators: number;
    progress: number | null;
    cover: ArchiveProject["cover"] | null;
  };
};

/**
 * ไม่ติดป้าย "เจ้าของ" เพราะทุกโปรเจกต์ในเว็บนี้เจ้าของเว็บเป็นเจ้าของอยู่แล้ว
 * ป้ายที่ขึ้นทุกใบเหมือนกันหมดไม่ได้บอกอะไร มีแต่ทำให้รก
 * ติดเฉพาะตอนที่ไม่ใช่เจ้าของ ซึ่งจะเริ่มมีความหมายเมื่อลูกค้าเข้ามาอยู่ในโปรเจกต์
 */
const ROLE_LABEL: Partial<Record<Row["role"], string>> = {
  client: "คนในโปรเจกต์",
};

export default async function MyProjectsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/projects/mine");

  // RLS คืนเฉพาะแถวของตัวเองอยู่แล้ว แต่ใส่ eq ไว้ด้วยเพื่อให้อ่านโค้ดแล้วเข้าใจเจตนา
  const { data, error } = await supabase
    .from("project_members")
    .select(
      "role, projects!inner(id, slug, name, tagline, status, kind, collaborators, progress, cover)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`อ่านโปรเจกต์ของฉันไม่ได้: ${error.message}`);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
      <h1 className="text-3xl font-black tracking-tight">โปรเจกต์ของฉัน</h1>
      <p className="mt-2 text-ink-muted">
        เข้าระบบเป็น <span className="font-semibold text-ink">{user.email}</span> ·{" "}
        {rows.length} โปรเจกต์
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface-raised px-6 py-14 text-center">
          <p className="text-lg font-bold">ยังไม่ได้อยู่ในโปรเจกต์ไหน</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-ink-muted">
            ถ้ากำลังคุยงานกันอยู่ ให้เจ้าของส่งลิงก์เชิญมา กดลิงก์แล้วจะเข้ามาอยู่ในโปรเจกต์เอง
          </p>
          <Link
            href="/projects"
            className="mt-6 inline-block rounded-full bg-surface-overlay px-5 py-2.5 font-bold text-ink transition-colors hover:text-brand-400"
          >
            ดูคลังโปรเจกต์
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {rows.map(({ role, projects: p }) => (
            <div key={p.id}>
              <ProjectCard
                project={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  tagline: p.tagline,
                  status: p.status,
                  kind: p.kind,
                  collaborators: p.collaborators,
                  progress: p.progress ?? undefined,
                  cover: p.cover ?? undefined,
                  problem: [],
                  tags: [],
                  tech: [],
                  startedAt: "",
                  done: [],
                }}
              />
              {ROLE_LABEL[role] && (
                <p className="mt-1.5 px-0.5 text-[0.78rem] font-semibold text-brand-400">
                  {ROLE_LABEL[role]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
