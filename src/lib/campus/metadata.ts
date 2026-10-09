import type { Metadata } from "next";
import { campusBase, campusZones, projectCover, resolveCampusRoute } from "./index";
import { siteFeatures } from "../site-config";

export function campusMetadata(path: string[]): Metadata {
  const route = resolveCampusRoute(path);
  if (!route) return {};
  const title = route.page === "project" ? route.project.title
    : route.page === "zone" ? campusZones[route.zone].name
    : route.page === "resume" ? `Resume / ${route.language.toUpperCase()}`
    : { home: "Creative Campus — Watcharin", work: "Selected Work", about: "About Watcharin", contact: "Contact" }[route.page];
  const description = route.page === "project" ? route.project.summary
    : route.page === "zone" ? campusZones[route.zone].intro
    : "ระบบ แบรนด์ และประสบการณ์ดิจิทัล ในโลกของ Watcharin Kurain";
  // Filter tabs are alternate views of the same archive; index the base page.
  const canonicalPath = route.page === "work" ? ["work"] : path;
  const url = path.length === 0 && siteFeatures.portfolio ? "/"
    : `${campusBase}${canonicalPath.length ? `/${canonicalPath.join("/")}` : ""}`;
  const images = [{
    url: route.page === "project" ? projectCover(route.project) : "/campus/campus-poster.png",
    width: route.page === "project" ? 1672 : 1024,
    height: route.page === "project" ? 941 : 374,
    alt: title,
  }];
  return {
    title, description,
    alternates: { canonical: url },
    robots: { index: siteFeatures.portfolio && route.page !== "resume", follow: siteFeatures.portfolio },
    openGraph: { title, description, url, images, type: "website", locale: "th_TH", siteName: "Watcharin Service" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
