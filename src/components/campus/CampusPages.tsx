import Image from "next/image";
import { Fragment, Suspense } from "react";
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
import { CampusProcess } from "./CampusProcess";
import { CampusPageMotion } from "./CampusPageMotion";

const projectKind = (project: CampusProject) => {
  if (project.status === "LIVE") return "ใช้งานแล้ว";
  if (project.status === "DEMO") return "เดโม · ข้อมูลจำลอง";
  if (project.status === "CASE STUDY") return "กรณีศึกษา";
  return "ผลงานย้อนหลัง · ปิดบริการ ส.ค. 2026";
};
const projectArea = (project: CampusProject) =>
  project.category
    .split(" ")
    .map((key) => campusZones[key as CampusZoneKey].name)
    .join(" / ");

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
      aria-label={`ดูรายละเอียด ${project.title}`}
    >
      <div className="campus-cover" data-campus-parallax="">
        <Image
          src={projectCover(project)}
          width={1672}
          height={941}
          alt={`ภาพคอนเซปต์ Mockup ของ ${project.title}`}
          sizes="(max-width: 760px) 100vw, 55vw"
          priority={priority}
        />
      </div>
      <div className="campus-project-meta">
        <span>{projectArea(project)}</span>
        <span aria-hidden="true">↗</span>
      </div>
      <h3>{project.title}</h3>
      <p>{project.summary}</p>
      <div className="campus-project-caption">
        <span>{projectKind(project)}</span>
        <span>ภาพคอนเซปต์จาก AI</span>
      </div>
    </CampusLink>
  );
}
export function CampusWork({ category }: { category: CampusZoneKey | "all" }) {
  const projects = projectsInZone(category);
  return (
    <main id="main-content" className="campus-page campus-work-page">
      <CampusPageMotion />
      <header className="campus-work-intro">
        <div>
          <span className="campus-page-label">ผลงานและเรื่องราว</span>
          <h1 tabIndex={-1}>
            สิ่งที่
            <br />
            ลงมือสร้าง.
          </h1>
        </div>
        <p>
          จากระบบองค์กรสู่เว็บไซต์และแบรนด์ของตัวเอง สำรวจโจทย์ แนวคิด
          และสิ่งที่อยู่เบื้องหลังแต่ละงาน
        </p>
      </header>
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
        <div className="campus-project-grid campus-work-gallery">
          {projects.map((project, index) => (
            <Fragment key={project.key}>
              <CampusProjectCard project={project} priority={index < 2} />
              {category === "all" && index === 0 && <CampusWorkBrand />}
            </Fragment>
          ))}
        </div>
      ) : category !== "brands" ? (
        <div className="campus-empty">
          <span className="campus-page-label">พื้นที่ที่กำลังพัฒนา</span>
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
      <CampusContactCta
        title={
          category === "brands"
            ? "มีแบรนด์ที่อยากต่อยอด?"
            : "มีโจทย์ที่อยากลงมือทำ?"
        }
        zone={category === "all" ? undefined : category}
      />
    </main>
  );
}
function CampusWorkBrand() {
  return (
    <CampusLink
      className="campus-project campus-work-brand"
      href={`${campusBase}/work/brands`}
      aria-label="ดูเรื่องราว WANSABYE"
    >
      <div className="campus-cover" data-campus-parallax="">
        <Image
          src={campusAsset("wansabye-shop.jpg")}
          width={1440}
          height={1440}
          alt="หน้าร้าน WANSABYE พร้อมเสื้อผ้าและป้ายแบรนด์"
          sizes="(max-width: 760px) 100vw, 40vw"
        />
      </div>
      <div className="campus-project-meta">
        <span>Brand House</span>
        <span aria-hidden="true">↗</span>
      </div>
      <h3>WANSABYE</h3>
      <p>
        ร้านเสื้อผ้าที่เปิดมานาน
        และเรื่องราวของแบรนด์ที่กำลังเตรียมกลับมาพัฒนาต่อ
      </p>
      <div className="campus-project-caption">
        <span>แบรนด์เสื้อผ้า</span>
        <span>ภาพจริงจากเพจ</span>
      </div>
    </CampusLink>
  );
}
export function CampusProjectPage({ project }: { project: CampusProject }) {
  const nextProject = campusContent.projects.find(
    (item) =>
      item.key !== project.key &&
      item.category
        .split(" ")
        .some((key) => project.category.split(" ").includes(key)),
  );
  return (
    <main id="main-content" className="campus-page campus-case">
      <CampusPageMotion />
      <CampusBackLink projectKey={project.key} />
      <header className="campus-case-intro">
        <span className="campus-page-label">{projectArea(project)}</span>
        <h1 tabIndex={-1}>{project.title}</h1>
        <p>{project.summary}</p>
        <span className="campus-case-status">{projectKind(project)}</span>
      </header>
      <dl className="campus-project-facts">
        <div>
          <dt>บทบาทของผม</dt>
          <dd>{project.role}</dd>
        </div>
        <div>
          <dt>เทคโนโลยีและจุดเน้น</dt>
          <dd>{project.focus}</dd>
        </div>
        <div>
          <dt>ดูงานต้นทาง</dt>
          <dd>
            <a href={project.url} target="_blank" rel="noopener noreferrer">
              {project.linkLabel}
            </a>
          </dd>
        </div>
      </dl>
      <figure
        className="campus-case-cover campus-cover"
        data-hero-project={project.key}
      >
        <div data-campus-parallax="" className="campus-case-image">
          <Image
            src={projectCover(project)}
            width={1672}
            height={941}
            alt={`ภาพคอนเซปต์ Mockup ของ ${project.title}`}
            sizes="(max-width: 1600px) 100vw, 1440px"
            priority
          />
        </div>
        <figcaption>
          ภาพคอนเซปต์จาก AI สำหรับนำเสนอแนวทางของ {project.title}
        </figcaption>
      </figure>
      <CampusReadingNav />
      <div className="campus-story">
        <article id="brief" tabIndex={-1}>
          <div>
            <span className="campus-page-label">โจทย์ตั้งต้น</span>
            <h2>{project.briefTitle}</h2>
          </div>
          <p>{project.brief}</p>
        </article>
        <article id="development" tabIndex={-1}>
          <div>
            <span className="campus-page-label">แนวคิดและการพัฒนา</span>
            <h2>{project.directionTitle}</h2>
          </div>
          <div>
            <p>{project.direction}</p>
          </div>
          {project.key === "watcharin" && <CampusProcess zone="web" project />}
        </article>
        <article id="role" tabIndex={-1}>
          <div>
            <span className="campus-page-label">บทบาทและสถานะ</span>
            <h2>สิ่งที่ผมทำในงานนี้</h2>
          </div>
          <div>
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
      {nextProject && (
        <aside className="campus-case-next" aria-label="โครงการที่เกี่ยวข้อง">
          <span className="campus-page-label">สำรวจอีกโครงการ</span>
          <CampusLink href={`${campusBase}/projects/${nextProject.key}`}>
            <Image
              src={projectCover(nextProject)}
              width={1672}
              height={941}
              alt={`ภาพคอนเซปต์ ${nextProject.title}`}
              sizes="(max-width: 760px) 35vw, 240px"
            />
            <div>
              <span>{projectArea(nextProject)}</span>
              <h2>{nextProject.title}</h2>
            </div>
            <span aria-hidden="true">↗</span>
          </CampusLink>
        </aside>
      )}
      <CampusContactCta
        title="มีโจทย์ที่ใกล้กันไหม?"
        zone={project.category.split(" ")[0] as CampusZoneKey}
      />
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
    <aside className="campus-cta">
      <div>
        <span className="campus-page-label">เริ่มจากบทสนทนา</span>
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
      <CampusProcess zone={zoneKey} />
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
    <main id="main-content" className="campus-page campus-about-page">
      <header className="campus-about-title">
        <div>
          <span className="campus-page-label">{profile.name}</span>
          <h1 tabIndex={-1}>
            เชื่อมระบบ
            <br />
            ความคิด และ
            <br />
            การออกแบบ.
          </h1>
          <p>{profile.bioTH}</p>
          <CampusLink className="campus-text-link" href="/campus/resume/th">
            อ่านประวัติการทำงานฉบับเต็ม ↗
          </CampusLink>
        </div>
        <figure className="campus-about-portrait">
          <Image
            src="/watcharin-profile.png"
            width={1728}
            height={2496}
            alt="Watcharin Kurain"
            sizes="(max-width: 760px) 85vw, 40vw"
            priority
          />
          <figcaption>{profile.role} / Watcharin Service</figcaption>
        </figure>
      </header>
      <section className="campus-experience">
        <div>
          <span className="campus-page-label">ประสบการณ์</span>
          <h2>
            จากระบบองค์กร
            <br />
            สู่สิ่งที่
            <br />
            กำลังสร้าง.
          </h2>
        </div>
        <div>
          {experience.map((job) => (
            <article key={job.company}>
              <span className="campus-page-label">{job.datesTH}</span>
              <h3>{job.role}</h3>
              <strong>{job.company}</strong>
              <p>{job.bodyTH}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="campus-about-worlds">
        <div>
          <span className="campus-page-label">พื้นที่ของผม</span>
          <h2>
            หลายด้านของงาน
            <br />
            เชื่อมกันในแคมปัส.
          </h2>
          <p>
            นำประสบการณ์ด้านระบบและการพัฒนามาต่อยอดกับแบรนด์และงานภาพที่กำลังสร้าง
          </p>
        </div>
        <nav aria-label="พื้นที่ของงาน">
          {zoneKeys.map((key) => (
            <CampusLink key={key} href={`${campusBase}/zones/${key}`}>
              <span>{campusZones[key].name}</span>
              <span aria-hidden="true">↗</span>
            </CampusLink>
          ))}
        </nav>
      </section>
      <section className="campus-about-education">
        <span className="campus-page-label">การศึกษา</span>
        <h2>
          พื้นฐานจากวิศวกรรม
          <br />
          สู่การออกแบบระบบ.
        </h2>
        <p>{profile.educationTH}</p>
      </section>
      <CampusContactCta title="เริ่มจากไอเดีย ไปถึงสิ่งที่ใช้ได้จริง." />
    </main>
  );
}
export function CampusContact({ configured }: { configured: boolean }) {
  const profile = campusContent.profile;
  return (
    <main id="main-content" className="campus-page campus-contact">
      <div className="campus-contact-copy">
        <span className="campus-page-label">ติดต่อ Watcharin</span>
        <h1 tabIndex={-1}>
          เริ่มต้นจาก
          <br />
          ไอเดียของคุณ.
        </h1>
        <p>
          เว็บไซต์ ระบบงาน แบรนด์ หรือภาพสร้างสรรค์ เล่าเรื่องที่อยากทำ
          แล้วค่อยวางแนวทางไปด้วยกัน
        </p>
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
        <div className="campus-contact-guide">
          <h2>เริ่มเล่าได้จากสามเรื่อง</h2>
          <p>
            สิ่งที่อยากสร้าง เป้าหมายของงาน และช่วงเวลาที่ต้องการ
            ข้อมูลเท่าที่มีตอนนี้ก็เพียงพอสำหรับเริ่มคุยครับ
          </p>
        </div>
      </div>
      <div className="campus-contact-form-area">
        <Suspense fallback={<CampusContactDirect email={profile.email} />}>
          <CampusContactPanel configured={configured} email={profile.email} />
        </Suspense>
      </div>
    </main>
  );
}
