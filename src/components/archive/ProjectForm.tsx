"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revalidateArchive } from "@/app/projects/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ArchiveProject } from "@/lib/project-archive";

/** ช่องกรอกหลายบรรทัด — บรรทัดละรายการ ใช้กับ problem / done / next_up */
function linesToArray(v: string): string[] {
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}

function commasToArray(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

const field =
  "w-full rounded-xl border border-line bg-surface-overlay px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";
const label = "mb-1.5 block text-[0.85rem] font-semibold text-ink-muted";

/**
 * ฟอร์มเดียวใช้ทั้งสร้างและแก้ไข
 *
 * แยกเป็นสองฟอร์มจะทำให้ฟิลด์สองที่ไม่ตรงกันเมื่อเพิ่มฟิลด์ใหม่
 * ซึ่งเป็นบั๊กที่หายากเพราะหน้าตายังดูปกติทุกอย่าง
 */
export function ProjectForm({ project }: { project?: ArchiveProject }) {
  const router = useRouter();
  const editing = !!project;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();

    const slug = get("slug");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("slug ใช้ได้แค่ a-z, 0-9 และขีดกลาง เพราะมันจะไปอยู่ใน URL");
      return;
    }

    setBusy(true);
    setError(null);

    const progressRaw = get("progress");
    const payload = {
      slug,
      name: get("name"),
      tagline: get("tagline"),
      problem: linesToArray(get("problem")),
      status: get("status"),
      status_note: get("status_note") || null,
      kind: get("kind"),
      tags: commasToArray(get("tags")),
      tech: commasToArray(get("tech")),
      started_label: get("started_label"),
      ended_label: get("ended_label") || null,
      collaborators: Number(get("collaborators") || 0),
      progress: progressRaw === "" ? null : Number(progressRaw),
      done: linesToArray(get("done")),
      next_up: linesToArray(get("next_up")),
      is_public: f.get("is_public") === "on",
    };

    const supabase = createSupabaseBrowserClient();
    const { error: dbError } = editing
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert(payload);

    if (dbError) {
      setError(
        dbError.code === "23505"
          ? `มีโปรเจกต์ slug "${slug}" อยู่แล้ว`
          : dbError.code === "42501"
            ? "บัญชีนี้ไม่มีสิทธิ์แก้โปรเจกต์นี้"
            : dbError.message
      );
      setBusy(false);
      return;
    }

    await revalidateArchive();
    router.push(`/projects/${slug}`);
    router.refresh();
  }

  async function onDelete() {
    if (!project) return;
    setBusy(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: delError } = await supabase.from("projects").delete().eq("id", project.id);

    if (delError) {
      setError(
        delError.code === "42501"
          ? "ลบได้เฉพาะเจ้าของเว็บ"
          : delError.message
      );
      setBusy(false);
      return;
    }

    await revalidateArchive();
    router.push("/projects");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="grid gap-5">
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[0.92rem] text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="name">ชื่อโปรเจกต์</label>
            <input id="name" name="name" required defaultValue={project?.name} className={field} placeholder="ชื่อโปรเจกต์ของคุณ" />
          </div>
          <div>
            <label className={label} htmlFor="slug">slug (ใช้ใน URL)</label>
            <input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9\-]+"
              defaultValue={project?.slug}
              className={`${field} font-mono`}
              placeholder="ตัวพิมพ์เล็ก คั่นคำด้วยขีด"
            />
            {editing && (
              <p className="mt-1.5 text-[0.8rem] text-ink-faint">
                เปลี่ยน slug แล้วลิงก์เดิมที่เคยส่งให้คนอื่นจะเข้าไม่ได้
              </p>
            )}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="tagline">หนึ่งบรรทัดใต้ชื่อ</label>
          <input id="tagline" name="tagline" required defaultValue={project?.tagline} className={field} />
        </div>

        <div>
          <label className={label} htmlFor="problem">โปรเจกต์นี้แก้ปัญหาอะไร <span className="font-normal text-ink-faint">— ย่อหน้าละบรรทัด</span></label>
          <textarea id="problem" name="problem" rows={4} defaultValue={project?.problem.join("\n")} className={field} />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="status">สถานะ</label>
            <select id="status" name="status" className={field} defaultValue={project?.status ?? "building"}>
              <option value="building">กำลังทำ</option>
              <option value="shipped">เสร็จแล้ว</option>
              <option value="sunset">ปิดแล้ว</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="kind">ประเภท</label>
            <select id="kind" name="kind" className={field} defaultValue={project?.kind ?? "software"}>
              <option value="software">ซอฟต์แวร์</option>
              <option value="factory">ระบบโรงงาน</option>
            </select>
          </div>
          <div>
            <label className={label} htmlFor="progress">คืบหน้า % <span className="font-normal text-ink-faint">— เว้นว่างได้</span></label>
            <input id="progress" name="progress" type="number" min={0} max={100} defaultValue={project?.progress} className={field} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={label} htmlFor="started_label">เริ่มเมื่อ</label>
            <input id="started_label" name="started_label" required defaultValue={project?.startedAt} className={field} placeholder="เดือน ปี ที่เริ่ม" />
          </div>
          <div>
            <label className={label} htmlFor="ended_label">จบเมื่อ <span className="font-normal text-ink-faint">— ถ้ามี</span></label>
            <input id="ended_label" name="ended_label" defaultValue={project?.endedAt} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="collaborators">ทำร่วมกับกี่คน</label>
            <input id="collaborators" name="collaborators" type="number" min={0} defaultValue={project?.collaborators ?? 0} className={field} />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="tags">แท็ก <span className="font-normal text-ink-faint">— คั่นด้วย ,</span></label>
            <input id="tags" name="tags" defaultValue={project?.tags.join(", ")} className={field} placeholder="หัวข้อที่เกี่ยวข้อง" />
          </div>
          <div>
            <label className={label} htmlFor="tech">เทคโนโลยี <span className="font-normal text-ink-faint">— คั่นด้วย ,</span></label>
            <input id="tech" name="tech" defaultValue={project?.tech.join(", ")} className={field} placeholder="เครื่องมือที่ใช้ทำ" />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="done">ทำอะไรไปแล้วบ้าง <span className="font-normal text-ink-faint">— บรรทัดละข้อ</span></label>
            <textarea id="done" name="done" rows={4} defaultValue={project?.done.join("\n")} className={field} />
          </div>
          <div>
            <label className={label} htmlFor="next_up">ที่เหลือ <span className="font-normal text-ink-faint">— บรรทัดละข้อ</span></label>
            <textarea id="next_up" name="next_up" rows={4} defaultValue={project?.next?.join("\n")} className={field} />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="status_note">ขยายความสถานะ <span className="font-normal text-ink-faint">— เช่น ปิดบริการ ส.ค. 2026</span></label>
          <input id="status_note" name="status_note" defaultValue={project?.statusNote} className={field} />
        </div>

        <label className="flex flex-wrap items-center gap-3 text-[0.95rem]">
          <input type="checkbox" name="is_public" defaultChecked className="size-4 accent-brand-500" />
          แสดงในคลังให้คนทั่วไปเห็น
          <span className="text-ink-faint">— ติ๊กออกถ้ายังไม่อยากให้ใครเห็น</span>
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-brand-500 px-6 py-3 font-bold text-brand-950 transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transform-none"
          >
            {busy ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "บันทึกโปรเจกต์"}
          </button>
          <button
            type="button"
            onClick={() => router.push(editing ? `/projects/${project.slug}` : "/projects")}
            className="rounded-full bg-surface-overlay px-6 py-3 font-bold text-ink transition-colors hover:text-brand-400"
          >
            ยกเลิก
          </button>
        </div>
      </form>

      {editing && (
        <div className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <h2 className="text-base font-bold">ลบโปรเจกต์นี้</h2>
          <p className="mt-1 max-w-[52ch] text-[0.92rem] text-ink-muted">
            ลบแล้วงาน งวดจ่าย และไฟล์ส่งมอบของโปรเจกต์นี้จะหายไปด้วยทั้งหมด กู้คืนไม่ได้
          </p>

          {confirmDelete ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[0.92rem] font-semibold">ยืนยันลบ “{project.name}” ?</span>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy}
                className="rounded-full bg-red-600 px-5 py-2.5 text-[0.9rem] font-bold text-white disabled:opacity-60"
              >
                ลบถาวร
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-full bg-surface-overlay px-5 py-2.5 text-[0.9rem] font-bold text-ink"
              >
                ไม่ลบ
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="mt-4 rounded-full border border-red-500/40 px-5 py-2.5 text-[0.9rem] font-bold text-red-300 transition-colors hover:bg-red-500/10"
            >
              ลบโปรเจกต์
            </button>
          )}
        </div>
      )}
    </>
  );
}
