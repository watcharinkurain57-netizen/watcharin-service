"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { thaiDate, todayIso } from "@/lib/project-tasks";
import {
  FILES_BUCKET,
  FILE_SELECT,
  MAX_FILES_PER_BATCH,
  MAX_FILE_BYTES,
  SIGNED_URL_SECONDS,
  downloadName,
  dropEntries,
  expandEntries,
  fileErrorMessage,
  formatBytes,
  pickedName,
  storageKey,
  type PickedFile,
  type ProjectFile,
} from "@/lib/project-files";

/**
 * แท็บไฟล์ส่งมอบ
 *
 * คนในโปรเจกต์โหลดไฟล์ได้ เจ้าของอัป/ลบ/สลับสถานะได้
 * ตัวที่กันจริงคือ policy บน storage.objects กับ project_files ใน migration 0009
 * ปุ่มในนี้แค่ไม่เอาของที่กดไม่ได้มาให้เกะกะ
 */

/** ไฟล์ที่กำลังอัปอยู่ — ยังไม่มีแถวใน DB จึงยังไม่มี id */
type Pending = { key: string; name: string; size: number; error: string | null };

export function FilesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase
      .from("project_files")
      .select(FILE_SELECT)
      .eq("project_id", projectId)
      .order("sort");
    return { rows: (data ?? []) as ProjectFile[], error: e };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await load();
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setFiles(r.rows);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function reload() {
    const r = await load();
    if (r.error) setError(r.error.message);
    else setFiles(r.rows);
  }

  /**
   * อัปไฟล์ทีละตัว
   *
   * ลำดับสำคัญ: ขึ้น Storage ก่อน แล้วค่อยเขียนแถวใน DB
   * ถ้าเขียนแถวไม่สำเร็จต้องลบไฟล์ที่เพิ่งอัปทิ้ง ไม่งั้นจะเหลือไฟล์ลอย
   * ที่ไม่มีใครมองเห็นแต่ยังกินโควตา — และไม่มีทางไปตามลบทีหลังด้วย
   * เพราะหน้าเว็บรู้จักไฟล์ผ่านตาราง project_files เท่านั้น
   */
  async function uploadOne({ file, name }: PickedFile, sortFrom: number) {
    const key = `${name}-${file.size}-${crypto.randomUUID()}`;
    setPending((p) => [...p, { key, name, size: file.size, error: null }]);

    const fail = (msg: string) => setPending((p) => p.map((x) => (x.key === key ? { ...x, error: msg } : x)));
    const done = () => setPending((p) => p.filter((x) => x.key !== key));

    if (file.size > MAX_FILE_BYTES) {
      fail(`ใหญ่เกิน ${formatBytes(MAX_FILE_BYTES)}`);
      return false;
    }
    if (file.size === 0) {
      fail("ไฟล์ว่าง — ข้ามไป");
      return false;
    }

    const path = storageKey(projectId, name, crypto.randomUUID());

    const up = await supabase.storage.from(FILES_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (up.error) {
      fail(fileErrorMessage(up.error, "อัปโหลดไม่สำเร็จ"));
      return false;
    }

    const ins = await supabase.from("project_files").insert({
      project_id: projectId,
      // ชื่อที่คนอ่าน เก็บของจริงไว้ตรงนี้ ภาษาไทยได้เต็มที่
      // ถ้ามาจากการเลือกโฟลเดอร์จะมีเส้นทางติดมาด้วย เช่น ส่งมอบงวด3/คู่มือ.pdf
      // ส่วน path ใน Storage เป็น ascii ล้วนและแบนราบ (ดูเหตุผลใน lib/project-files.ts)
      name,
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
      status: "delivered",
      delivered_on: todayIso(),
      sort: sortFrom,
    });

    if (ins.error) {
      await supabase.storage.from(FILES_BUCKET).remove([path]);
      fail(fileErrorMessage(ins.error, "บันทึกรายการไฟล์ไม่สำเร็จ"));
      return false;
    }

    done();
    return true;
  }

  async function upload(picked: PickedFile[]) {
    if (picked.length === 0) return;
    setError(null);

    if (picked.length > MAX_FILES_PER_BATCH) {
      setError(`เลือกมา ${picked.length} ไฟล์ — อัปให้ครั้งละ ${MAX_FILES_PER_BATCH} ไฟล์ ที่เหลือลากมาเพิ่มได้`);
      picked = picked.slice(0, MAX_FILES_PER_BATCH);
    }

    const base = Math.max(0, ...(files ?? []).map((f) => f.sort)) + 1;
    let ok = 0;
    for (const [i, item] of picked.entries()) {
      if (await uploadOne(item, base + i)) ok += 1;
    }
    if (ok > 0) await reload();
  }

  /** จาก <input> — ทั้งแบบเลือกไฟล์และแบบเลือกโฟลเดอร์มาทางนี้เหมือนกัน */
  function uploadFromInput(list: FileList | null) {
    upload(Array.from(list ?? []).map((file) => ({ file, name: pickedName(file) })));
  }

  /**
   * จากการลากมาวาง — ต้องอ่าน entry ให้เสร็จก่อน await ตัวแรก
   * เพราะ DataTransfer ใช้ไม่ได้แล้วหลัง handler คืนค่า
   */
  async function uploadFromDrop(dt: DataTransfer) {
    const entries = dropEntries(dt);
    const plain = Array.from(dt.files ?? []);

    if (entries.length === 0) {
      upload(plain.map((file) => ({ file, name: file.name })));
      return;
    }

    const picked = await expandEntries(entries);
    if (picked.length === 0) {
      setError("โฟลเดอร์ที่ลากมาไม่มีไฟล์ข้างใน");
      return;
    }
    await upload(picked);
  }

  /**
   * bucket เป็น private จึงเปิดด้วย URL ตรง ๆ ไม่ได้ ต้องขอ signed URL ก่อน
   * ตัวออก signed URL เป็นคนไปเช็ค policy ให้ — คนนอกโปรเจกต์ขอมาก็ไม่ได้
   *
   * ใส่ download เป็นชื่อไทยของจริง เพื่อให้เบราว์เซอร์บันทึกด้วยชื่อนั้น
   * ทั้งที่ key ใน Storage เป็น ascii — คนใช้จึงไม่มีทางรู้เลยว่าเราแปลงชื่อ
   */
  async function download(f: ProjectFile) {
    if (!f.storage_path) return;
    setBusy(f.id);
    const { data, error: e } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(f.storage_path, SIGNED_URL_SECONDS, { download: downloadName(f.name) });
    setBusy(null);

    if (e || !data?.signedUrl) {
      setError(fileErrorMessage(e, "ขอลิงก์ดาวน์โหลดไม่สำเร็จ"));
      return;
    }

    // Content-Disposition ที่ signed URL ติดมาให้เป็น attachment อยู่แล้ว
    // เบราว์เซอร์จึงโหลดไฟล์ ไม่ใช่พาออกจากหน้านี้
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    a.click();
  }

  async function toggleStatus(f: ProjectFile) {
    const next = f.status === "delivered" ? "pending" : "delivered";
    setBusy(f.id);
    const { error: e } = await supabase
      .from("project_files")
      .update({ status: next, delivered_on: next === "delivered" ? (f.delivered_on ?? todayIso()) : null })
      .eq("id", f.id);
    setBusy(null);
    if (e) setError(fileErrorMessage(e, "เปลี่ยนสถานะไม่สำเร็จ"));
    await reload();
  }

  async function remove(f: ProjectFile) {
    if (!confirm(`ลบ "${f.name}" ออกจากโปรเจกต์นี้?`)) return;
    setBusy(f.id);

    // ลบไฟล์ก่อนแล้วค่อยลบแถว — ถ้าสลับลำดับแล้วลบไฟล์พลาด
    // จะเหลือไฟล์ลอยที่ไม่มีใครมองเห็นและตามลบไม่ได้อีกเลย
    if (f.storage_path) {
      const { error: se } = await supabase.storage.from(FILES_BUCKET).remove([f.storage_path]);
      if (se) {
        setBusy(null);
        setError(fileErrorMessage(se, "ลบไฟล์ออกจากที่เก็บไม่สำเร็จ"));
        return;
      }
    }

    const { error: e } = await supabase.from("project_files").delete().eq("id", f.id);
    setBusy(null);
    if (e) setError(fileErrorMessage(e, "ลบรายการไฟล์ไม่สำเร็จ"));
    await reload();
  }

  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-6">
      <h2 className="mb-3 text-base font-bold tracking-tight">ไฟล์ส่งมอบ</h2>

      {error && (
        <p
          role="alert"
          className="mb-3 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.88rem] text-red-300"
        >
          <span className="break-all">{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-auto flex-none font-bold">
            ปิด
          </button>
        </p>
      )}

      {files === null ? (
        <p className="text-sm text-ink-faint">กำลังโหลด…</p>
      ) : files.length === 0 && pending.length === 0 ? (
        <p className="text-sm text-ink-faint">ยังไม่มีไฟล์ส่งมอบ</p>
      ) : (
        <ul className="grid gap-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
            >
              <span
                className={`size-2 flex-none rounded-full ${f.status === "delivered" ? "bg-brand-500" : "bg-line-strong"}`}
                aria-hidden="true"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink-muted">{f.name}</span>
                <span className="block text-[0.76rem] text-ink-faint">
                  {f.status === "delivered"
                    ? f.delivered_on
                      ? `ส่งแล้ว ${thaiDate(f.delivered_on)}`
                      : "ส่งแล้ว"
                    : "ยังไม่ส่ง"}
                  {f.storage_path ? ` · ${formatBytes(f.size_bytes)}` : " · ไม่มีไฟล์แนบ"}
                </span>
              </span>

              <span className="flex flex-none items-center gap-1">
                {f.storage_path && (
                  <button
                    type="button"
                    onClick={() => download(f)}
                    disabled={busy === f.id}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-[0.8rem] font-bold text-ink-muted transition-colors hover:text-brand-400 disabled:opacity-50"
                  >
                    {busy === f.id ? "…" : "ดาวน์โหลด"}
                  </button>
                )}
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleStatus(f)}
                      disabled={busy === f.id}
                      className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink disabled:opacity-50"
                    >
                      {f.status === "delivered" ? "ทำเป็นยังไม่ส่ง" : "ทำเป็นส่งแล้ว"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      disabled={busy === f.id}
                      className="rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-red-400 disabled:opacity-50"
                    >
                      ลบ
                    </button>
                  </>
                )}
              </span>
            </li>
          ))}

          {pending.map((p) => (
            <li
              key={p.key}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-line bg-surface-overlay px-3 py-2.5 text-sm"
            >
              <span className="size-2 flex-none rounded-full bg-amber-400" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink-muted">{p.name}</span>
                <span className={`block text-[0.76rem] ${p.error ? "text-red-300" : "text-ink-faint"}`}>
                  {p.error ? `อัปไม่ขึ้น — ${p.error}` : "กำลังอัปโหลด…"} · {formatBytes(p.size)}
                </span>
              </span>
              {p.error && (
                <button
                  type="button"
                  onClick={() => setPending((list) => list.filter((x) => x.key !== p.key))}
                  className="flex-none rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors hover:text-ink"
                >
                  ปิด
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            uploadFromDrop(e.dataTransfer);
          }}
          className={`mt-4 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? "border-brand-500 bg-brand-500/5" : "border-line"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              uploadFromInput(e.target.files);
              // ล้างค่าเพื่อให้เลือกไฟล์ชื่อเดิมซ้ำได้ ไม่งั้น onChange ไม่ยิงรอบสอง
              e.target.value = "";
            }}
          />
          {/*
            เลือกทั้งโฟลเดอร์ — ต้องตั้ง webkitdirectory ผ่าน ref
            เพราะยังไม่ใช่ attribute มาตรฐาน ใส่ใน JSX ตรง ๆ TypeScript ไม่รับ
          */}
          <input
            ref={(el) => {
              if (el) el.webkitdirectory = true;
            }}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              uploadFromInput(e.target.files);
              e.target.value = "";
            }}
            id={`${projectId}-folder-input`}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-xl bg-brand-500 px-4 py-2 text-[0.9rem] font-bold text-brand-950"
            >
              เลือกไฟล์อัปโหลด
            </button>
            <button
              type="button"
              onClick={() => document.getElementById(`${projectId}-folder-input`)?.click()}
              className="rounded-xl border border-line px-4 py-2 text-[0.9rem] font-bold text-ink-muted transition-colors hover:text-ink"
            >
              เลือกทั้งโฟลเดอร์
            </button>
          </div>
          <p className="mt-2 text-[0.8rem] text-ink-faint">
            หรือลากไฟล์/โฟลเดอร์มาวางตรงนี้ · ไฟล์ละไม่เกิน {formatBytes(MAX_FILE_BYTES)} ·
            ครั้งละไม่เกิน {MAX_FILES_PER_BATCH} ไฟล์
          </p>
          <p className="mt-1 text-[0.78rem] text-ink-faint">
            โฟลเดอร์จะถูกคลี่เป็นไฟล์เรียงกัน โดยเก็บชื่อโฟลเดอร์ไว้หน้าชื่อไฟล์
          </p>
        </div>
      )}

      <p className="mt-4 text-[0.8rem] text-ink-faint">
        ไฟล์เก็บแบบไม่เปิดสาธารณะ คนนอกโปรเจกต์เปิดไม่ได้แม้จะรู้ลิงก์
        {canManage && " — ลิงก์ดาวน์โหลดมีอายุ 1 นาที ส่งต่อให้คนอื่นใช้ไม่ได้"}
      </p>
    </section>
  );
}
