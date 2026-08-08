export type ProjectStatus = "ACTIVE" | "BUILDING" | "STEALTH" | "OVERVIEW";

export type Project = {
  id: string;
  icon: string;
  name: string;
  domain: string;
  /** ลิงก์เว็บจริง — มีเฉพาะโปรเจกต์ที่เปิดใช้งานแล้ว */
  url?: string;
  category: string;
  status: ProjectStatus;
  statusLabel: string;
  /** สั้นๆ สำหรับการ์ดในกริด */
  tagline: string;
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
    url: "https://watcharin-service.com",
    category: "Portfolio + Service Hub",
    status: "ACTIVE",
    statusLabel: "🟢 LIVE",
    tagline: "ศูนย์รวมโปรเจคและบริการทั้งหมดของผม",
    description:
      "เว็บไซต์หลักที่นำเสนอบริการ 'ออกแบบและสร้างระบบครบวงจร' ของ Watcharin พร้อมโชว์ผลงาน Ecosystem 5 ระบบ และเป็นจุดเริ่มต้นในการติดต่อสำหรับลูกค้าใหม่",
    features: [
      "Single-page portfolio (Home / About / Services / Work / Resume / Contact)",
      "แสดงผลงาน Ecosystem ทั้ง 5 ระบบ",
      "ฟอร์มติดต่อ + ส่งอีเมลอัตโนมัติ (Resend)",
      "PDF Resume สร้างอัตโนมัติจากข้อมูลเว็บ",
      "SEO + OG image + Vercel Analytics",
      "รองรับภาษาไทย + อังกฤษ",
    ],
    techStack: ["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "Vercel", "Cloudflare"],
    timeline: "Phase 1.1 — Live (2026-06)",
    currentInfo: "✅ Live ที่ watcharin-service.com — Vercel + Cloudflare, auto-deploy ทุก git push",
    iconBg: "bg-brand-500/15",
    accentText: "text-brand-400",
    statusBadge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  },
  "tang-tee": {
    id: "tang-tee",
    icon: "🎉",
    name: "tang-tee",
    domain: "tang-tee.com",
    url: "https://tang-tee.com",
    category: "Community + Trip Planning",
    status: "ACTIVE",
    statusLabel: "🟢 LIVE",
    tagline: "ตั้งทีม จัดทริป รวมกิจกรรม Public/Private",
    description:
      "แพลตฟอร์มสำหรับ 'ตั้งตี้' — รวมกลุ่ม จัดทริป จัดกิจกรรม ทั้งแบบ Public และ Private รองรับตั้งแต่ทริปเที่ยวต่างจังหวัด ปาร์ตี้ผับบาร์ ไปจนถึงตั้งทีมทำงาน/ทีมขาย",
    features: [
      "🚀 ตั้งตี้เที่ยวต่างจังหวัด + ต่างประเทศ",
      "💰 หารบิลอัตโนมัติ + AI อ่านใบเสร็จช่วยลงรายการ",
      "🗺️ แผนที่ค้นหาตี้ทั่วไทย — filter ภาค/จังหวัด/อำเภอ + near-me",
      "🔗 เชิญสมาชิกผ่าน link หรือ LINE",
      "⭐ รีวิวหลังทริปจบ + Web Push / อีเมลแจ้งเตือน",
      "🛡️ ระบบ Moderation + fair-usage สำหรับดูแลชุมชน",
      "🎵 อนาคต: ตี้ผับ/บาร์, ตั้งทีมทำงาน, ทีมขาย, ทีม R&D",
    ],
    techStack: ["Next.js 16", "Supabase", "Vercel", "Claude API", "Tailwind", "MapLibre", "Sentry"],
    timeline: "Live — tang-tee.com (2026)",
    currentInfo: "✅ Live ที่ tang-tee.com — ตั้งตี้ หารบิล แผนที่ค้นหาตี้ รีวิว ครบทุกฟีเจอร์หลัก",
    iconBg: "bg-cyan-500/15",
    accentText: "text-cyan-400",
    statusBadge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  },
  "stealth-healthy": {
    id: "stealth-healthy",
    icon: "💊",
    name: "🔒 Stealth Project",
    domain: "ปิดเป็นความลับ",
    category: "E-commerce Platform",
    status: "STEALTH",
    statusLabel: "🔒 STEALTH",
    tagline: "ขายสินค้าสุขภาพ จัดกลุ่มตามส่วนของร่างกาย",
    description:
      "โปรเจค E-commerce สายสุขภาพและความงาม จัดสินค้าตามส่วนของร่างกาย รายละเอียดเฉพาะถูกซ่อนไว้เพื่อป้องกัน competition และ domain squatting",
    features: [
      "🔒 รายละเอียดถูกซ่อน — เปิดเผยเฉพาะ partner ที่ลงนาม NDA",
      "📞 ติดต่อ Watcharin โดยตรงสำหรับการพูดคุยเชิงลึก",
    ],
    techStack: ["Modern stack — รายละเอียดเปิดเผยเมื่อ launch"],
    timeline: "Phase 3 (2027+)",
    currentInfo: "🧠 อยู่ในขั้นวางแผนและออกแบบ",
    iconBg: "bg-pink-500/15",
    accentText: "text-pink-400",
    statusBadge: "text-ink bg-surface-overlay border-line-strong",
    stealth: true,
  },
  "x-tier": {
    id: "x-tier",
    icon: "🤝",
    name: "x-tier",
    domain: "www.x-tier.pro",
    url: "https://www.x-tier.pro",
    category: "Direct-Selling + Organization Management",
    status: "ACTIVE",
    statusLabel: "🟢 LIVE",
    tagline: "จัดการองค์กรขายตรง ตั้งเป้า เทรน ติดตามทีม",
    description:
      "แพลตฟอร์มจัดการองค์กรขายตรง/เครือข่าย — ตั้งเป้ายอด ติดตามทีม ระบบฝึกอบรม และแคตตาล็อกสินค้า ออกแบบให้สอดคล้องกับ พ.ร.บ.ขายตรง และ PDPA",
    features: [
      "🎯 ตั้งเป้ายอด (targets) + ติดตามความคืบหน้าของทีม",
      "🧾 ระบบเคลม (claim) ตรวจสอบได้",
      "📚 ระบบเทรน/ฝึกอบรมสมาชิก",
      "🛍️ แคตตาล็อกสินค้า",
      "🔐 ล็อกอินด้วย Google + LINE",
      "⚖️ ออกแบบให้สอดคล้อง พ.ร.บ.ขายตรง ม.19 + PDPA",
    ],
    techStack: ["Next.js 16", "Supabase", "Vercel", "Tailwind", "Google/LINE OAuth"],
    timeline: "Live — www.x-tier.pro (2026)",
    currentInfo: "✅ Live ที่ www.x-tier.pro — MVP + เป้า/เคลม/แคตตาล็อก/เทรน + เฟส 2 ครบ",
    iconBg: "bg-purple-500/15",
    accentText: "text-purple-400",
    statusBadge: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  },
  "stealth-khongthai": {
    id: "stealth-khongthai",
    icon: "🔬",
    name: "🔒 Stealth Project",
    domain: "ปิดเป็นความลับ",
    category: "R&D Platform",
    status: "STEALTH",
    statusLabel: "🔒 STEALTH",
    tagline: "วิจัยและออกแบบสินค้าไทย สายสุขภาพ-ความงาม",
    description:
      "แพลตฟอร์มวิจัยและออกแบบสินค้าไทย สายสุขภาพและความงาม รายละเอียดเฉพาะถูกซ่อนไว้",
    features: [
      "🔒 รายละเอียดถูกซ่อน — เปิดเผยเฉพาะ partner ที่ลงนาม NDA",
      "📞 ติดต่อ Watcharin โดยตรงสำหรับการพูดคุยเชิงลึก",
    ],
    techStack: ["Modern stack — รายละเอียดเปิดเผยเมื่อ launch"],
    timeline: "Phase 4 (2027+)",
    currentInfo: "🧠 อยู่ในขั้นวางแผนและออกแบบ",
    iconBg: "bg-orange-500/15",
    accentText: "text-orange-400",
    statusBadge: "text-ink bg-surface-overlay border-line-strong",
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
    tagline: "value chain ของทุกระบบ เชื่อมกันด้วย AI",
    description:
      "Watcharin Ecosystem คือระบบนิเวศธุรกิจครบวงจร 5 ระบบที่เชื่อมกันเป็น value chain ตั้งแต่รวมคน → R&D → ผลิต → ขาย → จัดการองค์กร โดยใช้ AI ขับเคลื่อนทุกขั้นตอน",
    features: [
      "1️⃣ tang-tee → รวมทีม + จัดกิจกรรม 🟢 Live",
      "2️⃣ 🔒 Stealth → R&D + ออกแบบสินค้า",
      "3️⃣ 🏭 โรงงานผลิต (partner)",
      "4️⃣ 🔒 Stealth → E-commerce ขายสินค้า",
      "5️⃣ x-tier → จัดการองค์กรขายตรง/ทีมขาย 🟢 Live",
    ],
    techStack: ["Vertical integration", "AI-orchestrated", "Multi-tenant SaaS"],
    timeline: "18-24 เดือน (ทั้งระบบ)",
    currentInfo: "🚀 Phase 1 Live — watcharin-service + tang-tee + x-tier",
    iconBg: "bg-brand-500",
    accentText: "text-brand-400",
    statusBadge: "text-brand-300 bg-brand-500/10 border-brand-500/30",
  },
};

export const ecosystemDisplay = [
  "watcharin-service",
  "tang-tee",
  "x-tier",
  "stealth-healthy",
  "stealth-khongthai",
] as const;
