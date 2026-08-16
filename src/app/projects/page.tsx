import type { Metadata } from "next";
import Link from "next/link";
import { ProjectCard } from "@/components/archive/ProjectCard";
import { ProjectRail } from "@/components/archive/ProjectRail";
import { ProjectCover } from "@/components/archive/ProjectCover";
import {
  archiveProjects,
  buildRows,
  featuredProject,
  STATUS_LABEL,
} from "@/lib/project-archive";

export const metadata: Metadata = {
  title: "คลังโปรเจกต์",
  description:
    "งานที่เคยทำและกำลังทำอยู่ — ระบบโรงงาน เว็บ แอปมือถือ และบอทไลน์ เปิดดูรายละเอียดได้ทุกโปรเจกต์",
  alternates: { canonical: "/projects" },
};

export default function ProjectArchivePage() {
  const rows = buildRows();
  const hero = featuredProject();

  return (
    <>
      {/* ---------- แบนเนอร์ตัวเด่น ---------- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0">
          <ProjectCover
            project={hero}
            priority
            sizes="100vw"
            className="absolute inset-0 opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-surface/40" />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-4 py-14 sm:px-8 sm:py-20">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded bg-amber-400 px-2 py-0.5 text-[0.7rem] font-extrabold text-amber-950">
              {STATUS_LABEL[hero.status]}
            </span>
            {hero.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded bg-white/10 px-2 py-0.5 text-[0.7rem] font-bold text-ink"
              >
                {t}
              </span>
            ))}
          </div>

          <h1 className="max-w-[16ch] text-4xl font-black leading-[1.06] tracking-tighter text-balance sm:text-6xl">
            {hero.name}
          </h1>
          <p className="mt-4 max-w-[46ch] text-ink-muted">{hero.problem[0]}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/projects/${hero.slug}`}
              className="rounded-lg bg-brand-500 px-6 py-3 font-bold text-brand-950 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              เปิดดูโปรเจกต์
            </Link>
            <Link
              href="/#contact"
              className="rounded-lg bg-white/10 px-6 py-3 font-bold text-ink transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
            >
              อยากได้แบบนี้บ้าง
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- แถวโปรเจกต์ ---------- */}
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-8">
        {rows.map((row) => (
          <section key={row.id} className="mb-8">
            <h2 className="mb-3 flex flex-wrap items-center gap-2.5 text-lg font-bold tracking-tight">
              {row.title}
              {row.note && <span className="text-xs font-medium text-ink-faint">{row.note}</span>}
              <span className="text-xs font-medium text-ink-faint">
                {row.items.length} โปรเจกต์
              </span>
            </h2>

            <ProjectRail>
              {row.items.map((p, i) =>
                row.ranked ? (
                  <div key={p.slug} className="flex w-56 flex-none items-end sm:w-64">
                    <span
                      aria-hidden="true"
                      className="-mr-2 flex-none font-mono text-[5.5rem] font-black leading-[0.78] text-transparent [-webkit-text-stroke:2px_var(--color-line-strong)]"
                    >
                      {i + 1}
                    </span>
                    <div className="w-32 flex-none sm:w-40">
                      <ProjectCard project={p} portrait />
                    </div>
                  </div>
                ) : (
                  <div key={p.slug} className="w-56 flex-none sm:w-64">
                    <ProjectCard project={p} />
                  </div>
                )
              )}
            </ProjectRail>
          </section>
        ))}

        <p className="border-t border-line pt-6 text-sm text-ink-faint">
          ทั้งหมด {archiveProjects.length} โปรเจกต์ · อยากให้ช่วยทำอะไรสักอย่าง{" "}
          <Link href="/#contact" className="font-semibold text-brand-400 hover:underline">
            เล่ามาได้เลย
          </Link>
        </p>
      </div>
    </>
  );
}
