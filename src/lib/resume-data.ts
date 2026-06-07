export const profile = {
  name: "Watcharin Kurain",
  role: "Software Architect",
  tagline: "System Design Studio · End-to-End Web, Mobile & AI Systems",
  email: "watcharin@watcharin-service.com",
  website: "watcharin-service.com",
  github: "github.com/watcharinkurain57-netizen",
  location: "Thailand",
  summary:
    "Software Architect with 4+ years across full-stack development, enterprise engineering, and architectural design. Currently building Watcharin Ecosystem — five interconnected business systems forming an AI-powered value chain.",
};

export type Experience = {
  role: string;
  company: string;
  period: string;
  bullets: string[];
};

export const experience: Experience[] = [
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
      "Created analytics dashboards with Tableau for operations team.",
    ],
  },
];

export const education = {
  degree: "B.Eng. in Computer Engineering",
  school: "Rajamangala University of Technology Phra Nakhon (RMUTP)",
  year: "Graduated 2018",
};

export const skills = [
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

export const ecosystem = {
  name: "Watcharin Ecosystem",
  description:
    "A connected, AI-powered business ecosystem — products designed to work together end to end, each layer driven by its own AI Agent.",
  systems: [
    "watcharin-service.com — System Design Studio (live)",
    "tang-tee.com — Team & trip coordination platform",
  ],
};
