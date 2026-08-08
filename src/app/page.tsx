import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { Services } from "@/components/sections/Services";
import { Industrial } from "@/components/sections/Industrial";
import { Process } from "@/components/sections/Process";
import { CaseStudies } from "@/components/sections/CaseStudies";
import { FeaturedWork } from "@/components/sections/FeaturedWork";
import { DecisionMakers } from "@/components/sections/DecisionMakers";
import { About } from "@/components/sections/About";
import { Resume } from "@/components/sections/Resume";
import { Faq } from "@/components/sections/Faq";
import { FinalCta } from "@/components/sections/FinalCta";
import { SiteFooter } from "@/components/sections/SiteFooter";
import { ScrollFader } from "@/components/ScrollFader";

const SITE = "https://watcharin-service.com";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": `${SITE}/#person`,
      name: "Watcharin Kurain",
      jobTitle: "Software Architect",
      url: SITE,
      image: `${SITE}/watcharin-profile.png`,
      email: "watcharin@watcharin-service.com",
      sameAs: [
        "https://github.com/watcharinkurain57-netizen",
        "https://www.linkedin.com/in/watcharin-kurain-28bb593b1/",
      ],
      alumniOf: {
        "@type": "CollegeOrUniversity",
        name: "Rajamangala University of Technology Phra Nakhon (RMUTP)",
      },
      address: { "@type": "PostalAddress", addressCountry: "TH" },
      knowsAbout: [
        "Software Architecture",
        "Web Development",
        "Mobile Development",
        "AI Integration",
        "System Design",
        "ServiceNow",
        "Enterprise Architecture",
      ],
    },
    {
      "@type": "ProfessionalService",
      "@id": `${SITE}/#service`,
      name: "Watcharin Service",
      url: SITE,
      image: `${SITE}/opengraph-image`,
      description:
        "System Design Studio — รับออกแบบและพัฒนาระบบ Web และ Mobile สำหรับธุรกิจและอุตสาหกรรม โดย Software Architect",
      founder: { "@id": `${SITE}/#person` },
      areaServed: "TH",
      email: "watcharin@watcharin-service.com",
      serviceType: [
        "Web Development",
        "Mobile App Development",
        "AI Integration",
        "System Design",
        "Enterprise Architecture",
        "Industrial Systems Integration",
        "MES (Manufacturing Execution System)",
        "ERP Integration",
        "PLC / Sensor Data Integration",
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <Hero />
      <TrustBar />
      <Services />
      <Industrial />
      <Process />
      <CaseStudies />
      <FeaturedWork />
      <DecisionMakers />
      <About />
      <Resume />
      <Faq />
      <FinalCta />
      <SiteFooter />
      <ScrollFader />
    </>
  );
}