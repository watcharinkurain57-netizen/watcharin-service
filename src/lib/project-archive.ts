/**
 * คลังโปรเจกต์ — 1 กล่อง = 1 โปรเจกต์
 *
 * ไฟล์นี้เป็น "ข้อมูลที่ทุกคนเห็นได้" เท่านั้น
 * ของที่เห็นเฉพาะเจ้าของ (งานค้าง การเงิน ไฟล์ส่งมอบ) จะไม่มาอยู่ในนี้
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

/* ------------------------------------------------------------------
   ข้อมูลจริงเท่านั้น — อย่าใส่โปรเจกต์สมมติ เพราะหน้านี้คือผลงานที่คนอื่นเชื่อ
   เพิ่มโปรเจกต์ใหม่ = เพิ่ม object ในอาร์เรย์นี้ แถวต่าง ๆ จัดกลุ่มให้เอง
   ------------------------------------------------------------------ */
export const archiveProjects: ArchiveProject[] = [
  {
    slug: "coresync",
    name: "CoreSync",
    tagline: "แดชบอร์ดติดตามสายการผลิตแบบเรียลไทม์",
    problem: [
      "โรงงานมีข้อมูลอยู่แล้วทุกอย่าง แต่กระจายกันคนละที่ — ค่าจากเครื่องอยู่ใน PLC ใบสั่งงานอยู่ในกระดาษ บิลค่าไฟอยู่ในไฟล์ Excel หัวหน้ากะเลยไม่รู้ว่าสายไหนมีปัญหาจนกว่าจะสิ้นวัน",
      "CoreSync รวมทุกอย่างขึ้นจอเดียว เห็นสถานะเครื่องแบบเรียลไทม์ และแจ้งเตือนก่อนที่ของเสียจะออกมาเป็นล็อต",
    ],
    status: "building",
    kind: "factory",
    tags: ["PLC", "Sensor", "SCADA", "MES"],
    tech: ["Next.js", "React", "TypeScript"],
    startedAt: "มี.ค. 2026",
    collaborators: 0,
    progress: 62,
    done: [
      "แดชบอร์ดคุณภาพ ใช้หลัก SPC",
      "ติดตามพลังงานและคำนวณบิลค่าไฟตามโครงสร้างของไทย",
      "แผนซ่อมบำรุงตามรอบ",
      "ใบสั่งงาน พร้อมชุดตรวจ 39 ข้อที่รันอัตโนมัติ",
    ],
    next: ["เชื่อมใบสั่งงานเข้ากับ ERP", "หน้ารายงานสรุปส่งหัวหน้ากะ"],
    featured: true,
    views: 320,
  },
  {
    slug: "watcharin-service",
    name: "watcharin-service",
    tagline: "เว็บบริการและคลังโปรเจกต์ที่คุณกำลังเปิดอยู่",
    problem: [
      "งานที่ทำมากระจายอยู่หลายที่ ทั้งเว็บ ทั้งไลน์ ทั้งไฟล์ในเครื่อง คนที่อยากมาคุยงานเลยไม่รู้จะเริ่มตรงไหน",
      "เว็บนี้รวมทุกอย่างไว้ที่เดียว — ดูงานที่เคยทำ อ่านเรื่องที่เคยตอบ แล้วทักมาคุยได้เลย",
    ],
    status: "shipped",
    kind: "software",
    tags: ["เว็บ", "SEO"],
    tech: ["Next.js 16", "React 19", "Tailwind CSS 4", "Vercel"],
    startedAt: "มิ.ย. 2026",
    collaborators: 0,
    done: [
      "หน้าเว็บพร้อมฉาก WebGL ที่เล่าเรื่องตามการเลื่อนจอ",
      "เรซูเม่สองภาษาที่สั่งพิมพ์ได้",
      "เดโม CoreSync เปิดเล่นได้ในเบราว์เซอร์",
      "เครื่องคำนวณความคุ้มค่าสำหรับเจ้าของโรงงาน",
    ],
    views: 210,
  },
  {
    slug: "tang-tee",
    name: "ตั้งตี้",
    tagline: "แอปหารบิลที่จบได้ในไลน์ ไม่ต้องออกไปหน้าเว็บ",
    problem: [
      "หารบิลหลังไปเที่ยวกันเป็นเรื่องน่าปวดหัว คนจ่ายแทนต้องไล่ทวงเอง คนที่ต้องจ่ายก็ไม่รู้ว่าต้องโอนเท่าไหร่",
      "ตั้งตี้ทำให้พิมพ์ในกลุ่มไลน์แล้วบิลเด้งขึ้นมาพร้อม QR พร้อมเพย์ ใครไม่มีบัญชีก็กดจ่ายผ่านลิงก์ได้ ไม่ต้องสมัครอะไร",
    ],
    status: "sunset",
    statusNote: "ปิดบริการ ส.ค. 2026",
    kind: "software",
    tags: ["LINE Bot", "LIFF", "PromptPay"],
    tech: ["Next.js", "Supabase", "PostgreSQL", "LINE Messaging API"],
    startedAt: "มิ.ย. 2026",
    endedAt: "ส.ค. 2026",
    collaborators: 0,
    done: [
      "หารบิลอัตโนมัติ พร้อม AI ช่วยอ่านใบเสร็จ",
      "บอทไลน์ที่สร้างบิลจากในกลุ่มได้เลย พร้อมการ์ดและ QR พร้อมเพย์",
      "คนนอกที่ไม่มีบัญชีเปิดลิงก์จ่ายและแนบสลิปได้",
      "แผนที่ค้นหาตี้ทั่วไทย กรองถึงระดับตำบล",
      "ฐานข้อมูล 43 migration ดูแลเองทั้งชุด",
    ],
    views: 260,
  },
  {
    slug: "x-tier",
    name: "X-Tier",
    tagline: "ระบบจัดการองค์กรและทีมขาย",
    problem: [
      "ทีมขายที่โตขึ้นเริ่มจัดการด้วย Excel ไม่ไหว ไม่รู้ว่าใครทำถึงไหน เป้าเดือนนี้เหลืออีกเท่าไหร่ เอกสารอยู่ที่ใคร",
      "X-Tier รวมโครงสร้างทีม เป้าหมาย งาน และเอกสารไว้ที่เดียว พร้อมงานอัตโนมัติประจำวันที่รันเองด้วย pg_cron",
    ],
    status: "sunset",
    statusNote: "ปิดบริการ ส.ค. 2026",
    kind: "software",
    tags: ["จัดการองค์กร", "CRM", "เอกสาร"],
    tech: ["Next.js", "Supabase", "PostgreSQL", "pg_cron"],
    startedAt: "มิ.ย. 2026",
    endedAt: "ส.ค. 2026",
    collaborators: 0,
    done: [
      "โครงสร้างทีมพร้อมสิทธิ์การเข้าถึงแยกตามบทบาท",
      "เป้าหมายและการเคลม พร้อมกระดานติดตาม",
      "ระบบเอกสารที่แยกสิทธิ์ตามองค์กร",
      "แผนงานแบบ Gantt พร้อมความสัมพันธ์ระหว่างงาน",
      "ฐานข้อมูล 48 migration และงานอัตโนมัติรายวัน",
    ],
    views: 180,
  },
];

/* ---------- helper ---------- */

export function getProject(slug: string): ArchiveProject | undefined {
  return archiveProjects.find((p) => p.slug === slug);
}

export type ProjectRow = {
  id: string;
  title: string;
  note?: string;
  items: ArchiveProject[];
  /** แสดงเลขอันดับตัวใหญ่ข้างการ์ด */
  ranked?: boolean;
};

/** แถวถูกคำนวณจากข้อมูล ไม่ได้เขียนตายไว้ — เพิ่มโปรเจกต์แล้วแถวขยายเอง */
export function buildRows(all: ArchiveProject[] = archiveProjects): ProjectRow[] {
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

export function featuredProject(all: ArchiveProject[] = archiveProjects): ArchiveProject {
  return all.find((p) => p.featured) ?? all[0];
}
