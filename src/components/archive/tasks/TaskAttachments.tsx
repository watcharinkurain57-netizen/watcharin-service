"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  FILES_BUCKET,
  MAX_FILE_BYTES,
  SIGNED_URL_SECONDS,
  downloadName,
  fileErrorMessage,
  formatBytes,
  storageKey,
} from "@/lib/project-files";
import { MAX_TASK_FILES_PER_BATCH, TASK_FILES_PREFIX, type TaskFile } from "@/lib/project-tasks";
import {
  PREVIEW_URL_SECONDS,
  previewKind,
  type PreviewItem,
  type PreviewKind,
} from "@/lib/file-preview";
import { FileViewer } from "../FileViewer";

/**
 * ไฟล์แนบของงานหนึ่งงาน
 *
 * คนในโปรเจกต์เปิดดูและโหลดได้ · เจ้าของแนบและลบได้
 * ตัวที่กันจริงคือ policy บน storage.objects (0009) กับ project_task_files (0019)
 * ปุ่มในนี้แค่ไม่เอาของที่กดไม่ได้มาให้เกะกะ
 */

const IMAGE_PREVIEW_LIMIT = 12;

export function TaskAttachments({
  projectId,
  taskId,
  canEdit,
  files,
  onChanged,
}: {
  projectId: string;
  taskId: string;
  canEdit: boolean;
  files: TaskFile[];
  onChanged: () => Promise<void> | void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  /** ไฟล์ที่กำลังเปิดดูอยู่ · null = ไม่ได้เปิดกล่อง */
  const [viewing, setViewing] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const images = useMemo(
    () => files.filter((f) => (f.mime_type ?? "").startsWith("image/")).slice(0, IMAGE_PREVIEW_LIMIT),
    [files]
  );
  // เทียบด้วยรายการ path ไม่ใช่ตัว array เพราะ files ถูกสร้างใหม่ทุกครั้งที่ parent render
  const previewKeys = files
    .filter((f) => previewKind(f.mime_type, f.name))
    .map((f) => f.storage_path)
    .join("|");

  /** ขอลิงก์ทั้งชุดในคำขอเดียว — ยิงทีละใบจะกลายเป็นสิบคำขอตอนเปิดกล่อง */
  const loadPreviews = useCallback(async () => {
    const paths = previewKeys ? previewKeys.split("|") : [];
    if (paths.length === 0) return {};

    const { data } = await supabase.storage.from(FILES_BUCKET).createSignedUrls(paths, PREVIEW_URL_SECONDS);
    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) map[row.path] = row.signedUrl;
    }
    return map;
  }, [supabase, previewKeys]);

  useEffect(() => {
    let alive = true;
    loadPreviews().then((map) => {
      // รูปที่โหลดลิงก์ไม่ได้ก็ปล่อยไป ยังกดดาวน์โหลดได้ตามปกติ
      if (alive) setPreviews(map);
    });
    return () => {
      alive = false;
    };
  }, [loadPreviews]);

  /**
   * ไฟล์ที่เปิดดูได้ในกล่อง — รูปกับ PDF
   *
   * ต่างจาก `images` ตรงที่รวม PDF ด้วย · `images` ใช้ทำภาพย่อเท่านั้น
   * ซึ่ง PDF ทำไม่ได้ (ต้อง render หน้าแรกออกมาก่อน ซึ่งต้องพึ่ง library)
   */
  const viewable = useMemo(
    () => files.filter((f) => previewKind(f.mime_type, f.name)),
    [files]
  );

  const viewerItems: PreviewItem[] = viewable
    .filter((f) => previews[f.storage_path])
    .map((f) => ({
      id: f.id,
      name: f.name,
      kind: previewKind(f.mime_type, f.name) as PreviewKind,
      url: previews[f.storage_path],
    }));

  function openViewer(f: TaskFile) {
    const i = viewerItems.findIndex((x) => x.id === f.id);
    if (i === -1) {
      setError("ยังขอลิงก์เปิดดูไฟล์นี้ไม่ได้ — ลองดาวน์โหลดแทน");
      return;
    }
    setViewing(i);
  }

  /* ---------- แนบ ---------- */

  /**
   * ลำดับสำคัญ: ขึ้น Storage ก่อน แล้วค่อยเขียนแถว
   * ถ้าเขียนแถวไม่สำเร็จต้องลบไฟล์ที่เพิ่งอัปทิ้ง ไม่งั้นเหลือไฟล์ลอย
   * ที่ไม่มีใครมองเห็นแต่ยังกินโควตา (เหตุผลเต็ม ๆ อยู่ใน FilesTab.uploadOne)
   */
  async function attachOne(file: File): Promise<boolean> {
    if (file.size > MAX_FILE_BYTES) {
      setError(`"${file.name}" ใหญ่เกิน ${formatBytes(MAX_FILE_BYTES)}`);
      return false;
    }
    if (file.size === 0) {
      setError(`"${file.name}" เป็นไฟล์ว่าง — ข้ามไป`);
      return false;
    }

    const path = storageKey(projectId, file.name, crypto.randomUUID(), TASK_FILES_PREFIX);

    const up = await supabase.storage.from(FILES_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (up.error) {
      setError(fileErrorMessage(up.error, `แนบ "${file.name}" ไม่สำเร็จ`));
      return false;
    }

    const ins = await supabase.from("project_task_files").insert({
      project_id: projectId,
      task_id: taskId,
      // ชื่อที่คนอ่านเก็บไว้ตรงนี้ ภาษาไทยได้เต็มที่ ส่วน path เป็น ascii ล้วน
      name: file.name.slice(0, 200),
      storage_path: path,
      size_bytes: file.size,
      mime_type: file.type || null,
    });

    if (ins.error) {
      await supabase.storage.from(FILES_BUCKET).remove([path]);
      setError(fileErrorMessage(ins.error, `บันทึกรายการไฟล์ "${file.name}" ไม่สำเร็จ`));
      return false;
    }

    return true;
  }

  async function attach(list: File[]) {
    if (list.length === 0) return;
    setError(null);

    let picked = list;
    if (picked.length > MAX_TASK_FILES_PER_BATCH) {
      setError(`เลือกมา ${picked.length} ไฟล์ — แนบให้ครั้งละ ${MAX_TASK_FILES_PER_BATCH} ไฟล์`);
      picked = picked.slice(0, MAX_TASK_FILES_PER_BATCH);
    }

    setUploading(picked.map((f) => f.name));
    let ok = 0;
    for (const f of picked) if (await attachOne(f)) ok += 1;
    setUploading([]);

    if (ok > 0) await onChanged();
  }

  /* ---------- โหลด / ลบ ---------- */

  async function download(f: TaskFile) {
    setBusy(f.id);
    const { data, error: e } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUrl(f.storage_path, SIGNED_URL_SECONDS, { download: downloadName(f.name) });
    setBusy(null);

    if (e || !data?.signedUrl) {
      setError(fileErrorMessage(e, "ขอลิงก์ดาวน์โหลดไม่สำเร็จ"));
      return;
    }

    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.rel = "noopener";
    a.click();
  }

  async function remove(f: TaskFile) {
    if (!confirm(`ลบไฟล์แนบ "${f.name}"?`)) return;
    setBusy(f.id);

    // ลบใน Storage ก่อนแล้วค่อยลบแถว — สลับลำดับแล้วถ้าลบไฟล์พลาด
    // จะเหลือไฟล์ลอยที่มองไม่เห็นและตามลบไม่ได้อีกเลย
    const { error: se } = await supabase.storage.from(FILES_BUCKET).remove([f.storage_path]);
    if (se) {
      setBusy(null);
      setError(fileErrorMessage(se, "ลบไฟล์ออกจากที่เก็บไม่สำเร็จ"));
      return;
    }

    const { error: e } = await supabase.from("project_task_files").delete().eq("id", f.id);
    setBusy(null);
    if (e) setError(fileErrorMessage(e, "ลบรายการไฟล์ไม่สำเร็จ"));
    await onChanged();
  }

  /* ---------- หน้าตา ---------- */

  const dropProps = canEdit
    ? {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setDragging(false);
          attach(Array.from(e.dataTransfer.files ?? []));
        },
      }
    : {};

  return (
    <div className="grid gap-2" {...dropProps}>
      <div className="flex items-center gap-2">
        <span className="text-[0.8rem] font-semibold text-ink-muted">
          ไฟล์แนบ {files.length > 0 && <span className="text-ink-faint">{files.length}</span>}
        </span>
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="ml-auto rounded-lg border border-line px-2.5 py-1 text-[0.76rem] font-semibold text-ink-muted transition-colors hover:border-brand-500 hover:text-brand-300"
            >
              + แนบไฟล์
            </button>
            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => {
                attach(Array.from(e.target.files ?? []));
                // ล้างค่าเพื่อให้เลือกไฟล์ **ชื่อเดิม** ซ้ำแล้วยัง onChange อีกครั้ง
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[0.8rem] text-red-300">
          {error}
        </p>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((f) =>
            previews[f.storage_path] ? (
              <button
                key={f.id}
                type="button"
                onClick={() => openViewer(f)}
                title={f.name}
                className="overflow-hidden rounded-lg border border-line transition-colors hover:border-brand-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ลิงก์ signed มีอายุสั้นและเปลี่ยนทุกครั้ง ให้ next/image มาแคชไม่ได้ */}
                <img src={previews[f.storage_path]} alt={f.name} className="h-24 w-auto max-w-40 object-cover" />
              </button>
            ) : null
          )}
        </div>
      )}

      <ul className="grid gap-1">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-surface-overlay px-3 py-2 text-[0.84rem]"
          >
            <span className="min-w-0 flex-1 truncate text-ink-muted" title={f.name}>
              {f.name}
            </span>
            <span className="flex-none text-[0.74rem] text-ink-faint">{formatBytes(f.size_bytes)}</span>
            {previewKind(f.mime_type, f.name) && (
              <button
                type="button"
                onClick={() => openViewer(f)}
                className="flex-none rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-brand-400"
              >
                ดู
              </button>
            )}
            <button
              type="button"
              disabled={busy === f.id}
              onClick={() => download(f)}
              className="flex-none rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-brand-400 disabled:opacity-50"
            >
              {busy === f.id ? "…" : "ดาวน์โหลด"}
            </button>
            {canEdit && (
              <button
                type="button"
                disabled={busy === f.id}
                onClick={() => remove(f)}
                className="flex-none rounded px-1.5 py-0.5 text-[0.76rem] font-semibold text-ink-faint transition-colors hover:text-red-400 disabled:opacity-50"
              >
                ลบ
              </button>
            )}
          </li>
        ))}

        {uploading.map((name) => (
          <li
            key={`up-${name}`}
            className="flex items-center gap-3 rounded-lg border border-dashed border-line px-3 py-2 text-[0.84rem] text-ink-faint"
          >
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <span className="flex-none text-[0.74rem]">กำลังแนบ…</span>
          </li>
        ))}
      </ul>

      {viewing !== null && viewerItems[viewing] && (
        <FileViewer
          items={viewerItems}
          index={viewing}
          onIndex={setViewing}
          onClose={() => setViewing(null)}
          onDownload={(item) => {
            const row = files.find((f) => f.id === item.id);
            if (row) download(row);
          }}
        />
      )}

      {files.length === 0 && uploading.length === 0 && (
        <p
          className={`rounded-lg border border-dashed px-3 py-4 text-center text-[0.8rem] transition-colors ${
            dragging ? "border-brand-500 text-brand-300" : "border-line text-ink-faint"
          }`}
        >
          {canEdit ? "ยังไม่มีไฟล์แนบ — ลากไฟล์มาวางตรงนี้ได้" : "ยังไม่มีไฟล์แนบ"}
        </p>
      )}
    </div>
  );
}
