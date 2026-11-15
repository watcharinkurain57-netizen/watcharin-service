import type { Metadata } from "next";
import { CampusHome } from "@/components/campus/CampusHome";
import { siteFeatures } from "@/lib/site-config";
import { campusMetadata } from "@/lib/campus/metadata";
import { campusContent } from "@/lib/campus";

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return siteFeatures.portfolio ? campusMetadata([]) : {};
}

export default async function HomePage() {
  if (!siteFeatures.portfolio) {
    const { default: LegacyHome } = await import("@/components/home/LegacyHome");
    return <LegacyHome />;
  }
  const profile = campusContent.profile;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: "https://watcharin-service.com",
    image: "https://watcharin-service.com/watcharin-profile.png",
    jobTitle: "Software Architect",
    sameAs: [profile.github, profile.linkedin].filter(Boolean),
  };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <CampusHome />
  </>;
}
