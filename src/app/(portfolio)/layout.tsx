import { CampusShell } from "@/components/campus/CampusShell";
import { siteFeatures } from "@/lib/site-config";
import "./campus/campus.css";
import "./campus/campus-home.css";

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
  // Sharing this layout keeps the scene/navigation shell mounted between the
  // homepage and Campus details, including browser Back and scroll restoration.
  return siteFeatures.portfolio
    ? <CampusShell homeHref="/">{children}</CampusShell>
    : children;
}
