import type { Metadata } from "next";
import { siteFeatures } from "@/lib/site-config";
import { campusMetadata } from "@/lib/campus/metadata";
import { getContactConfig } from "@/lib/contact";
import { notFound, redirect } from "next/navigation";
import { CampusHome } from "@/components/campus/CampusHome";
import { ResumeSheet } from "@/components/ResumeSheet";
import { CampusLink } from "@/components/campus/CampusShell";
import {
  CampusAbout,
  CampusContact,
  CampusProjectPage,
  CampusWork,
  CampusZonePage,
} from "@/components/campus/CampusPages";
import {
  campusContent,
  resolveCampusRoute,
  zoneKeys,
} from "@/lib/campus";
type Props = { params: Promise<{ path?: string[] }> };
export function generateStaticParams() {
  return [
    [],
    ["work"],
    ["about"],
    ["contact"],
    ["resume", "th"],
    ["resume", "en"],
    ...zoneKeys.map((key) => ["work", key]),
    ...zoneKeys.map((key) => ["zones", key]),
    ...campusContent.projects.map((project) => ["projects", project.key]),
  ].map((path) => ({ path }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return campusMetadata((await params).path ?? []);
}
export default async function CampusPage({ params }: Props) {
  const { path = [] } = await params;
  if (!path.length && siteFeatures.portfolio) redirect("/");
  const route = resolveCampusRoute(path);
  if (!route) notFound();
  switch (route.page) {
    case "home":
      return <CampusHome />;
    case "work":
      return <CampusWork category={route.category} />;
    case "zone":
      return <CampusZonePage zoneKey={route.zone} />;
    case "project":
      return <CampusProjectPage project={route.project} />;
    case "about":
      return <CampusAbout />;
    case "contact":
      return <CampusContact configured={Boolean(getContactConfig(process.env))} />;
    case "resume":
      return (
        <>
          <nav className="campus-resume-language" aria-label="ภาษา Resume">
            <CampusLink
              href="/campus/resume/th"
              aria-current={route.language === "th" ? "page" : undefined}
            >
              ไทย
            </CampusLink>
            <CampusLink
              href="/campus/resume/en"
              aria-current={route.language === "en" ? "page" : undefined}
            >
              English
            </CampusLink>
          </nav>
          <div className="campus-resume">
            <ResumeSheet
              lang={route.language}
              backHref="/campus/about"
              backLabel={
                route.language === "th" ? "← เกี่ยวกับผม" : "← About Watcharin"
              }
            />
          </div>
        </>
      );
  }
}
