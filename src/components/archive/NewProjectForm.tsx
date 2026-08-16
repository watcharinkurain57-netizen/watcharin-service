"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revalidateArchive } from "@/app/projects/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** ช่องกรอกแบบหลายบรรทัด — บรรทัดละรายการ ใช้กับ problem / done / next_up */
function linesToArray(v: string): string[] {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function commasToArray(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const field =
  "w-full rounded-xl border border-line bg-surface-overlay px-3.5 py-2.5 text-[0.95rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500";
const label = "mb-1.5 block text-[0.85rem] font-semibold text-ink-muted";

export function NewProjectForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const supabase = createSupabaseBrowserClient();

    const { error: insertError } = await supabase.from("projects").insert({
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
    });

    if (insertError) {
      // 23505 = slug ซ้ำ · 42501 = RLS ไม่ให้เขียน
      setError(
        insertError.code === "23505"
          ? `มีโปรเจกต์ slug "${slug}" อยู่แล้ว`
          : insertError.code === "42501"
            ? "บัญชีนี้ไม่มีสิทธิ์สร้างโปรเจกต์ (ต้องอยู่ในตาราง app_admins)"
            : insertError.message
      );
      setBusy(false);
      return;
    }

    // หน้าคลังกับหน้าแรกเป็น static ที่ revalidate ทุก 5 นาที
    // ต้องสั่งล้างแคชฝั่งเซิร์ฟเวอร์ ไม่งั้นของใหม่ไม่โผล่จนกว่าจะครบรอบ
    await revalidateArchive();

    router.push(`/projects/${slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[0.92rem] text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="name">ชื่อโปรเจกต์</label>
          <input id="name" name="name" required className={field} placeholder="CoreSync" />
        </div>
        <div>
          <label className={label} htmlFor="slug">slug (ใช้ใน URL)</label>
          <input
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9\-]+"
            className={`${field} font-mono`}
            placeholder="coresync"
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="tagline">หนึ่งบรรทัดใต้ชื่อ</label>
        <input id="tagline" name="tagline" required className={field} placeholder="แดชบอร์ดติดตามสายการผลิตแบบเรียลไทม์" />
      </div>

      <div>
        <label className={label} htmlFor="problem">โปรเจกต์นี้แก้ปัญหาอะไร <span className="font-normal text-ink-faint">— ย่อหน้าละบรรทัด</span></label>
        <textarea id="problem" name="problem" rows={4} className={field} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="status">สถานะ</label>
          <select id="status" name="status" className={field} defaultValue="building">
            <option value="building">กำลังทำ</option>
            <option value="shipped">เสร็จแล้ว</option>
            <option value="sunset">ปิดแล้ว</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="kind">ประเภท</label>
          <select id="kind" name="kind" className={field} defaultValue="software">
            <option value="software">ซอฟต์แวร์</option>
            <option value="factory">ระบบโรงงาน</option>
          </select>
        </div>
        <div>
          <label className={label} htmlFor="progress">คืบหน้า % <span className="font-normal text-ink-faint">— เว้นว่างได้</span></label>
          <input id="progress" name="progress" type="number" min={0} max={100} className={field} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label className={label} htmlFor="started_label">เริ่มเมื่อ</label>
          <input id="started_label" name="started_label" required className={field} placeholder="ส.ค. 2026" />
        </div>
        <div>
          <label className={label} htmlFor="ended_label">จบเมื่อ <span className="font-normal text-ink-faint">— ถ้ามี</span></label>
          <input id="ended_label" name="ended_label" className={field} />
        </div>
        <div>
          <label className={label} htmlFor="collaborators">ทำร่วมกับกี่คน</label>
          <input id="collaborators" name="collaborators" type="number" min={0} defaultValue={0} className={field} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="tags">แท็ก <span className="font-normal text-ink-faint">— คั่นด้วย ,</span></label>
          <input id="tags" name="tags" className={field} placeholder="PLC, SCADA, MES" />
        </div>
        <div>
          <label className={label} htmlFor="tech">เทคโนโลยี <span className="font-normal text-ink-faint">— คั่นด้วย ,</span></label>
          <input id="tech" name="tech" className={field} placeholder="Next.js, Supabase" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="done">ทำอะไรไปแล้วบ้าง <span className="font-normal text-ink-faint">— บรรทัดละข้อ</span></label>
          <textarea id="done" name="done" rows={4} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="next_up">ที่เหลือ <span className="font-normal text-ink-faint">— บรรทัดละข้อ</span></label>
          <textarea id="next_up" name="next_up" rows={4} className={field} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="status_note">ขยายความสถานะ <span className="font-normal text-ink-faint">— เช่น ปิดบริการ ส.ค. 2026</span></label>
        <input id="status_note" name="status_note" className={field} />
      </div>

      <label className="flex items-center gap-3 text-[0.95rem]">
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
          {busy ? "กำลังบันทึก…" : "บันทึกโปรเจกต์"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/projects")}
          className="rounded-full bg-surface-overlay px-6 py-3 font-bold text-ink transition-colors hover:text-brand-400"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
