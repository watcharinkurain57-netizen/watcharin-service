import { siteFeatures } from "@/lib/site-config";
import { CampusShell } from "@/components/campus/CampusShell";
export default function CampusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return siteFeatures.portfolio ? children : <CampusShell>{children}</CampusShell>;
}
