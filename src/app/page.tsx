import { faq } from "@/lib/faq";
import { Chapter } from "@/components/Chapter";
import { SceneLayer } from "@/components/three/SceneLayer";
import { SmoothScroll } from "@/components/SmoothScroll";
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
    {
      // Built from the same array that renders the accordion, so the markup and
      // the structured data cannot drift apart.
      "@type": "FAQPage",
      "@id": `${SITE}/#faq`,
      mainEntity: faq.map(({ q, a }) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
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

      {/* Fixed WebGL layer at z-0. Mounts itself only after hydration settles,
          and not at all for reduced-motion / save-data / no-WebGL visitors. */}
      <SceneLayer />

      {/* Everything readable sits above the canvas. */}
      <div id="main-content" className="relative z-10">
      <Nav />

      {/* Six chapters. Order is the sales funnel: what I build → how I work
          → the industrial deep-dive → proof → why me → contact. Each chapter
          becomes one state of the WebGL scene in a later phase. */}
      <Chapter index={1} label="hero">
        <Hero />
        <TrustBar />
      </Chapter>

      <Chapter index={2} label="capabilities">
        <Services />
        <Process />
      </Chapter>

      <Chapter index={3} label="industrial">
        <Industrial />
      </Chapter>

      <Chapter index={4} label="ecosystem">
        <CaseStudies />
        <FeaturedWork />
      </Chapter>

      <Chapter index={5} label="why-me">
        <DecisionMakers />
        <About />
        <Resume />
      </Chapter>

      <Chapter index={6} label="contact">
        <Faq />
        <FinalCta />
      </Chapter>

      <SiteFooter />
      </div>

      <ScrollFader />
      <SmoothScroll />
    </>
  );
}