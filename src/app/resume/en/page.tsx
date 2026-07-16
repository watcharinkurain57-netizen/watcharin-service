import type { Metadata } from "next";
import { ResumeSheet } from "@/components/ResumeSheet";

export const metadata: Metadata = {
  title: "Resume (English)",
  description: "English resume of Watcharin Kurain — Software Architect",
  robots: { index: false, follow: false },
};

export default function EnglishResumePage() {
  return <ResumeSheet lang="en" />;
}
