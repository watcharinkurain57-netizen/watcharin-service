/**
 * คลังโปรเจกต์ — 1 กล่อง = 1 โปรเจกต์
 *
 * ไฟล์นี้มีแต่ชนิดข้อมูลกับฟังก์ชันบริสุทธิ์ ไม่มีข้อมูลจริง
 * ตัวข้อมูลอยู่ในตาราง projects บน Supabase — ดึงผ่าน project-archive-repo.ts
 *
 * ทุกฟิลด์ในนี้เป็น "ข้อมูลที่ทุกคนเห็นได้"
 * ของที่เห็นเฉพาะเจ้าของ (งานค้าง งวดจ่าย ไฟล์ส่งมอบ) อยู่คนละตาราง
 * เพราะทุกอย่างในนี้ถูกส่งไปที่เบราว์เซอร์ผู้ชม — ดู src/lib/archive-access.ts
 */

export type ProjectStatus = "building" | "shipped" | "sunset";
export type ProjectKind = "factory" | "software";

/** รูปหน้าปกและรูปในแกลเลอรี — วางไฟล์ไว้ที่ public/projects/ */
export type ProjectImage = {
  /** พาธจาก public เช่น "/projects/coresync-cover.jpg" */
  src: string;
  /** คำอธิบายภาพสำหรับคนที่ใช้โปรแกรมอ่านหน้าจอ — บังคับใส่ */
  alt: string;
  /**
   * จุดที่ห้ามโดนครอปทิ้งเวลาย่อขยาย (ค่า CSS object-position)
   * ใส่เมื่อของสำคัญไม่ได้อยู่กลางภาพ เช่น "top" หรือ "50% 20%"
   */
  focus?: string;
};

export type ArchiveProject = {
  /** uuid จากฐานข้อมูล — ใช้ผูกกับ project_tasks / payments / files */
  id: string;
  slug: string;
  name: string;
  /** หนึ่งบรรทัดใต้ชื่อ */
  tagline: string;
  /** โปรเจกต์นี้แก้ปัญหาอะไร — ย่อหน้าละ 1 string */
  problem: string[];
  status: ProjectStatus;
  /** ขยายความสถานะ เช่น "ปิดบริการ ส.ค. 2026" */
  statusNote?: string;
  kind: ProjectKind;
  tags: string[];
  tech: string[];
  /** เช่น "มี.ค. 2026" */
  startedAt: string;
  endedAt?: string;
  /** 0 = ทำคนเดียว */
  collaborators: number;
  /** 0–100 แสดงเป็นแถบบนการ์ด ใส่เฉพาะงานที่ยังทำอยู่ */
  progress?: number;
  /** ทำอะไรไปแล้วบ้าง — ทุกคนเห็นได้ */
  done: string[];
  /** ยังเหลืออะไร — เขียนแบบกว้าง ๆ ที่เปิดเผยได้ */
  next?: string[];
  /** ไม่ใส่ = ใช้พื้นไล่สีที่สุ่มจาก slug แทน (ดู coverGradient) */
  cover?: ProjectImage;
  gallery?: ProjectImage[];
  /** ตัวที่ขึ้นแบนเนอร์ใหญ่บนสุด — ควรมีแค่ตัวเดียว */
  featured?: boolean;
  /** ใช้เรียงแถว "เปิดดูมากที่สุด" — ยังไม่ต่อของจริง */
  views?: number;
};

/* ------------------------------------------------------------------
   พื้นไล่สีสำรอง — ใช้เมื่อยังไม่ได้ใส่รูป
   เลือกจาก slug เพื่อให้กล่องเดิมได้สีเดิมทุกครั้ง ไม่กระพริบตอน re-render
   ------------------------------------------------------------------ */
const GRADIENTS = [
  "linear-gradient(140deg,#155744,#08241C)",
  "linear-gradient(140deg,#1B4D5A,#0E2A33)",
  "linear-gradient(140deg,#4A3A6B,#1E1830)",
  "linear-gradient(140deg,#6B4326,#2A190D)",
  "linear-gradient(140deg,#264C7A,#101F33)",
  "linear-gradient(140deg,#5C2B33,#231014)",
  "linear-gradient(140deg,#2F5230,#12210F)",
];

export function coverGradient(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  building: "กำลังทำ",
  shipped: "เสร็จแล้ว",
  sunset: "ปิดแล้ว",
};

export const KIND_LABEL: Record<ProjectKind, string> = {
  factory: "ระบบโรงงาน",
  software: "เว็บ แอปมือถือ และบอท",
};


/* ---------- helper ---------- */

export type ProjectRow = {
  id: string;
  title: string;
  note?: string;
  items: ArchiveProject[];
  /** แสดงเลขอันดับตัวใหญ่ข้างการ์ด */
  ranked?: boolean;
};

/** แถวถูกคำนวณจากข้อมูล ไม่ได้เขียนตายไว้ — เพิ่มโปรเจกต์แล้วแถวขยายเอง */
export function buildRows(all: ArchiveProject[]): ProjectRow[] {
  const byViews = [...all].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));

  const rows: ProjectRow[] = [
    {
      id: "building",
      title: "กำลังทำอยู่",
      items: all.filter((p) => p.status === "building"),
    },
    {
      id: "popular",
      title: "เปิดดูมากที่สุด",
      items: byViews.slice(0, 10),
      ranked: true,
    },
    {
      id: "factory",
      title: KIND_LABEL.factory,
      note: "PLC · Sensor · SCADA · MES",
      items: all.filter((p) => p.kind === "factory"),
    },
    {
      id: "software",
      title: KIND_LABEL.software,
      items: all.filter((p) => p.kind === "software" && p.status !== "sunset"),
    },
    {
      id: "sunset",
      title: "ปิดตัวแล้ว แต่ได้บทเรียนเยอะ",
      items: all.filter((p) => p.status === "sunset"),
    },
  ];

  // แถวอันดับต้องมีของพอสมควรถึงจะดูมีความหมาย ไม่งั้นซ่อนไปเลย
  return rows.filter((r) => (r.ranked ? r.items.length >= 3 : r.items.length > 0));
}

export function featuredProject(all: ArchiveProject[]): ArchiveProject | undefined {
  return all.find((p) => p.featured) ?? all[0];
}
