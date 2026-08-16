"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { can, type Viewer, type ViewerRole } from "@/lib/archive-access";

/**
 * แผงที่เห็นเฉพาะคนในโปรเจกต์ — งานค้าง งวดจ่าย ไฟล์ส่งมอบ
 *
 * ทำไมดึงข้อมูลฝั่งเบราว์เซอร์ ไม่ใช่ฝั่งเซิร์ฟเวอร์:
 * ถ้าดึงฝั่งเซิร์ฟเวอร์ต้องอ่านคุกกี้ ซึ่งทำให้ทั้งหน้ากลายเป็น dynamic
 * เรนเดอร์ล่วงหน้าไม่ได้อีก ทั้งที่ 99% ของคนที่เปิดหน้านี้เป็นคนนอก
 * ที่ไม่ได้เห็นแผงพวกนี้อยู่แล้ว
 *
 * ที่ทำแบบนี้ได้อย่างปลอดภัยเพราะ RLS กันไว้ที่ฐานข้อมูล ไม่ใช่ที่หน้าจอ
 * คนนอกยิง query ตรง ๆ ก็ได้แถวว่างกลับไป — การซ่อนปุ่มไม่ใช่การกันข้อมูล
 */

type Task = { id: string; title: string; status: "todo" | "doing" | "done"; due_label: string | null };
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

type Data = { tasks: Task[]; payments: Payment[]; files: FileRow[] };

const baht = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });

function Panel({
  title,
  scope,
  children,
}: {
  title: string;
  scope: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface-raised p-6">
      <h2 className="mb-3 flex flex-wrap items-center gap-2 text-base font-bold tracking-tight">
        {title}
        <span className="rounded bg-brand-500/15 px-1.5 py-0.5 text-[0.66rem] font-extrabold tracking-wide text-brand-400">
          {scope}
        </span>
      </h2>
      {children}
    </section>
  );
}

export function OwnerPanels({ projectId }: { projectId: string }) {
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    let alive = true;
    const supabase = createSupabaseBrowserClient();

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setViewer({ role: "public" });
        return;
      }

      const { data: member } = await supabase
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      const role = (member?.role as ViewerRole) ?? "public";
      if (!alive) return;
      setViewer({ role });
      if (role === "public") return;

      const [tasks, payments, files] = await Promise.all([
        supabase
          .from("project_tasks")
          .select("id,title,status,due_label")
          .eq("project_id", projectId)
          .order("sort"),
        supabase
          .from("project_payments")
          .select("id,label,amount,status,due_label")
          .eq("project_id", projectId)
          .order("sort"),
        supabase
          .from("project_files")
          .select("id,name,status,delivered_on")
          .eq("project_id", projectId)
          .order("sort"),
      ]);

      if (!alive) return;
      setData({
        tasks: (tasks.data as Task[]) ?? [],
        payments: (payments.data as Payment[]) ?? [],
        files: (files.data as FileRow[]) ?? [],
      });
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  // คนนอกไม่เห็นอะไรเลย และไม่ต้องรู้ด้วยซ้ำว่ามีแผงพวกนี้อยู่
  if (!viewer || viewer.role === "public" || !data) return null;

  const scopeLabel = viewer.role === "owner" ? "เจ้าของเท่านั้น" : "คนในโปรเจกต์";
  const totalDue = data.payments
    .filter((p) => p.status !== "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 md:items-start">
      {can(viewer, "project.tasks.view") && data.tasks.length > 0 && (
        <Panel title="งานในโปรเจกต์" scope={scopeLabel}>
          <ul className="grid gap-2">
            {data.tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
              >
                <span
                  className={`grid size-4 flex-none place-items-center rounded border-2 text-[0.6rem] font-black ${
                    t.status === "done"
                      ? "border-brand-500 bg-brand-500 text-brand-950"
                      : "border-line-strong"
                  }`}
                  aria-hidden="true"
                >
                  {t.status === "done" ? "✓" : ""}
                </span>
                <span className={t.status === "done" ? "text-ink-faint line-through" : "text-ink-muted"}>
                  {t.title}
                </span>
                {t.due_label && (
                  <span className="ml-auto flex-none text-[0.76rem] text-ink-faint">{t.due_label}</span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {can(viewer, "project.invoice.view") && data.payments.length > 0 && (
        <Panel title="งวดจ่าย" scope={scopeLabel}>
          <ul>
            {data.payments.map((p) => (
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
              ยังไม่ได้จ่าย{" "}
              <b className="font-bold tabular-nums text-ink">{baht.format(totalDue)} ฿</b>
            </p>
          )}
        </Panel>
      )}

      {can(viewer, "project.files.view") && data.files.length > 0 && (
        <Panel title="ไฟล์ส่งมอบ" scope={scopeLabel}>
          <ul className="grid gap-2">
            {data.files.map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-xl bg-surface-overlay px-3 py-2.5 text-sm"
              >
                <span
                  className={`size-2 flex-none rounded-full ${
                    f.status === "delivered" ? "bg-brand-500" : "bg-line-strong"
                  }`}
                  aria-hidden="true"
                />
                <span className="text-ink-muted">{f.name}</span>
                <span className="ml-auto flex-none text-[0.76rem] text-ink-faint">
                  {f.status === "delivered" ? (f.delivered_on ?? "ส่งแล้ว") : "ยังไม่ส่ง"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
