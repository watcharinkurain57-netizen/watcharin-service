"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { thaiDate, todayIso } from "@/lib/project-tasks";
import {
  FILES_BUCKET,
  FILE_SELECT,
  FOLDER_SELECT,
  MAX_FILES_PER_BATCH,
  MAX_FILE_BYTES,
  SIGNED_URL_SECONDS,
  cleanFolderName,
  downloadName,
  dropEntries,
  expandEntries,
  fileErrorMessage,
  flattenFolders,
  folderTrail,
  formatBytes,
  pickedName,
  storageKey,
  type PickedFile,
  type ProjectFile,
  type ProjectFolder,
} from "@/lib/project-files";

/**
 * แท็บไฟล์ส่งมอบ — มีโฟลเดอร์จริง
 *
 * คนในโปรเจกต์เปิดดูและโหลดได้ เจ้าของจัดโฟลเดอร์/อัป/ย้าย/ลบได้
 * ตัวที่กันจริงคือ policy บน storage.objects กับ project_files / project_folders
 * ปุ่มในนี้แค่ไม่เอาของที่กดไม่ได้มาให้เกะกะ
 *
 * โหลดไฟล์กับโฟลเดอร์ของทั้งโปรเจกต์มาทีเดียวแล้วกรองในเครื่อง
 * เพราะจำนวนไฟล์ต่อโปรเจกต์อยู่ในหลักร้อย การยิงใหม่ทุกครั้งที่กดเข้าโฟลเดอร์
 * ทำให้กดแล้วรอ ทั้งที่ข้อมูลอยู่ในมืออยู่แล้ว
 */

type Pending = { key: string; name: string; size: number; error: string | null };

export function FilesTab({ projectId, canManage }: { projectId: string; canManage: boolean }) {
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [cwd, setCwd] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const load = useCallback(async () => {
    const [f, d] = await Promise.all([
      supabase.from("project_files").select(FILE_SELECT).eq("project_id", projectId).order("sort"),
      supabase.from("project_folders").select(FOLDER_SELECT).eq("project_id", projectId).order("sort"),
    ]);
    return {
      files: (f.data ?? []) as ProjectFile[],
      folders: (d.data ?? []) as ProjectFolder[],
      error: f.error ?? d.error,
    };
  }, [supabase, projectId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await load();
      if (!alive) return;
      if (r.error) setError(r.error.message);
      setFiles(r.files);
      setFolders(r.folders);
    })();
    return () => {
      alive = false;
    };
  }, [load]);

  async function reload() {
    const r = await load();
    if (r.error) setError(r.error.message);
    else {
      setFiles(r.files);
      setFolders(r.folders);
    }
    return r;
  }

  /** ---------- โฟลเดอร์ ---------- */

  /**
   * สร้างโฟลเดอร์ตามเส้นทางที่ลากมา แล้วคืน id ของชั้นในสุด
   *
   * `cache` เป็นสำเนาที่แก้ได้ระหว่างอัปทั้งชุด — จำเป็นเพราะไฟล์ 30 ไฟล์
   * ที่อยู่โฟลเดอร์เดียวกันต้องใช้โฟลเดอร์เดิม ไม่ใช่สร้าง 30 อัน
   * (state ของ React อัปเดตไม่ทันภายในลูปเดียวกัน)
   */
  async function ensureFolderPath(
    segments: string[],
    start: string | null,
    cache: ProjectFolder[]
  ): Promise<string | null> {
    let parent = start;

    for (const raw of segments) {
      const name = cleanFolderName(raw);
      if (!name) continue;

      const found = cache.find(
        (f) => f.parent_id === parent && f.name.toLowerCase() === name.toLowerCase()
      );
      if (found) {
        parent = found.id;
        continue;
      }

      const { data, error: e } = await supabase
        .from("project_folders")
        .insert({ project_id: projectId, parent_id: parent, name })
        .select(FOLDER_SELECT)
        .single();

      if (e || !data) throw new Error(fileErrorMessage(e, "สร้างโฟลเดอร์ไม่สำเร็จ"));

      cache.push(data as ProjectFolder);
      parent = (data as ProjectFolder).id;
    }

    return parent;
  }

  async function createFolder() {
    const name = cleanFolderName(newFolder);
    if (!name) return;

    const { error: e } = await supabase
      .from("project_folders")
      .insert({ project_id: projectId, parent_id: cwd, name });

    // 23505 = ชนกับ unique index ของชื่อในชั้นเดียวกัน
    if (e) setError(e.code === "23505" ? `มีโฟลเดอร์ชื่อ "${name}" อยู่แล้วตรงนี้` : fileErrorMessage(e, "สร้างโฟลเดอร์ไม่สำเร็จ"));
    else setNewFolder("");
    await reload();
  }

  async function removeFolder(f: ProjectFolder) {
    const inside = (files ?? []).filter((x) => x.folder_id === f.id).length;
    const subs = folders.filter((x) => x.parent_id === f.id).length;

    const warn = [
      `ลบโฟลเดอร์ "${f.name}"?`,
      inside > 0 ? `ไฟล์ ${inside} ไฟล์ข้างในจะย้ายออกมาอยู่นอกโฟลเดอร์ ไม่ถูกลบ` : null,
      subs > 0 ? `โฟลเดอร์ย่อย ${subs} อันจะถูกลบไปด้วย` : null,
    ]
      .filter(Boolean)
      .join("\n");

    if (!confirm(warn)) return;

    setBusy(f.id);
    const { error: e } = await supabase.from("project_folders").delete().eq("id", f.id);
    setBusy(null);
    if (e) setError(fileErrorMessage(e, "ลบโฟลเดอร์ไม่สำเร็จ"));
    await reload();
  }

  async function moveFile(file: ProjectFile, folderId: string | null) {
    setBusy(file.id);
    const { error: e } = await supabase
      .from("project_files")
      .update({ folder_id: folderId })
      .eq("id", file.id);
    setBusy(null);
    if (e) setError(fileErrorMessage(e, "ย้ายไฟล์ไม่สำเร็จ"));
    await reload();
  }

  /** ---------- อัปโหลด ---------- */

  /**
   * ลำดับสำคัญ: ขึ้น Storage ก่อน แล้วค่อยเขียนแถวใน DB
   * ถ้าเขียนแถวไม่สำเร็จต้องลบไฟล์ที่เพิ่งอัปทิ้ง ไม่งั้นจะเหลือไฟล์ลอย
   * ที่ไม่มีใครมองเห็นแต่ยังกินโควตา — และไม่มีทางไปตามลบทีหลัง
   * เพราะหน้าเว็บรู้จักไฟล์ผ่านตาราง project_files เท่านั้น
   */
  async function uploadOne(file: File, name: string, folderId: string | null, sortFrom: number) {
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
      folder_id: folderId,
      // ชื่อที่คนอ่าน เก็บของจริงไว้ตรงนี้ ภาษาไทยได้เต็มที่
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

    const cache = [...folders];
    const base = Math.max(0, ...(files ?? []).map((f) => f.sort)) + 1;
    let ok = 0;

    for (const [i, item] of picked.entries()) {
      // ชื่อที่มี / มาจากการเลือก/ลากทั้งโฟลเดอร์ → สร้างโฟลเดอร์จริงตามนั้น
      const segments = item.name.split("/");
      const baseName = segments.pop() || item.name;

      let target = cwd;
      if (segments.length > 0) {
        try {
          target = await ensureFolderPath(segments, cwd, cache);
        } catch (err) {
          setError(err instanceof Error ? err.message : "สร้างโฟลเดอร์ไม่สำเร็จ");
          break;
        }
      }

      if (await uploadOne(item.file, baseName, target, base + i)) ok += 1;
    }

    if (ok > 0 || cache.length !== folders.length) await reload();
  }

  function uploadFromInput(list: FileList | null) {
    upload(Array.from(list ?? []).map((file) => ({ file, name: pickedName(file) })));
  }

  /**
   * ต้องอ่าน entry ให้เสร็จก่อน await ตัวแรก
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

  /** ---------- โหลด / ลบ / สถานะ ---------- */

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

  /** ---------- สิ่งที่แสดงในชั้นปัจจุบัน ---------- */

  const trail = folderTrail(folders, cwd);
  const here = folders
    .filter((f) => f.parent_id === cwd)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "th"));
  const shown = (files ?? []).filter((f) => (f.folder_id ?? null) === cwd);
  const allFolders = flattenFolders(folders);

  const countIn = (id: string) => ({
    files: (files ?? []).filter((f) => f.folder_id === id).length,
    folders: folders.filter((f) => f.parent_id === id).length,
  });

  const chip =
    "rounded-lg px-2 py-1.5 text-[0.8rem] font-bold text-ink-faint transition-colors disabled:opacity-50";

  return (
    <section className="rounded-2xl border border-line bg-surface-raised p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold tracking-tight">ไฟล์ส่งมอบ</h2>

        {/* เส้นทางที่อยู่ตอนนี้ */}
        <nav aria-label="ที่อยู่ปัจจุบัน" className="flex flex-wrap items-center gap-1 text-[0.85rem]">
          <button
            type="button"
            onClick={() => setCwd(null)}
            className={cwd === null ? "font-bold text-ink" : "text-ink-faint hover:text-ink"}
          >
            ไฟล์ทั้งหมด
          </button>
          {trail.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1">
              <span className="text-ink-faint" aria-hidden="true">
                ›
              </span>
              <button
                type="button"
                onClick={() => setCwd(f.id)}
                className={i === trail.length - 1 ? "font-bold text-ink" : "text-ink-faint hover:text-ink"}
              >
                {f.name}
              </button>
            </span>
          ))}
        </nav>
      </div>

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
      ) : (
        <ul className="grid gap-2">
          {/* โฟลเดอร์ก่อน แล้วค่อยไฟล์ — เหมือนที่ทุกโปรแกรมจัดการไฟล์ทำ */}
          {here.map((f) => {
            const n = countIn(f.id);
            return (
              <li
                key={f.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
              >
                {/* ไอคอนโฟลเดอร์วาดด้วย CSS — glyph ยูนิโคดเพี้ยนเป็นตัวไทยบนฟอนต์ไทย */}
                <span
                  className="relative size-4 flex-none rounded-[3px] border border-brand-400/70 before:absolute before:-top-1 before:left-0 before:h-1 before:w-2 before:rounded-t-[2px] before:border before:border-b-0 before:border-brand-400/70 before:content-['']"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => setCwd(f.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-semibold text-ink">{f.name}</span>
                  <span className="block text-[0.76rem] text-ink-faint">
                    {n.files === 0 && n.folders === 0
                      ? "ว่าง"
                      : [n.folders > 0 ? `${n.folders} โฟลเดอร์` : null, n.files > 0 ? `${n.files} ไฟล์` : null]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </button>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removeFolder(f)}
                    disabled={busy === f.id}
                    className={`${chip} flex-none hover:text-red-400`}
                  >
                    ลบ
                  </button>
                )}
              </li>
            );
          })}

          {here.length === 0 && shown.length === 0 && pending.length === 0 && (
            <li className="text-sm text-ink-faint">
              {cwd === null ? "ยังไม่มีไฟล์ส่งมอบ" : "โฟลเดอร์นี้ยังว่าง"}
            </li>
          )}

          {shown.map((f) => (
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

              <span className="flex flex-none flex-wrap items-center gap-1">
                {canManage && allFolders.length > 0 && (
                  <select
                    aria-label={`ย้าย ${f.name} ไปโฟลเดอร์`}
                    value={f.folder_id ?? ""}
                    disabled={busy === f.id}
                    onChange={(e) => moveFile(f, e.target.value || null)}
                    className="max-w-[11rem] rounded-lg border border-line bg-surface-overlay px-2 py-1.5 text-[0.78rem] text-ink-muted outline-none focus:border-brand-500"
                  >
                    <option value="">— นอกโฟลเดอร์ —</option>
                    {allFolders.map(({ folder, depth }) => (
                      <option key={folder.id} value={folder.id}>
                        {`${"  ".repeat(depth)}${folder.name}`}
                      </option>
                    ))}
                  </select>
                )}

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
                      className={`${chip} hover:text-ink`}
                    >
                      {f.status === "delivered" ? "ทำเป็นยังไม่ส่ง" : "ทำเป็นส่งแล้ว"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(f)}
                      disabled={busy === f.id}
                      className={`${chip} hover:text-red-400`}
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
                  className={`${chip} flex-none hover:text-ink`}
                >
                  ปิด
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createFolder();
            }}
            className="mt-4 flex flex-wrap gap-2"
          >
            <input
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder={cwd === null ? "ชื่อโฟลเดอร์ใหม่ เช่น Flow, Diagram, คู่มือ" : "ชื่อโฟลเดอร์ย่อย"}
              className="min-w-0 flex-1 rounded-xl border border-line bg-surface-overlay px-3 py-2 text-[0.9rem] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={cleanFolderName(newFolder).length === 0}
              className="rounded-xl border border-line px-4 py-2 text-[0.9rem] font-bold text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              ＋ สร้างโฟลเดอร์
            </button>
          </form>

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
            className={`mt-3 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
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
                folderInputRef.current = el;
              }}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                uploadFromInput(e.target.files);
                e.target.value = "";
              }}
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
                onClick={() => folderInputRef.current?.click()}
                className="rounded-xl border border-line px-4 py-2 text-[0.9rem] font-bold text-ink-muted transition-colors hover:text-ink"
              >
                เลือกทั้งโฟลเดอร์
              </button>
            </div>
            <p className="mt-2 text-[0.8rem] text-ink-faint">
              ลงใน <b className="font-bold text-ink-muted">{trail.length === 0 ? "ไฟล์ทั้งหมด" : trail.map((f) => f.name).join(" / ")}</b>
              {" · "}ไฟล์ละไม่เกิน {formatBytes(MAX_FILE_BYTES)} · ครั้งละไม่เกิน {MAX_FILES_PER_BATCH} ไฟล์
            </p>
            <p className="mt-1 text-[0.78rem] text-ink-faint">
              ลากโฟลเดอร์มาวางได้ ระบบจะสร้างโฟลเดอร์ตามโครงสร้างเดิมให้เอง
            </p>
          </div>
        </>
      )}

      <p className="mt-4 text-[0.8rem] text-ink-faint">
        ไฟล์เก็บแบบไม่เปิดสาธารณะ คนนอกโปรเจกต์เปิดไม่ได้แม้จะรู้ลิงก์
        {canManage && " — ลิงก์ดาวน์โหลดมีอายุ 1 นาที ส่งต่อให้คนอื่นใช้ไม่ได้ · ลบโฟลเดอร์แล้วไฟล์ข้างในย้ายออกมา ไม่ถูกลบ"}
      </p>
    </section>
  );
}
