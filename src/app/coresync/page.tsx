import type { Metadata } from "next";
import { DesktopNotice, FactoryOS } from "@/components/coresync/FactoryOS";
import "./coresync.css";

const SITE = "https://watcharin-service.com";

export const metadata: Metadata = {
  title: "CoreSync Systems — Factory OS (ตัวอย่างระบบ)",
  description:
    "ตัวอย่างระบบ Factory OS: dashboard ห้องควบคุมการผลิต เห็นสายการผลิต realtime, OEE, สุขภาพเครื่องจักร, digital twin รายไลน์ และ AI ที่อธิบายสาเหตุยอดผลิตตก — ข้อมูลสมมติสำหรับสาธิต",
  alternates: { canonical: "/coresync" },
  openGraph: {
    title: "CoreSync Systems — Factory OS (ตัวอย่างระบบ)",
    description:
      "Dashboard โรงงานแบบ realtime: PLC/Sensor → MES → ERP → BI พร้อม digital twin และ AI insights",
    url: `${SITE}/coresync`,
    siteName: "Watcharin Service",
    type: "website",
    locale: "th_TH",
  },
};

export default function CoreSyncPage() {
  return (
    <div id="main-content" className="coresync-root">
      <FactoryOS />
      <DesktopNotice />
    </div>
  );
}
