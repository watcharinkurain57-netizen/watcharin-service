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
  experience: Experience[];
  education: { degree: string; school: string; year: string };
  skills: { category: string; items: string[] }[];
  ecosystem: { name: string; description: string; systems: string[] };
  labels: {
    summary: string;
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
    category: "Backend / API",
    items: ["C#", "Python", "Node.js", "REST API", "Microsoft SQL Server"],
  },
  {
    category: "Mobile",
    items: ["Kotlin (Android)", "Swift (iOS)", "Flutter", "React Native"],
  },
  {
    category: "Enterprise / Tools",
    items: ["ServiceNow (ITSM, CRM)", "Opentext ITSM", "Tableau", "Docker", "GitHub", "AWS", "Cloudflare"],
  },
];

const en: ResumeData = {
  profile: {
    ...sharedContact,
    role: "Software Architect",
    tagline: "System Design Studio · End-to-End Web, Mobile & AI Systems",
    summary:
      "Software Architect with 4+ years across full-stack development, enterprise engineering, and architectural design. Currently building Watcharin Ecosystem — interconnected business systems forming an AI-powered value chain.",
  },
  experience: [
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
    year: "Graduated 2018",
  },
  skills: skillsShared,
  ecosystem: {
    name: "Watcharin Ecosystem",
    description:
      "A connected, AI-powered business ecosystem — products designed to work together end to end, starting with the systems below.",
    systems: [
      "watcharin-service.com — System Design Studio (live)",
      "tang-tee.com — Team & trip coordination platform",
    ],
  },
  labels: {
    summary: "Summary",
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
      "Software Architect ประสบการณ์ 4+ ปี ครอบคลุมงาน full-stack, enterprise engineering และการออกแบบสถาปัตยกรรมระบบ ปัจจุบันกำลังสร้าง Watcharin Ecosystem — ระบบธุรกิจที่เชื่อมกันเป็น value chain ขับเคลื่อนด้วย AI",
  },
  experience: [
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
    year: "จบปี 2561 (2018)",
  },
  skills: skillsShared,
  ecosystem: {
    name: "Watcharin Ecosystem",
    description:
      "ระบบนิเวศธุรกิจที่ขับเคลื่อนด้วย AI — ออกแบบให้แต่ละระบบทำงานเชื่อมกันแบบครบวงจร เริ่มจากระบบด้านล่างนี้",
    systems: [
      "watcharin-service.com — System Design Studio (เปิดใช้งานแล้ว)",
      "tang-tee.com — แพลตฟอร์มรวมทีมและจัดทริป",
    ],
  },
  labels: {
    summary: "สรุปโดยย่อ",
    experience: "ประสบการณ์ทำงาน",
    education: "การศึกษา",
    skills: "ทักษะและเทคโนโลยี",
    building: "กำลังพัฒนา",
  },
};

export function getResume(lang: Lang): ResumeData {
  return lang === "th" ? th : en;
}
