import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Thai } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Watcharin Service — System Design Studio",
  description:
    "วางระบบธุรกิจครบวงจร จากแนวคิด สู่ระบบจริง — รับออกแบบและพัฒนาระบบ Web และ Mobile สำหรับธุรกิจและอุตสาหกรรม โดย Software Architect",
  keywords: [
    "Software Architect",
    "Web Development",
    "Mobile Development",
    "AI Integration",
    "System Design",
    "Thailand",
    "Next.js",
  ],
  authors: [{ name: "Watcharin Kurain" }],
  openGraph: {
    title: "Watcharin Service — System Design Studio",
    description: "วางระบบธุรกิจครบวงจร จากแนวคิด สู่ระบบจริง",
    type: "website",
    locale: "th_TH",
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
      </body>
    </html>
  );
}
