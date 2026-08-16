"use client";

import { useEffect, useState } from "react";
import { TasksTab } from "@/components/archive/tasks/TasksTab";
import { can, type Capability, type Viewer, type ViewerRole } from "@/lib/archive-access";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * แท็บของหน้าโปรเจกต์
 *
 * แท็บ "ภาพรวม" เป็นเนื้อหาที่เรนเดอร์มาจากฝั่งเซิร์ฟเวอร์ (static)
 * ส่งเข้ามาทาง props เพื่อให้หน้ายัง prerender ได้ตามเดิม
 * ส่วนแท็บที่เหลือโหลดข้อมูลฝั่งเบราว์เซอร์ตอนคนที่มีสิทธิ์เปิดดู
 *
 * แท็บไหนที่ผู้ชมไม่มีสิทธิ์ จะไม่ถูกเรนเดอร์เลย ไม่ใช่แค่กดไม่ได้
 * และต่อให้แก้ DOM ให้โผล่ ก็ยังดึงข้อมูลไม่ได้เพราะ RLS กันที่ฐานข้อมูล
 */

type Payment = {
  id: string;
  label: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  due_label: string | null;
};

type FileRow = {
  id: string;
  name: string;
  status: "delivered" | "pending";
  delivered_on: string | null;
};

type Member = { user_id: string; role: ViewerRole; created_at: string };

const baht = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

type TabDef = { id: string; label: string; need?: Capability };

const TABS: TabDef[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "tasks", label: "งาน", need: "project.tasks.view" },
  { id: "money", label: "เงิน", need: "project.invoice.view" },
  { id: "files", label: "ไฟล์", need: "project.files.view" },
  { id: "people", label: "คนในโปรเจกต์", need: "project.members.view" },
];

export function ProjectTabs({
  projectId,
  overview,
}: {
  projectId: string;
  overview: React.ReactNode;
}) {
  const [viewer, setViewer] = useState<Viewer>({ role: "public" });
  const [active, setActive] = useState("overview");
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive || !member) return;
      setViewer({ role: member.role as ViewerRole });

      const [pay, file, mem] = await Promise.all([
        supabase.from("project_payments").select("id,label,amount,status,due_label").eq("project_id", projectId).order("sort"),
        supabase.from("project_files").select("id,name,status,delivered_on").eq("project_id", projectId).order("sort"),
        supabase.from("project_members").select("user_id,role,created_at").eq("project_id", projectId),
      ]);

      if (!alive) return;
      setPayments((pay.data as Payment[]) ?? []);
      setFiles((file.data as FileRow[]) ?? []);
      setMembers((mem.data as Member[]) ?? []);
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  const visible = TABS.filter((t) => !t.need || can(viewer, t.need));

  // คนนอกเห็นแท็บเดียว ก็ไม่ต้องมีแถบแท็บให้รก
  if (visible.length === 1) return <>{overview}</>;

  const totalDue = (payments ?? [])
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div>
      <div
        role="tablist"
        aria-label="ส่วนต่าง ๆ ของโปรเจกต์"
        className="mb-6 flex flex-wrap gap-1 overflow-x-auto rounded-xl border border-line bg-surface-overlay p-1"
      >
        {visible.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={`flex-none rounded-lg px-4 py-2 text-[0.9rem] font-bold transition-colors ${
              active === t.id ? "bg-brand-500 text-brand-950" : "text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {active === "overview" && overview}

      {active === "tasks" && (
        <TasksTab projectId={projectId} canEdit={viewer.role === "owner"} />
      )}

      {active === "money" && (
        <section className="rounded-2xl border border-line bg-surface-raised p-6">
          <h2 className="mb-3 text-base font-bold tracking-tight">งวดจ่าย</h2>
          {payments === null ? (
            <p className="text-sm text-ink-faint">กำลังโหลด…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีงวดจ่ายในโปรเจกต์นี้</p>
          ) : (
            <>
              <ul>
                {payments.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line py-2.5 text-sm last:border-b-0"
                  >
                    <span className="text-ink-muted">{p.label}</span>
                    <span
                      className={`font-bold tabular-nums ${
                        p.status === "paid"
                          ? "text-brand-400"
                          : p.status === "overdue"
                            ? "text-red-400"
                            : "text-amber-400"
                      }`}
                    >
                      {p.status === "paid" ? "จ่ายแล้ว" : (p.due_label ?? "รอจ่าย")} ·{" "}
                      {baht.format(Number(p.amount))} ฿
                    </span>
                  </li>
                ))}
              </ul>
              {totalDue > 0 && (
                <p className="mt-3 text-sm text-ink-muted">
                  ยังไม่ได้จ่าย <b className="font-bold tabular-nums text-ink">{baht.format(totalDue)} ฿</b>
                </p>
              )}
            </>
          )}
        </section>
      )}

      {active === "files" && (
        <section className="rounded-2xl border border-line bg-surface-raised p-6">
          <h2 className="mb-3 text-base font-bold tracking-tight">ไฟล์ส่งมอบ</h2>
          {files === null ? (
            <p className="text-sm text-ink-faint">กำลังโหลด…</p>
          ) : files.length === 0 ? (
            <p className="text-sm text-ink-faint">ยังไม่มีไฟล์ส่งมอบ</p>
          ) : (
            <ul className="grid gap-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm">
                  <span
                    className={`size-2 flex-none rounded-full ${f.status === "delivered" ? "bg-brand-500" : "bg-line-strong"}`}
                    aria-hidden="true"
                  />
                  <span className="text-ink-muted">{f.name}</span>
                  <span className="ml-auto flex-none text-[0.76rem] text-ink-faint">
                    {f.status === "delivered" ? (f.delivered_on ?? "ส่งแล้ว") : "ยังไม่ส่ง"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[0.8rem] text-ink-faint">
            ยังอัปโหลดไฟล์จากหน้านี้ไม่ได้ — ต้องต่อ Supabase Storage ก่อน
          </p>
        </section>
      )}

      {active === "people" && (
        <section className="rounded-2xl border border-line bg-surface-raised p-6">
          <h2 className="mb-3 text-base font-bold tracking-tight">คนในโปรเจกต์</h2>
          {members === null ? (
            <p className="text-sm text-ink-faint">กำลังโหลด…</p>
          ) : (
            <ul className="grid gap-2">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center gap-3 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm">
                  <span
                    className={`size-2 flex-none rounded-full ${m.role === "owner" ? "bg-brand-500" : "bg-sky-400"}`}
                    aria-hidden="true"
                  />
                  <span className="text-ink-muted">
                    {m.role === "owner" ? "เจ้าของโปรเจกต์" : "ลูกค้า / คนในโปรเจกต์"}
                  </span>
                  <span className="ml-auto flex-none font-mono text-[0.72rem] text-ink-faint">
                    {m.user_id.slice(0, 8)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[0.8rem] text-ink-faint">
            ยังเชิญคนเข้าโปรเจกต์จากหน้านี้ไม่ได้ — ตาราง project_invites เตรียมไว้แล้ว รอทำหน้าสร้างลิงก์เชิญ
          </p>
        </section>
      )}
    </div>
  );
}
