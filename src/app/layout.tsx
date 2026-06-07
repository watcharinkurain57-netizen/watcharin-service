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
    default: "Watcharin Service — System Design Studio",
    template: "%s | Watcharin Service",
  },
  description:
    "วางระบบธุรกิจครบวงจร จากแนวคิด สู่ระบบจริง — รับออกแบบและพัฒนาระบบ Web และ Mobile สำหรับธุรกิจและอุตสาหกรรม โดย Software Architect",
  keywords: [
    "Software Architect",
    "System Design Studio",
    "Web Development Thailand",
    "Mobile App Development",
    "AI Integration",
    "Next.js Developer",
    "ServiceNow",
    "Enterprise Architecture",
    "Watcharin Kurain",
    "รับเขียนเว็บ",
    "รับทำระบบ",
  ],
  authors: [{ name: "Watcharin Kurain", url: SITE_URL }],
  creator: "Watcharin Kurain",
  publisher: "Watcharin Service",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Watcharin Service — System Design Studio",
    description:
      "วางระบบธุรกิจครบวงจร จากแนวคิด สู่ระบบจริง — Software Architect ที่ผ่านงานองค์กรใหญ่",
    url: SITE_URL,
    siteName: "Watcharin Service",
    type: "website",
    locale: "th_TH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Watcharin Service — System Design Studio",
    description: "วางระบบธุรกิจครบวงจร จากแนวคิด สู่ระบบจริง",
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
  icons: {
    icon: "/favicon.ico",
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
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
