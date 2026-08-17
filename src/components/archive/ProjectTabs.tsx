"use client";

import { useEffect, useState } from "react";
import { ChatTab } from "@/components/archive/ChatTab";
import { FilesTab } from "@/components/archive/FilesTab";
import { PaymentsTab } from "@/components/archive/PaymentsTab";
import { InvitePanel } from "@/components/archive/InvitePanel";
import { Avatar } from "@/components/archive/tasks/Avatar";
import { TasksTab } from "@/components/archive/tasks/TasksTab";
import { personName } from "@/lib/project-tasks";
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

type Member = {
  user_id: string;
  role: ViewerRole;
  created_at: string;
  profiles: ProfileShape | null;
};

type ProfileShape = { display_name: string | null; email: string | null; avatar_url: string | null };

const EMPTY_PROFILE: ProfileShape = { display_name: null, email: null, avatar_url: null };

/** รับได้ทั้งกรณีที่ profiles มาเป็น object เดี่ยวและกรณีที่มาเป็น array */
function normalizeMembers(rows: unknown): Member[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => {
    const row = r as { user_id: string; role: ViewerRole; created_at: string; profiles: unknown };
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      user_id: row.user_id,
      role: row.role,
      created_at: row.created_at,
      profiles: (p as ProfileShape) ?? null,
    };
  });
}

type TabDef = { id: string; label: string; need?: Capability };

const TABS: TabDef[] = [
  { id: "overview", label: "ภาพรวม" },
  { id: "tasks", label: "งาน", need: "project.tasks.view" },
  { id: "money", label: "เงิน", need: "project.invoice.view" },
  { id: "files", label: "ไฟล์", need: "project.files.view" },
  { id: "chat", label: "คุยงาน", need: "project.comments.view" },
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

      // ไฟล์กับงวดจ่ายไม่ได้ดึงตรงนี้แล้ว — แท็บของมันโหลดเอง
      // เพราะต้องรีเฟรชรายการหลังเพิ่ม/แก้/ลบ
      const { data: mem } = await supabase
        .from("project_members")
        .select("user_id,role,created_at,profiles(display_name,email,avatar_url)")
        .eq("project_id", projectId);

      if (!alive) return;
      // PostgREST คืนความสัมพันธ์แบบ many-to-one มาเป็น object เดี่ยว
      // แต่ตัวอนุมานชนิดของ supabase-js มองเป็น array จึงต้องปรับให้ตรงกันเอง
      setMembers(normalizeMembers(mem));
    })();

    return () => {
      alive = false;
    };
  }, [projectId]);

  const visible = TABS.filter((t) => !t.need || can(viewer, t.need));

  // คนนอกเห็นแท็บเดียว ก็ไม่ต้องมีแถบแท็บให้รก
  if (visible.length === 1) return <>{overview}</>;

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
        <TasksTab projectId={projectId} canEdit={can(viewer, "project.tasks.manage")} />
      )}

      {active === "money" && (
        <PaymentsTab projectId={projectId} canManage={can(viewer, "project.invoice.manage")} />
      )}

      {active === "files" && (
        <FilesTab projectId={projectId} canManage={can(viewer, "project.files.manage")} />
      )}

      {active === "chat" && (
        <ChatTab
          projectId={projectId}
          canPost={can(viewer, "project.comments.post")}
          canModerate={can(viewer, "project.comments.moderate")}
        />
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
                  <Avatar person={{ id: m.user_id, ...(m.profiles ?? EMPTY_PROFILE) }} size={28} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">
                      {personName({ id: m.user_id, ...(m.profiles ?? EMPTY_PROFILE) })}
                    </span>
                    <span className="block truncate text-[0.78rem] text-ink-faint">{m.profiles?.email ?? "—"}</span>
                  </span>
                  <span
                    className={`ml-auto flex-none rounded-full px-2.5 py-1 text-[0.74rem] font-bold ${
                      m.role === "owner" ? "bg-brand-500/15 text-brand-300" : "bg-sky-400/15 text-sky-200"
                    }`}
                  >
                    {m.role === "owner" ? "เจ้าของโปรเจกต์" : "คนในโปรเจกต์"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {can(viewer, "project.members.manage") && <InvitePanel projectId={projectId} />}
        </section>
      )}
    </div>
  );
}
