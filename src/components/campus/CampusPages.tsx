import Image from "next/image";
import { Suspense } from "react";
import { CampusContactDirect, CampusContactPanel } from "./CampusContactPanel";
import {
  campusContent,
  campusZones,
  campusBase,
  campusAsset,
  projectsInZone,
  projectCover,
  zoneKeys,
  type CampusProject,
  type CampusZoneKey,
} from "@/lib/campus";
import { CampusBackLink, CampusLink } from "./CampusShell";
import { CampusReadingNav } from "./CampusReadingNav";
import { CampusBrandGallery } from "./CampusBrandGallery";

const categories = [
  { key: "all", name: "ทั้งหมด" },
  ...zoneKeys.map((key) => ({ key, name: campusZones[key].name })),
];
export function CampusCategories({
  active,
  zones = false,
}: {
  active: string;
  zones?: boolean;
}) {
  return (
    <nav
      className="campus-categories"
      aria-label={zones ? "หมวดงาน" : "กรองผลงาน"}
    >
      {categories
        .filter((category) => !zones || category.key !== "all")
        .map(({ key, name }) => (
          <CampusLink
            key={key}
            href={`${campusBase}/${zones ? "zones" : "work"}${key === "all" ? "" : `/${key}`}`}
            aria-current={active === key ? "page" : undefined}
          >
            {name}
          </CampusLink>
        ))}
    </nav>
  );
}
export function CampusProjectCard({
  project,
  priority = false,
}: {
  project: CampusProject;
  priority?: boolean;
}) {
  return (
    <CampusLink
      className="campus-project"
      href={`${campusBase}/projects/${project.key}`}
      data-project-key={project.key}
      data-campus-reveal=""
      aria-label={`ดูรายละเอียด ${project.title}`}
    >
      <div className="campus-cover">
        <Image
          src={projectCover(project)}
          width={1672}
          height={941}
          alt={`ภาพคอนเซปต์ Mockup ของ ${project.title}`}
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 560px"
          priority={priority}
        />
        <span>AI · CONCEPT MOCKUP</span>
      </div>
      <div className="campus-project-meta">
        <span>{project.tag}</span>
        <span aria-hidden="true">↗</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <span className="campus-status">{project.status}</span>
    </CampusLink>
  );
}
export function CampusWork({ category }: { category: CampusZoneKey | "all" }) {
  const projects = projectsInZone(category);
  return (
    <main id="main-content" className="campus-page">
      <div className="campus-page-title">
        <span className="campus-eyebrow">SELECTED WORK</span>
        <h1 tabIndex={-1}>สิ่งที่ลงมือสร้าง.</h1>
        <p>สำรวจโครงการแต่ละด้าน พร้อมแนวคิดและวิธีพัฒนาที่อยู่เบื้องหลัง</p>
      </div>
      <CampusCategories active={category} />
      {category === "brands" && (
        <>
          <CampusBrands />
          <CampusLink
            className="campus-text-link"
            href={`${campusBase}/zones/brands`}
          >
            สำรวจแนวทางใน Brand House ↗
          </CampusLink>
        </>
      )}
      {projects.length ? (
        <div className="campus-project-grid">
          {projects.map((project, index) => (
            <CampusProjectCard
              key={project.key}
              project={project}
              priority={index < 2}
            />
          ))}
        </div>
      ) : category !== "brands" ? (
        <div className="campus-empty">
          <span className="campus-eyebrow">A WORLD IN PROGRESS</span>
          <h2>
            {campusZones[category as CampusZoneKey].name} กำลังเตรียมเรื่องราว.
          </h2>
          <p>ดูทิศทางงานและข้อมูลที่มีแล้วในหน้ารายละเอียดโซน</p>
          <CampusLink
            className="campus-button"
            href={`${campusBase}/zones/${category}`}
          >
            สำรวจโซน ↗
          </CampusLink>
        </div>
      ) : null}
      {category === "brands" ? (
        <CampusContactCta title="มีแบรนด์ที่อยากต่อยอด?" zone="brands" />
      ) : (
        <div className="campus-endnote">
          <span>
            ภาพคอนเซปต์ใช้แสดงแนวทางงาน ดูบทบาทและสถานะในรายละเอียดแต่ละโครงการ
          </span>
          <CampusLink href={`${campusBase}/contact`}>คุยกัน ↗</CampusLink>
        </div>
      )}
    </main>
  );
}
export function CampusProjectPage({ project }: { project: CampusProject }) {
  return (
    <main id="main-content" className="campus-page campus-case">
      <CampusBackLink projectKey={project.key} />
      <div className="campus-page-title">
        <span className="campus-eyebrow">{project.tag}</span>
        <h1 tabIndex={-1}>{project.title}</h1>
        <p>{project.summary}</p>
      </div>
      <figure
        className="campus-case-cover campus-cover"
        data-hero-project={project.key}
      >
        <Image
          src={projectCover(project)}
          width={1672}
          height={941}
          alt={`ภาพคอนเซปต์ Mockup ของ ${project.title}`}
          sizes="(max-width: 1200px) 100vw, 1120px"
          priority
        />
        <figcaption>AI CONCEPT MOCKUP · ภาพแนวทางการนำเสนอ</figcaption>
      </figure>
      <dl className="campus-project-facts">
        <div>
          <dt>บทบาท</dt>
          <dd>{project.role}</dd>
        </div>
        <div>
          <dt>เทคโนโลยี / จุดเน้น</dt>
          <dd>{project.focus}</dd>
        </div>
        <div>
          <dt>สถานะ</dt>
          <dd>{project.status}</dd>
        </div>
      </dl>
      <CampusReadingNav />
      <div className="campus-story">
        <article id="brief" tabIndex={-1} data-campus-reveal="">
          <span className="campus-eyebrow">01 / THE BRIEF</span>
          <div>
            <h2>{project.briefTitle}</h2>
            <p>{project.brief}</p>
          </div>
        </article>
        <article id="development" tabIndex={-1} data-campus-reveal="">
          <span className="campus-eyebrow">02 / THE DEVELOPMENT</span>
          <div>
            <h2>{project.directionTitle}</h2>
            <p>{project.direction}</p>
          </div>
        </article>
        <article id="role" tabIndex={-1} data-campus-reveal="">
          <span className="campus-eyebrow">03 / ROLE + STATUS</span>
          <div>
            <h2>บทบาทและสถานะของงาน</h2>
            <p>{project.story}</p>
            <a
              className="campus-text-link"
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {project.linkLabel}
            </a>
          </div>
        </article>
      </div>
      <CampusContactCta title="มีโจทย์ที่ใกล้กันไหม?" zone={project.category.split(" ")[0] as CampusZoneKey} />
    </main>
  );
}
function CampusContactCta({
  title,
  zone,
}: {
  title: string;
  zone?: CampusZoneKey;
}) {
  return (
    <aside className="campus-cta" data-campus-reveal="">
      <div>
        <span className="campus-eyebrow">LET’S BUILD SOMETHING</span>
        <h2>{title}</h2>
        <p>เล่าเรื่องที่อยากทำ แล้วค่อยวางแนวทางไปด้วยกัน</p>
      </div>
      <CampusLink
        className="campus-button"
        href={`${campusBase}/contact${zone ? `?zone=${zone}` : ""}`}
      >
        {zone ? campusZones[zone].cta : "เริ่มคุยกัน"} ↗
      </CampusLink>
    </aside>
  );
}
export function CampusZonePage({ zoneKey }: { zoneKey: CampusZoneKey }) {
  const zone = campusZones[zoneKey];
  const projects = projectsInZone(zoneKey);
  const artwork =
    "heroArtwork" in zone
      ? campusAsset(zone.heroArtwork)
      : projectCover(
          campusContent.projects.find(
            (project) => project.key === zone.heroProject,
          )!,
        );
  return (
    <main id="main-content" className="campus-page">
      <CampusLink href={campusBase} className="campus-back">
        ← กลับแคมปัส
      </CampusLink>
      <CampusCategories active={zoneKey} zones />
      <div className="campus-zone-hero">
        <div>
          <span className="campus-eyebrow">{zone.eyebrow}</span>
          <h1 tabIndex={-1}>{zone.name}</h1>
          <h2>{zone.headline}</h2>
          <p>{zone.intro}</p>
          <CampusLink
            className="campus-button"
            href={`${campusBase}/contact?zone=${zoneKey}`}
          >
            {zone.cta} ↗
          </CampusLink>
        </div>
        <figure className="campus-cover">
          <Image
            src={artwork}
            width={1672}
            height={941}
            sizes="(max-width: 600px) 100vw, 560px"
            priority
            alt={`ภาพคอนเซปต์สำหรับ ${zone.name}`}
          />
          <figcaption>AI · CONCEPT ARTWORK</figcaption>
        </figure>
      </div>
      <div className="campus-capabilities">
        {zone.capabilities.map((item, i) => (
          <article key={item.title} data-campus-reveal="">
            <span className="campus-eyebrow">0{i + 1}</span>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
      {zoneKey === "brands" && <CampusBrands />}
      {projects.length > 0 && (
        <section className="campus-zone-projects">
          <span className="campus-eyebrow">
            SELECTED WORK / {zone.name.toUpperCase()}
          </span>
          <h2>ผลงานใน {zone.name}</h2>
          <div className="campus-project-grid">
            {projects.map((project) => (
              <CampusProjectCard key={project.key} project={project} />
            ))}
          </div>
        </section>
      )}
      {zoneKey === "media" && (
        <div className="campus-empty" data-campus-reveal="">
          <span className="campus-eyebrow">{zone.empty?.label}</span>
          <h2>{zone.empty?.title}</h2>
          <p>{zone.empty?.body}</p>
        </div>
      )}
      <section className="campus-process">
        <div>
          <span className="campus-eyebrow">IDEA / APPROACH / BUILD</span>
          <h2>
            เริ่มจากโจทย์
            <br />
            แล้วค่อยลงมือสร้าง.
          </h2>
        </div>
        <ol>
          {zone.steps.map((step, i) => (
            <li key={step.title} data-campus-reveal="">
              <span>0{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <CampusContactCta title="มีไอเดียที่อยากต่อยอด?" zone={zoneKey} />
    </main>
  );
}
function CampusBrands() {
  const { brandRecords } = campusZones.brands;
  return (
    <>
      <section className="campus-brand-records">
        <span className="campus-eyebrow">BRAND STORIES / IN PROGRESS</span>
        <h2>เรื่องราวที่กำลังเดินต่อ.</h2>
        <div className="campus-brand-grid">
          {brandRecords.map((brand) => (
            <article key={brand.key} data-campus-reveal="">
              <span className="campus-status">{brand.status}</span>
              <h3>{brand.name}</h3>
              <p>{brand.summary}</p>
              <div className="campus-brand-channels">
                {brand.channels.map((channel) => (
                  <span key={channel}>{channel}</span>
                ))}
              </div>
              <a
                className="campus-text-link"
                href={brand.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {brand.linkLabel}
              </a>
            </article>
          ))}
        </div>
      </section>
      <CampusBrandGallery />
    </>
  );
}
export function CampusAbout() {
  const { profile, experience } = campusContent;
  return (
    <main id="main-content" className="campus-page">
      <div className="campus-about-title">
        <div>
          <span className="campus-eyebrow">ABOUT WATCHARIN</span>
          <h1 tabIndex={-1}>
            เชื่อมระบบ
            <br />
            ความคิด และการออกแบบ.
          </h1>
          <p>
            ผมทำงานระหว่างเทคโนโลยี การออกแบบ และการสร้างสิ่งที่ใช้งานได้จริง
          </p>
          <CampusLink className="campus-button" href="/campus/resume/th">
            อ่าน Resume ↗
          </CampusLink>
        </div>
        <div className="campus-monogram" aria-hidden="true">
          <strong>W</strong>
          <span>
            WATCHARIN
            <br />
            SERVICE
          </span>
        </div>
      </div>
      <section className="campus-profile" data-campus-reveal="">
        <Image
          src="/watcharin-profile.png"
          width={156}
          height={226}
          alt="Watcharin Kurain"
        />
        <div>
          <span className="campus-eyebrow">SOFTWARE ARCHITECT / FOUNDER</span>
          <h2>{profile.name}</h2>
          <p>{profile.bioTH}</p>
          <span className="campus-status">
            Architecture · ServiceNow · Full-stack development
          </span>
        </div>
      </section>
      <section>
        <span className="campus-eyebrow">AREAS OF INTEREST</span>
        <h2>โลกของงานที่อยากสร้าง</h2>
        <nav className="campus-zone-shortcuts" aria-label="ความสนใจ">
          {zoneKeys.map((key) => (
            <CampusLink key={key} href={`${campusBase}/zones/${key}`}>
              <small>{campusZones[key].number}</small>
              <span>{campusZones[key].name}</span>
              <span>↗</span>
            </CampusLink>
          ))}
        </nav>
      </section>
      <section className="campus-experience">
        <div>
          <span className="campus-eyebrow">EXPERIENCE</span>
          <h2>
            จากระบบองค์กร
            <br />
            สู่โลกที่กำลังสร้าง.
          </h2>
        </div>
        <div>
          {experience.map((job) => (
            <article key={job.company} data-campus-reveal="">
              <span className="campus-eyebrow">{job.datesTH}</span>
              <h3>{job.role}</h3>
              <strong>{job.company}</strong>
              <p>{job.bodyTH}</p>
            </article>
          ))}
        </div>
      </section>
      <CampusContactCta title="เริ่มจากไอเดีย ไปถึงสิ่งที่ใช้ได้จริง." />
    </main>
  );
}
export function CampusContact({ configured }: { configured: boolean }) {
  const profile = campusContent.profile;
  return (
    <main id="main-content" className="campus-page campus-contact">
      <div>
        <span className="campus-eyebrow">LET’S BUILD SOMETHING</span>
        <h1 tabIndex={-1}>
          เริ่มต้นจาก
          <br />
          ไอเดียของคุณ.
        </h1>
        <p>เล่าเรื่องที่อยากทำ แล้วค่อยวางแนวทางไปด้วยกัน</p>
        <a className="campus-text-link" href={`mailto:${profile.email}`}>
          {profile.email} ↗
        </a>
        <div className="campus-contact-links">
          <a href={profile.github} target="_blank" rel="noopener noreferrer">
            GitHub ↗
          </a>
          <a href={profile.linkedin} target="_blank" rel="noopener noreferrer">
            LinkedIn ↗
          </a>
        </div>
      </div>
      <div>
        <Suspense fallback={<CampusContactDirect email={profile.email} />}>
          <CampusContactPanel configured={configured} email={profile.email} />
        </Suspense>
      </div>
    </main>
  );
}
