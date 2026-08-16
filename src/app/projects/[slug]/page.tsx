import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditProjectLink } from "@/components/archive/EditProjectLink";
import { OwnerPanels } from "@/components/archive/OwnerPanels";
import { ProjectCover } from "@/components/archive/ProjectCover";
import { can, PUBLIC_VIEWER } from "@/lib/archive-access";
import { STATUS_LABEL, type ArchiveProject } from "@/lib/project-archive";
import { fetchProject, fetchProjects } from "@/lib/project-archive-repo";

type Params = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  const all = await fetchProjects();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProject(slug);
  if (!project) return { title: "ไม่พบโปรเจกต์" };

  return {
    title: project.name,
    description: project.tagline,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: `${project.name} — ${project.tagline}`,
      description: project.problem[0],
      type: "article",
    },
  };
}

const STATUS_STYLE: Record<ArchiveProject["status"], string> = {
  building: "bg-amber-400 text-amber-950",
  shipped: "bg-brand-400 text-brand-950",
  sunset: "bg-line-strong text-ink-muted",
};

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface-raised p-6">
      <h2 className="mb-3 text-base font-bold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const project = await fetchProject(slug);
  if (!project) notFound();

  // หน้านี้เรนเดอร์ล่วงหน้า ตอนสร้างยังไม่รู้ว่าใครจะเปิด จึงแสดงได้แค่ข้อมูลสาธารณะ
  // ตอนเพิ่มแผงของเจ้าของ ให้เปลี่ยนมาใช้ getViewer(project.id) จาก archive-access.server
  // แล้วยอมให้หน้านี้เป็น dynamic
  const showProgress =
    typeof project.progress === "number" && can(PUBLIC_VIEWER, "project.progress.view");

  return (
    <>
      {/* ---------- หัวเรื่อง ---------- */}
      <div className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0">
          <ProjectCover
            project={project}
            priority
            sizes="100vw"
            className="absolute inset-0 opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 to-surface/50" />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Link href="/projects" className="text-sm font-bold text-brand-400 hover:underline">
              ← กลับไปที่คลัง
            </Link>
            <EditProjectLink projectId={project.id} slug={project.slug} />
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[0.7rem] font-extrabold ${STATUS_STYLE[project.status]}`}
            >
              {STATUS_LABEL[project.status]}
            </span>
            {project.statusNote && (
              <span className="rounded bg-white/10 px-2 py-0.5 text-[0.7rem] font-bold text-ink-muted">
                {project.statusNote}
              </span>
            )}
            {project.tags.map((t) => (
              <span
                key={t}
                className="rounded bg-white/10 px-2 py-0.5 text-[0.7rem] font-bold text-ink"
              >
                {t}
              </span>
            ))}
          </div>

          <h1 className="text-3xl font-black leading-tight tracking-tighter text-balance sm:text-5xl">
            {project.name}
          </h1>
          <p className="mt-3 max-w-[58ch] text-ink-muted">{project.tagline}</p>
        </div>
      </div>

      {/* ---------- เนื้อหา ---------- */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-start">
          <div>
            <Panel title="โปรเจกต์นี้แก้ปัญหาอะไร">
              {project.problem.map((p) => (
                <p key={p} className="mb-3 text-ink-muted last:mb-0">
                  {p}
                </p>
              ))}
            </Panel>

            <Panel title="ทำอะไรไปแล้วบ้าง">
              <ul className="grid gap-2">
                {project.done.map((d) => (
                  <li
                    key={d}
                    className="flex items-start gap-3 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
                  >
                    <span className="mt-0.5 grid size-4 flex-none place-items-center rounded bg-brand-500 text-[0.6rem] font-black text-brand-950">
                      ✓
                    </span>
                    <span className="text-ink-muted">{d}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            {project.next && project.next.length > 0 && (
              <Panel title="ที่เหลือ">
                <ul className="grid gap-2">
                  {project.next.map((n) => (
                    <li
                      key={n}
                      className="flex items-start gap-3 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
                    >
                      <span className="mt-1 size-4 flex-none rounded border-2 border-line-strong" />
                      <span className="text-ink-muted">{n}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <div>
            <Panel title="ข้อมูลโปรเจกต์">
              <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
                <dt className="text-ink-faint">ประเภท</dt>
                <dd className="font-semibold">
                  {project.kind === "factory" ? "ระบบโรงงาน" : "ซอฟต์แวร์"}
                </dd>

                <dt className="text-ink-faint">ช่วงเวลา</dt>
                <dd className="font-semibold">
                  {project.startedAt}
                  {project.endedAt ? ` – ${project.endedAt}` : ""}
                </dd>

                <dt className="text-ink-faint">ทำร่วมกับ</dt>
                <dd className="font-semibold">
                  {project.collaborators === 0
                    ? "ทำคนเดียว"
                    : `${project.collaborators} คน`}
                </dd>

                <dt className="text-ink-faint">เทคโนโลยี</dt>
                <dd className="font-semibold">{project.tech.join(" · ")}</dd>
              </dl>
            </Panel>

            {showProgress && (
              <Panel title="ความคืบหน้า">
                <p className="text-3xl font-black tabular-nums tracking-tight">
                  {project.progress}%
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-overlay">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </Panel>
            )}

            {/*
              แผงของเจ้าของ (งานค้าง / การเงิน / ไฟล์ส่งมอบ / คนในโปรเจกต์)
              จะมาต่อตรงนี้เมื่อทำระบบล็อกอินแล้ว — ทุกแผงห่อด้วย can(viewer, "...")
              ไม่ใช่ isOwner เพื่อให้เพิ่มบทบาทที่สามได้โดยไม่ต้องแก้หน้านี้
              ตอนนี้ยังไม่ใส่ข้อมูลจริง เพราะทุกอย่างในหน้านี้ถูกส่งไปที่เบราว์เซอร์ผู้ชม
            */}

            <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-center">
              <h2 className="text-lg font-extrabold tracking-tight text-white">
                อยากได้แบบนี้บ้าง?
              </h2>
              <p className="mt-1 text-sm text-brand-100">
                เล่ามาว่าติดอะไรอยู่ เดี๋ยวช่วยดูให้ว่าควรเริ่มตรงไหน
              </p>
              <Link
                href="/#contact"
                className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-900 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
              >
                ทักมาคุยได้เลย
              </Link>
            </div>
          </div>
        </div>

        {/*
          แผงของคนในโปรเจกต์ — โหลดฝั่งเบราว์เซอร์ เพื่อให้หน้านี้ยังเรนเดอร์
          ล่วงหน้าเป็น static ได้ คนนอกจะไม่เห็นอะไรเลยเพราะ RLS ไม่คืนแถวให้
        */}
        <OwnerPanels projectId={project.id} />

        {/* ---------- แกลเลอรี ---------- */}
        {project.gallery && project.gallery.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-base font-bold tracking-tight">ภาพหน้าจอ</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {project.gallery.map((img) => (
                <div
                  key={img.src}
                  className="relative aspect-video overflow-hidden rounded-xl border border-line"
                >
                  <ProjectCover
                    project={{ ...project, cover: img }}
                    sizes="(max-width: 640px) 100vw, 45vw"
                    className="absolute inset-0"
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
