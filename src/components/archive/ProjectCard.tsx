import Link from "next/link";
import { ProjectCover } from "./ProjectCover";
import { STATUS_LABEL, type ArchiveProject } from "@/lib/project-archive";

const STATUS_STYLE: Record<ArchiveProject["status"], string> = {
  building: "bg-amber-400 text-amber-950",
  shipped: "bg-brand-400 text-brand-950",
  sunset: "bg-line-strong text-ink-muted",
};

function collaboratorLabel(n: number) {
  return n === 0 ? "ทำคนเดียว" : `ทำร่วมกับ ${n} คน`;
}

type Props = {
  project: ArchiveProject;
  /** อัตราส่วนปก — แถวอันดับใช้แนวตั้งเหมือนโปสเตอร์ */
  portrait?: boolean;
  priority?: boolean;
};

export function ProjectCard({ project, portrait, priority }: Props) {
  const { slug, name, status, progress, collaborators, tagline } = project;

  return (
    <Link
      href={`/projects/${slug}`}
      className="group block rounded-xl outline-offset-4 transition-transform duration-300 ease-out hover:-translate-y-1.5 focus-visible:-translate-y-1.5 motion-reduce:transform-none"
    >
      <div
        className={`relative overflow-hidden rounded-xl border border-line shadow-lg shadow-black/40 transition-colors group-hover:border-brand-700 group-focus-visible:border-brand-700 ${
          portrait ? "aspect-3/4" : "aspect-video"
        }`}
      >
        <ProjectCover
          project={project}
          priority={priority}
          sizes={portrait ? "(max-width: 820px) 45vw, 12rem" : "(max-width: 820px) 60vw, 16rem"}
          className="absolute inset-0"
        />

        {/* ไล่เฉดทับด้านล่างเพื่อให้ชื่ออ่านออกไม่ว่ารูปจะสว่างแค่ไหน */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

        <span className="absolute left-2.5 top-2.5 z-10 flex flex-wrap gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[0.68rem] font-extrabold ${STATUS_STYLE[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </span>

        <span className="absolute inset-x-3 bottom-3 z-10 text-[1.02rem] font-extrabold leading-tight tracking-tight text-white drop-shadow-lg">
          {name}
        </span>

        {typeof progress === "number" && (
          <span className="absolute inset-x-0 bottom-0 z-10 block h-[3px] bg-black/40">
            <span
              className="block h-full bg-brand-400"
              style={{ width: `${progress}%` }}
              role="img"
              aria-label={`ความคืบหน้า ${progress}%`}
            />
          </span>
        )}
      </div>

      <div className="px-0.5 pt-2">
        <p className="truncate text-[0.78rem] text-ink-faint">{tagline}</p>
        <p className="mt-0.5 text-[0.78rem] text-ink-muted">
          {collaboratorLabel(collaborators)}
          {typeof progress === "number" && ` · คืบหน้า ${progress}%`}
        </p>
      </div>
    </Link>
  );
}
