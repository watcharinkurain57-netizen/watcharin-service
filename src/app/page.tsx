import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";
import { Marquee } from "@/components/home/Marquee";
import { ProjectCard } from "@/components/archive/ProjectCard";
import { fetchProjects } from "@/lib/project-archive-repo";

const SITE = "https://watcharin-service.com";

export const revalidate = 300;

/** ขอบเขตงานที่รับ — บอกตรง ๆ แทนการโฆษณา */
const SCOPE = [
  { group: "โรงงาน", items: ["PLC", "Sensor", "SCADA", "MES", "ERP"] },
  {
    group: "ซอฟต์แวร์",
    items: ["Web Application", "Mobile", "AI", "แอปในชีวิตประจำวัน", "LINE Bot"],
  },
];

const MODES = [
  {
    no: "01",
    title: "มาถามเฉย ๆ",
    body: "ติดอยู่ตรงไหนสักอย่าง อยากรู้ว่าควรไปทางไหนต่อ เล่ามาสั้น ๆ ก็ได้",
    price: "ไม่คิดเงิน",
    tone: "bg-brand-100 text-brand-700",
  },
  {
    no: "02",
    title: "ทำไปด้วยกัน",
    body: "อยากทำเองให้เป็น มีคนคอยชี้ทางและรีวิวโค้ดให้ระหว่างทาง",
    price: "คุยกัน",
    tone: "bg-sky-100 text-sky-700",
  },
  {
    no: "03",
    title: "ทำให้เลย",
    body: "ไม่มีเวลา อยากได้ของที่ใช้งานได้จริง ส่งมอบพร้อมวิธีดูแลต่อ",
    price: "คุยกัน",
    tone: "bg-amber-100 text-amber-700",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE}/#service`,
  name: "watcharin-service",
  url: SITE,
  description:
    "ที่ปรึกษาและรับพัฒนาระบบ — ระบบโรงงาน (PLC, Sensor, SCADA, MES, ERP) เว็บ แอปมือถือ AI แอปในชีวิตประจำวัน และบอทไลน์",
  areaServed: "TH",
  email: "watcharin@watcharin-service.com",
  founder: { "@type": "Person", name: "Watcharin Kurain" },
};

export default async function Home() {
  const projects = await fetchProjects();
  const highlights = projects.slice(0, 3);

  return (
    <div className="theme-soft min-h-screen bg-surface text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <HomeNav />

      <main id="main-content">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden bg-gradient-to-b from-surface-overlay to-surface">
          <div className="pointer-events-none absolute -left-28 -top-20 size-80 rounded-full bg-brand-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-amber-100/60 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:py-24">
            <span className="mb-5 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold tracking-wide text-brand-700">
              ที่ปรึกษาและรับพัฒนาระบบ
            </span>

            <h1 className="max-w-[14ch] text-[2.4rem] font-black leading-[1.06] tracking-tighter text-balance sm:text-6xl">
              ปรึกษา
              <br />
              และ<span className="text-brand-600">ทำร่วมกันได้</span>
            </h1>

            <p className="mt-5 max-w-[46ch] text-[1.08rem] text-ink-muted">
              รับปรึกษาเรื่องการทำโปรเจกต์ ตั้งแต่ระบบในโรงงาน ไปจนถึงเว็บ แอปมือถือ งาน AI
              แอปจัดการชีวิตประจำวัน หรือบอทไลน์ — จะให้ช่วยดูให้อย่างเดียว หรือทำด้วยกันก็ได้
            </p>

            <div className="mt-7 max-w-2xl space-y-2">
              {SCOPE.map((g) => (
                <div key={g.group} className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-brand-100 px-3 py-1.5 text-[0.85rem] font-bold text-brand-700">
                    {g.group}
                  </span>
                  {g.items.map((i) => (
                    <span
                      key={i}
                      className="rounded-full border border-line bg-surface-raised px-3 py-1.5 text-[0.85rem] font-semibold text-ink-muted"
                    >
                      {i}
                    </span>
                  ))}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#talk"
                className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-md shadow-brand-600/25 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
              >
                เล่าโปรเจกต์ให้ฟัง
              </Link>
              <Link
                href="/projects"
                className="rounded-full bg-surface-overlay px-6 py-3 font-bold text-ink transition-transform duration-300 hover:-translate-y-0.5 hover:bg-brand-100 hover:text-brand-700 motion-reduce:transform-none"
              >
                ดูคลังโปรเจกต์
              </Link>
            </div>

            <p className="mt-7 text-[0.9rem] text-ink-muted">
              <b className="font-bold text-ink">4+ ปี</b> ในองค์กรใหญ่
            </p>
          </div>
        </section>

        <Marquee />

        {/* ---------- คลังโปรเจกต์ ---------- */}
        <section className="bg-surface-overlay py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <span className="mb-4 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
              คลังโปรเจกต์
            </span>
            <h2 className="max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
              ดูงานที่เคยทำ <span className="text-brand-600">ก่อนตัดสินใจ</span>
            </h2>
            <p className="mt-3 max-w-[46ch] text-ink-muted">
              แต่ละกล่องคือหนึ่งโปรเจกต์ กดเข้าไปดูได้ว่ามันแก้ปัญหาอะไร ทำอะไรไปแล้วบ้าง
              และใช้อะไรทำ
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {highlights.map((p) => (
                <ProjectCard key={p.slug} project={p} />
              ))}
            </div>

            <Link
              href="/projects"
              className="mt-7 inline-block rounded-full bg-surface-raised px-6 py-3 font-bold text-ink shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:text-brand-700 motion-reduce:transform-none"
            >
              ดูทั้งหมด {projects.length} โปรเจกต์
            </Link>
          </div>
        </section>

        {/* ---------- โหมดบริการ ---------- */}
        <section id="modes" className="scroll-mt-20 bg-surface-raised py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {MODES.map((m) => (
                <div
                  key={m.no}
                  className="rounded-3xl border border-line bg-surface-raised p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-lg motion-reduce:transform-none"
                >
                  <div
                    className={`mb-4 grid size-12 place-items-center rounded-2xl font-mono text-[1.05rem] font-black ${m.tone}`}
                  >
                    {m.no}
                  </div>
                  <h3 className="text-[1.08rem] font-bold tracking-tight">{m.title}</h3>
                  <p className="mt-1.5 text-[0.96rem] text-ink-muted">{m.body}</p>
                  <p className="mt-4 text-[0.92rem] font-extrabold text-brand-600">{m.price}</p>
                </div>
              ))}
            </div>

            <p className="mt-6 max-w-[52ch] text-[0.95rem] text-ink-muted">
              ราคาคุยกันเป็นเคส และบอกได้ว่าทำไมถึงเท่านั้น —{" "}
              <b className="font-semibold text-ink">
                โจทย์ชัด ไม่รีบ ขอบเขตเล็ก ยอมเรียนรู้ไปด้วย
              </b>{" "}
              ทำให้ถูกลง ส่วนเดดไลน์บีบ โจทย์ไม่นิ่ง ต้องต่อกับระบบเดิม
              หรือมีข้อมูลจริงของคนอื่น ทำให้แพงขึ้น
            </p>
          </div>
        </section>

        {/* ---------- ทักมาคุย ---------- */}
        <section id="talk" className="scroll-mt-20 bg-surface py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1fr_1.1fr] md:items-start">
            <div>
              <span className="mb-4 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
                คุยก่อนได้
              </span>
              <h2 className="max-w-[16ch] text-3xl font-extrabold leading-tight tracking-tight text-balance sm:text-4xl">
                เล่ามาสั้น ๆ ก็ได้ <span className="text-brand-600">ไม่ต้องเตรียมอะไร</span>
              </h2>
              <p className="mt-4 max-w-[42ch] text-ink-muted">
                ไม่มีฟอร์มยาว ไม่ต้องกรอกงบก่อน เล่ามาว่าติดอะไรอยู่ ใช้อะไรทำอยู่
                เดี๋ยวช่วยดูให้ว่าควรเริ่มตรงไหน ถ้ามันกลายเป็นงาน ค่อยคุยราคากันทีหลัง
              </p>
              <p className="mt-4 text-[0.92rem] text-ink-faint">
                ถ้าเรื่องมันยาว ทักไลน์สะดวกกว่า — กำลังต่อระบบให้คุยได้จากในไลน์โดยตรง
              </p>
            </div>

            <div className="rounded-3xl border border-line bg-surface-raised p-6 shadow-sm sm:p-8">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
