import type { Metadata } from "next";
import { ResumeSheet } from "@/components/ResumeSheet";

export const metadata: Metadata = {
  title: "เรซูเม่ (ภาษาไทย)",
  description: "เรซูเม่ภาษาไทยของ Watcharin Kurain — Software Architect",
  robots: { index: false, follow: false },
};

export default function ThaiResumePage() {
  return <ResumeSheet lang="th" />;
}
