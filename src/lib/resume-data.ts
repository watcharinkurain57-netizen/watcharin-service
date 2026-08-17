export type Experience = {
  role: string;
  company: string;
  period: string;
  bullets: string[];
};

export type ResumeData = {
  profile: {
    name: string;
    role: string;
    tagline: string;
    email: string;
    website: string;
    github: string;
    linkedin: string;
    location: string;
    summary: string;
  };
  highlights: string[];
  experience: Experience[];
  education: { degree: string; school: string; year: string };
  skills: { category: string; items: string[] }[];
  ecosystem: { name: string; description: string; systems: string[] };
  labels: {
    summary: string;
    highlights: string;
    experience: string;
    education: string;
    skills: string;
    building: string;
  };
};

export type Lang = "en" | "th";

const sharedContact = {
  name: "Watcharin Kurain",
  email: "watcharin@watcharin-service.com",
  website: "watcharin-service.com",
  github: "github.com/watcharinkurain57-netizen",
  linkedin: "linkedin.com/in/watcharin-kurain-28bb593b1",
  location: "Thailand",
};

const skillsShared = [
  {
    category: "Frontend / Web",
    items: ["React", "Next.js", "TypeScript", "ASP.NET", "Tailwind CSS", "HTML/CSS", "JavaScript"],
  },
  {
    category: "Backend / Data",
    items: ["C#", "Python", "Node.js", "REST API", "PostgreSQL", "Microsoft SQL Server", "Row-Level Security"],
  },
  {
    category: "Mobile",
    items: ["Kotlin (Android)", "Swift (iOS)", "Flutter", "React Native"],
  },
  {
    category: "Cloud / DevOps / AI",
    items: ["Supabase", "Vercel", "AWS", "Cloudflare", "Docker", "Claude API / AI Agents", "MapLibre", "Sentry"],
  },
  {
    category: "Enterprise / Governance",
    items: ["ServiceNow (ITSM, CRM)", "Opentext ITSM", "OAuth (Google/LINE)", "Tableau", "GitHub", "PDPA-aware design"],
  },
];

const en: ResumeData = {
  profile: {
    ...sharedContact,
    role: "Software Architect",
    tagline: "System Design Studio · End-to-End Web, Mobile & AI Systems",
    summary:
      "Software Architect with 4+ years across full-stack development, enterprise engineering, and architectural design — with experience at public companies including PTT Digital Solutions and MFEC. Shipped 3 production systems end-to-end (watcharin-service.com, tang-tee.com, x-tier.pro): designing, developing, deploying, and operating each one, using AI to accelerate delivery. Two were sunset in Aug 2026 after their lessons were taken forward.",
  },
  highlights: [
    "Shipped and operated 3 production systems end-to-end as sole architect & developer.",
    "4+ years at public companies (PTT Digital Solutions, MFEC, Taokaenoi) — from full-stack to enterprise architecture.",
    "AI-augmented delivery: working MVPs in weeks, not quarters, without trading away scalability.",
    "Compliance-aware by design — built systems aligned with Thai Direct Sales law and PDPA.",
  ],
  experience: [
    {
      role: "Founder & Software Architect",
      company: "Watcharin Ecosystem (watcharin-service.com)",
      period: "Jun 2026 – Present",
      bullets: [
        "Shipped 3 production systems end-to-end — watcharin-service.com, tang-tee.com, and x-tier.pro — owning architecture, development, deployment, and operations.",
        "Built on a modern cloud stack: Next.js, Supabase (Postgres + Row-Level Security), Vercel, with Google/LINE OAuth and Claude AI integration.",
        "Designed x-tier for compliance with Thai Direct Sales law and PDPA; instrumented every system with analytics and error monitoring (Sentry).",
      ],
    },
    {
      role: "Software Architect",
      company: "PTT Digital Solutions Co., Ltd.",
      period: "Aug 2025 – May 2026",
      bullets: [
        "Designed enterprise architecture for large-scale systems within the PTT group.",
        "Focused on system integration and long-term scalable structure.",
        "Translated business requirements into architectural blueprints.",
      ],
    },
    {
      role: "Software Engineer",
      company: "MFEC Public Company Limited",
      period: "Jul 2023 – Sep 2025",
      bullets: [
        "Delivered end-to-end ServiceNow projects covering ITSM and CRM modules.",
        "Built Python APIs and configured Mid Servers for data ingestion.",
        "Worked across Opentext ITSM integrations and custom workflow design.",
      ],
    },
    {
      role: "Application & System Developer",
      company: "Taokaenoi Food & Marketing Public Co., Ltd.",
      period: "Jul 2022 – Mar 2023",
      bullets: [
        "Full-stack web with ASP.NET (C#) frontend and C# + MSSQL backend APIs.",
        "Built Android mobile app using Kotlin.",
        "Created analytics dashboards with Tableau for the operations team.",
      ],
    },
  ],
  education: {
    degree: "B.Eng. in Computer Engineering",
    school: "Rajamangala University of Technology Phra Nakhon (RMUTP)",
    year: "2018 – 2022",
  },
  skills: skillsShared,
  ecosystem: {
    name: "Watcharin Ecosystem",
    description:
      "A connected, AI-powered business ecosystem — products designed to work together end to end. Three systems are already live in production.",
    systems: [
      "watcharin-service.com — consulting & project archive (live)",
      "tang-tee.com — Team & trip coordination platform (2026, sunset)",
      "x-tier.pro — Direct-selling organization management (2026, sunset)",
    ],
  },
  labels: {
    summary: "Summary",
    highlights: "Highlights",
    experience: "Experience",
    education: "Education",
    skills: "Skills & Tech Stack",
    building: "Currently Building",
  },
};

const th: ResumeData = {
  profile: {
    ...sharedContact,
    role: "Software Architect",
    tagline: "System Design Studio · ออกแบบและสร้างระบบ Web, Mobile และ AI ครบวงจร",
    summary:
      "Software Architect ประสบการณ์ 4+ ปี ครอบคลุมงาน full-stack, enterprise engineering และการออกแบบสถาปัตยกรรมระบบ — ผ่านงานองค์กรมหาชนอย่าง PTT Digital Solutions และ MFEC ส่งระบบขึ้น production จริงมาแล้ว 3 ระบบ (watcharin-service.com, tang-tee.com, x-tier.pro) แบบ end-to-end — ออกแบบ พัฒนา deploy และดูแลใช้งานเอง โดยใช้ AI เร่ง delivery · สองระบบปิดบริการเมื่อ ส.ค. 2026 หลังถอดบทเรียนไปต่อยอดแล้ว",
  },
  highlights: [
    "ส่งระบบขึ้น production จริง 3 ระบบแบบ end-to-end ในฐานะ architect และ developer คนเดียว — ใช้งานอยู่ตอนนี้ทั้งหมด",
    "ประสบการณ์ 4+ ปีในองค์กรมหาชน (PTT Digital Solutions, MFEC, เถ้าแก่น้อย) ตั้งแต่ full-stack ถึง enterprise architecture",
    "AI-augmented delivery: ส่ง MVP ที่ใช้งานได้จริงในหลักสัปดาห์ โดยไม่ทิ้งเรื่อง scalability",
    "ออกแบบระบบให้สอดคล้องกฎหมายตั้งแต่ต้น — ทำตาม พ.ร.บ.ขายตรง และ PDPA",
  ],
  experience: [
    {
      role: "Founder & Software Architect",
      company: "Watcharin Ecosystem (watcharin-service.com)",
      period: "มิ.ย. 2026 – ปัจจุบัน",
      bullets: [
        "ส่งระบบขึ้น production จริงแล้ว 3 ระบบแบบ end-to-end — watcharin-service.com, tang-tee.com และ x-tier.pro รับผิดชอบตั้งแต่ออกแบบ พัฒนา deploy จนถึงดูแลใช้งานจริง",
        "ใช้ cloud stack สมัยใหม่: Next.js, Supabase (Postgres + Row-Level Security), Vercel พร้อม Google/LINE OAuth และการเชื่อม AI (Claude)",
        "ออกแบบ x-tier ให้สอดคล้อง พ.ร.บ.ขายตรง และ PDPA พร้อมวางระบบ analytics และ error monitoring (Sentry) ในทุกระบบ",
      ],
    },
    {
      role: "Software Architect",
      company: "PTT Digital Solutions Co., Ltd.",
      period: "ส.ค. 2025 – พ.ค. 2026",
      bullets: [
        "ออกแบบสถาปัตยกรรมระบบสำหรับองค์กรขนาดใหญ่ในกลุ่ม PTT",
        "เน้นการเชื่อมต่อระบบ (system integration) และวางโครงสร้างที่ scale ได้ในระยะยาว",
        "แปลงความต้องการทางธุรกิจให้เป็น architecture blueprint",
      ],
    },
    {
      role: "Software Engineer",
      company: "MFEC Public Company Limited",
      period: "ก.ค. 2023 – ก.ย. 2025",
      bullets: [
        "พัฒนาโปรเจค ServiceNow แบบ end-to-end ครอบคลุม ITSM และ CRM",
        "พัฒนา API ด้วย Python และตั้งค่า Mid Server สำหรับดึงข้อมูลเข้าระบบ",
        "ดูแลงาน integration กับ Opentext ITSM และออกแบบ workflow",
      ],
    },
    {
      role: "Application & System Developer",
      company: "Taokaenoi Food & Marketing Public Co., Ltd.",
      period: "ก.ค. 2022 – มี.ค. 2023",
      bullets: [
        "พัฒนา full-stack web ด้วย ASP.NET (C#) + Microsoft SQL Server",
        "พัฒนา Mobile App บน Android ด้วย Kotlin",
        "สร้าง Dashboard วิเคราะห์ข้อมูลด้วย Tableau ให้ทีม operations",
      ],
    },
  ],
  education: {
    degree: "ปริญญาตรี วิศวกรรมคอมพิวเตอร์",
    school: "มหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร (RMUTP)",
    year: "2561 – 2565 (2018 – 2022)",
  },
  skills: skillsShared,
  ecosystem: {
    name: "Watcharin Ecosystem",
    description:
      "ระบบนิเวศธุรกิจที่ขับเคลื่อนด้วย AI — ออกแบบให้แต่ละระบบทำงานเชื่อมกันแบบครบวงจร ตอนนี้มี 3 ระบบเปิดใช้งานจริงบน production แล้ว",
    systems: [
      "watcharin-service.com — ที่ปรึกษาและคลังโปรเจกต์ (เปิดใช้งานอยู่)",
      "tang-tee.com — แพลตฟอร์มรวมทีมและจัดทริป (2026 ปิดบริการแล้ว)",
      "x-tier.pro — ระบบจัดการองค์กรขายตรง (2026 ปิดบริการแล้ว)",
    ],
  },
  labels: {
    summary: "สรุปโดยย่อ",
    highlights: "จุดเด่น",
    experience: "ประสบการณ์ทำงาน",
    education: "การศึกษา",
    skills: "ทักษะและเทคโนโลยี",
    building: "กำลังพัฒนา",
  },
};

export function getResume(lang: Lang): ResumeData {
  return lang === "th" ? th : en;
}
