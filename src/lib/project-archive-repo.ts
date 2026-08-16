import { supabasePublic } from "@/lib/supabase/public";
import type { ArchiveProject, ProjectImage } from "@/lib/project-archive";

/**
 * ดึงข้อมูลคลังโปรเจกต์จากตาราง projects
 *
 * ใช้ตัวอ่านสาธารณะที่ไม่แตะคุกกี้ หน้าคลังจึงยัง prerender ได้
 * อ่านได้เฉพาะแถวที่ RLS ยอม — คนทั่วไปเห็นเฉพาะ is_public = true
 */

/** หน้าตาแถวที่ Postgres ส่งกลับมา (snake_case) */
type ProjectRowDb = {
  slug: string;
  name: string;
  tagline: string;
  problem: string[] | null;
  status: ArchiveProject["status"];
  status_note: string | null;
  kind: ArchiveProject["kind"];
  tags: string[] | null;
  tech: string[] | null;
  started_label: string;
  ended_label: string | null;
  collaborators: number;
  progress: number | null;
  done: string[] | null;
  next_up: string[] | null;
  cover: ProjectImage | null;
  gallery: ProjectImage[] | null;
  featured: boolean;
  views: number;
};

const COLUMNS = `
  slug, name, tagline, problem, status, status_note, kind, tags, tech,
  started_label, ended_label, collaborators, progress, done, next_up,
  cover, gallery, featured, views
`;

function toProject(row: ProjectRowDb): ArchiveProject {
  return {
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    problem: row.problem ?? [],
    status: row.status,
    statusNote: row.status_note ?? undefined,
    kind: row.kind,
    tags: row.tags ?? [],
    tech: row.tech ?? [],
    startedAt: row.started_label,
    endedAt: row.ended_label ?? undefined,
    collaborators: row.collaborators,
    progress: row.progress ?? undefined,
    done: row.done ?? [],
    next: row.next_up ?? undefined,
    cover: row.cover ?? undefined,
    gallery: row.gallery ?? undefined,
    featured: row.featured,
    views: row.views,
  };
}

export async function fetchProjects(): Promise<ArchiveProject[]> {
  const { data, error } = await supabasePublic
    .from("projects")
    .select(COLUMNS)
    .order("views", { ascending: false });

  // อย่ากลืน error เงียบ ๆ — หน้าคลังว่างเปล่าโดยไม่รู้สาเหตุแย่กว่าพังดัง ๆ
  if (error) throw new Error(`อ่านคลังโปรเจกต์ไม่ได้: ${error.message}`);

  return (data as ProjectRowDb[]).map(toProject);
}

export async function fetchProject(slug: string): Promise<ArchiveProject | null> {
  const { data, error } = await supabasePublic
    .from("projects")
    .select(COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`อ่านโปรเจกต์ ${slug} ไม่ได้: ${error.message}`);

  return data ? toProject(data as ProjectRowDb) : null;
}
