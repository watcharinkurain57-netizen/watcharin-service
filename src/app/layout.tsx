import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Thai } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const ibmPlexThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = "https://watcharin-service.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "watcharin-service — ปรึกษา และทำร่วมกันได้",
    template: "%s | watcharin-service",
  },
  description:
    "ที่ปรึกษาและรับพัฒนาระบบ ตั้งแต่ระบบในโรงงาน (PLC, Sensor, SCADA, MES, ERP) ไปจนถึงเว็บ แอปมือถือ งาน AI แอปจัดการชีวิตประจำวัน และบอทไลน์ — จะให้ช่วยดูให้อย่างเดียว หรือทำด้วยกันก็ได้",
  keywords: [
    "ที่ปรึกษาระบบ",
    "รับทำระบบ",
    "รับเขียนเว็บ",
    "ระบบโรงงาน",
    "PLC",
    "SCADA",
    "MES",
    "ERP",
    "LINE Bot",
    "Software Architect",
    "Next.js Developer",
    "Watcharin Kurain",
  ],
  authors: [{ name: "Watcharin Kurain", url: SITE_URL }],
  creator: "Watcharin Kurain",
  publisher: "Watcharin Service",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "watcharin-service — ปรึกษา และทำร่วมกันได้",
    description:
      "ที่ปรึกษาและรับพัฒนาระบบ ตั้งแต่ระบบในโรงงาน ไปจนถึงเว็บ แอปมือถือ AI และบอทไลน์",
    url: SITE_URL,
    siteName: "watcharin-service",
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: "watcharin-service — ปรึกษา และทำร่วมกันได้",
    description: "ที่ปรึกษาและรับพัฒนาระบบ — โรงงาน เว็บ แอปมือถือ AI และบอทไลน์",
    creator: "@watcharin",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${ibmPlexThai.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-surface-raised focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink focus:ring-2 focus:ring-brand-400"
        >
          ข้ามไปที่เนื้อหา
        </a>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
