export type ProjectStatus = "ACTIVE" | "BUILDING" | "STEALTH" | "OVERVIEW";

export type Project = {
  id: string;
  icon: string;
  name: string;
  domain: string;
  category: string;
  status: ProjectStatus;
  statusLabel: string;
  description: string;
  features: string[];
  techStack: string[];
  timeline: string;
  currentInfo: string;
  // visual
  iconBg: string;
  accentText: string;
  statusBadge: string;
  stealth?: boolean;
};

export const projects: Record<string, Project> = {
  "watcharin-service": {
    id: "watcharin-service",
    icon: "👤",
    name: "watcharin-service",
    domain: "watcharin-service.com",
    category: "Portfolio + Service Hub",
    status: "ACTIVE",
    statusLabel: "ACTIVE",
    description:
      "เว็บไซต์หลักที่นำเสนอบริการ 'ออกแบบและสร้างระบบครบวงจร' ของ Watcharin พร้อมโชว์ผลงาน Ecosystem 5 ระบบ และเป็นจุดเริ่มต้นในการติดต่อสำหรับลูกค้าใหม่",
    features: [
      "Multi-page portfolio (Home / About / Services / Work / Resume / Contact)",
      "แสดงผลงาน Ecosystem ทั้ง 5 ระบบ",
      "ฟอร์มติดต่อสำหรับลูกค้าใหม่",
      "รองรับภาษาไทย + อังกฤษ",
      "Blog/Updates section (อนาคต)",
    ],
    techStack: ["Next.js 16", "TypeScript", "Tailwind CSS 4", "Cloudflare Pages"],
    timeline: "Phase 1.1 — กำลัง revamp (2026-06)",
    currentInfo: "🔄 Migrating จาก AWS Amplify → Cloudflare Pages พร้อม redesign ใหม่",
    iconBg: "bg-brand-100",
    accentText: "text-brand-600",
    statusBadge: "text-brand-700 bg-brand-50 border-brand-200",
  },
  "tang-tee": {
    id: "tang-tee",
    icon: "🎉",
    name: "tang-tee",
    domain: "tang-tee.com",
    category: "Community + Trip Planning",
    status: "BUILDING",
    statusLabel: "BUILDING",
    description:
      "แพลตฟอร์มสำหรับ 'ตั้งตี้' — รวมกลุ่ม จัดทริป จัดกิจกรรม ทั้งแบบ Public และ Private รองรับตั้งแต่ทริปเที่ยวต่างจังหวัด ปาร์ตี้ผับบาร์ ไปจนถึงตั้งทีมทำงาน/ทีมขาย",
    features: [
      "🚀 MVP: ตั้งตี้เที่ยวต่างจังหวัด + ต่างประเทศ",
      "💰 หารบิลอัตโนมัติ (auto bill splitting)",
      "🏨 จัดการค่าใช้จ่ายทุกส่วน (ที่พัก, เดินทาง, อาหาร)",
      "🔗 เชิญสมาชิกผ่าน link หรือ LINE",
      "⭐ รีวิวหลังทริปจบ",
      "🤖 AI ช่วยวางแผนทริป (แนะนำที่พัก, สถานที่)",
      "🎵 อนาคต: ตี้ผับ/บาร์, ตั้งทีมทำงาน, ทีมขาย, ทีม R&D",
    ],
    techStack: ["Next.js 16", "Supabase", "Cloudflare", "Claude API", "Tailwind", "React Native (Phase 2)"],
    timeline: "Phase 1.2 — MVP 8-10 สัปดาห์ (เริ่มหลัง watcharin-service เสร็จ)",
    currentInfo: "📐 อยู่ขั้นวางแผน + ออกแบบ — กำลังสรุป feature scope สำหรับ MVP",
    iconBg: "bg-cyan-100",
    accentText: "text-cyan-600",
    statusBadge: "text-amber-700 bg-amber-50 border-amber-200",
  },
  "stealth-healthy": {
    id: "stealth-healthy",
    icon: "💊",
    name: "🔒 Stealth Project",
    domain: "ปิดเป็นความลับ",
    category: "E-commerce Platform",
    status: "STEALTH",
    statusLabel: "🔒 STEALTH",
    description:
      "โปรเจค E-commerce สายสุขภาพและความงาม จัดสินค้าตามส่วนของร่างกาย รายละเอียดเฉพาะถูกซ่อนไว้เพื่อป้องกัน competition และ domain squatting",
    features: [
      "🔒 รายละเอียดถูกซ่อน — เปิดเผยเฉพาะ partner ที่ลงนาม NDA",
      "📞 ติดต่อ Watcharin โดยตรงสำหรับการพูดคุยเชิงลึก",
    ],
    techStack: ["Modern stack — รายละเอียดเปิดเผยเมื่อ launch"],
    timeline: "Phase 3 (2027+)",
    currentInfo: "🧠 อยู่ในขั้นวางแผนและออกแบบ",
    iconBg: "bg-pink-100",
    accentText: "text-pink-600",
    statusBadge: "text-slate-700 bg-slate-100 border-slate-300",
    stealth: true,
  },
  "stealth-ruamtee": {
    id: "stealth-ruamtee",
    icon: "🤝",
    name: "🔒 Stealth Project",
    domain: "ปิดเป็นความลับ",
    category: "MLM + Organization Management",
    status: "STEALTH",
    statusLabel: "🔒 STEALTH",
    description:
      "แพลตฟอร์มจัดการองค์กรขาย รูปแบบ MLM และระบบฝึกอบรม ติดตามทีม รายละเอียดเฉพาะถูกซ่อนไว้",
    features: [
      "🔒 รายละเอียดถูกซ่อน — เปิดเผยเฉพาะ partner ที่ลงนาม NDA",
      "📞 ติดต่อ Watcharin โดยตรงสำหรับการพูดคุยเชิงลึก",
    ],
    techStack: ["Modern stack — รายละเอียดเปิดเผยเมื่อ launch"],
    timeline: "Phase 4 (2027+)",
    currentInfo: "🧠 อยู่ในขั้นวางแผนและออกแบบ",
    iconBg: "bg-purple-100",
    accentText: "text-purple-600",
    statusBadge: "text-slate-700 bg-slate-100 border-slate-300",
    stealth: true,
  },
  "stealth-khongthai": {
    id: "stealth-khongthai",
    icon: "🔬",
    name: "🔒 Stealth Project",
    domain: "ปิดเป็นความลับ",
    category: "R&D Platform",
    status: "STEALTH",
    statusLabel: "🔒 STEALTH",
    description:
      "แพลตฟอร์มวิจัยและออกแบบสินค้าไทย สายสุขภาพและความงาม รายละเอียดเฉพาะถูกซ่อนไว้",
    features: [
      "🔒 รายละเอียดถูกซ่อน — เปิดเผยเฉพาะ partner ที่ลงนาม NDA",
      "📞 ติดต่อ Watcharin โดยตรงสำหรับการพูดคุยเชิงลึก",
    ],
    techStack: ["Modern stack — รายละเอียดเปิดเผยเมื่อ launch"],
    timeline: "Phase 4 (2027+)",
    currentInfo: "🧠 อยู่ในขั้นวางแผนและออกแบบ",
    iconBg: "bg-orange-100",
    accentText: "text-orange-600",
    statusBadge: "text-slate-700 bg-slate-100 border-slate-300",
    stealth: true,
  },
  overview: {
    id: "overview",
    icon: "✨",
    name: "Ecosystem Overview",
    domain: "value chain ของทุกระบบ",
    category: "Business Model",
    status: "OVERVIEW",
    statusLabel: "OVERVIEW",
    description:
      "Watcharin Ecosystem คือระบบนิเวศธุรกิจครบวงจร 5 ระบบที่เชื่อมกันเป็น value chain ตั้งแต่รวมคน → R&D → ผลิต → ขาย → จัดการองค์กร โดยใช้ AI ขับเคลื่อนทุกขั้นตอน",
    features: [
      "1️⃣ tang-tee → รวมทีม + จัดกิจกรรม",
      "2️⃣ 🔒 Stealth → R&D + ออกแบบสินค้า",
      "3️⃣ 🏭 โรงงานผลิต (partner)",
      "4️⃣ 🔒 Stealth → E-commerce ขายสินค้า",
      "5️⃣ 🔒 Stealth → MLM + จัดการทีมขาย",
    ],
    techStack: ["Vertical integration", "AI-orchestrated", "Multi-tenant SaaS"],
    timeline: "18-24 เดือน (ทั้งระบบ)",
    currentInfo: "🚀 กำลังเริ่ม Phase 1 — watcharin-service + tang-tee",
    iconBg: "bg-brand-500",
    accentText: "text-brand-600",
    statusBadge: "text-brand-700 bg-brand-50 border-brand-200",
  },
};

export const ecosystemDisplay = [
  "watcharin-service",
  "tang-tee",
  "stealth-healthy",
  "stealth-ruamtee",
  "stealth-khongthai",
] as const;
