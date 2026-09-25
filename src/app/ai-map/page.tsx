import type { Metadata } from "next";
import Link from "next/link";
import { AiMap } from "@/components/ai-map/AiMap";
import { RichText } from "@/components/ai-map/RichText";
import { TopicLink } from "@/components/ai-map/TopicLink";
import { TONE } from "@/components/ai-map/tones";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeNav } from "@/components/home/HomeNav";
import { FLOW, LAYERS, MORE, ROADMAP, SOURCES, TOPIC_ORDER, UPDATED, ZOOM } from "@/lib/ai-map";

const TOPIC_COUNT = TOPIC_ORDER.length;

const SHARE_TITLE = "แผนที่ AI Engineering — watcharin-service";
const SHARE_DESCRIPTION = `${TOPIC_COUNT} คำที่คนทำ AI ต้องรู้ กดดูทีละหัวข้อ ว่าคืออะไร เชื่อมกันยังไง ใช้ทำอะไร และข้อดีข้อเสีย`;

/**
 * ⚠️ ต้องใส่ images เอง — พอหน้านี้ประกาศ openGraph / twitter ของตัวเอง
 * Next จะเขียนทับของ layout ทั้งก้อน รูปแชร์จาก app/opengraph-image.tsx จึงหายไปด้วย
 * (หน้าที่ไม่ได้ประกาศ openGraph เอง เช่น /studio ยังได้รูปนั้นตามปกติ)
 */
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "watcharin-service",
};

export const metadata: Metadata = {
  title: "แผนที่ AI Engineering",
  description: `${TOPIC_COUNT} คำที่คนทำ AI ต้องรู้ — Harness, Context / Loop / Graph Engineering, MCP, RAG 2.0, Agentic AI, Guardrails, Evals และอื่น ๆ แต่ละคำคืออะไร เชื่อมกันยังไง ใช้ทำอะไร ข้อดีข้อเสีย กดดูทีละหัวข้อได้`,
  alternates: { canonical: "/ai-map" },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    url: "/ai-map",
    siteName: "watcharin-service",
    type: "article",
    locale: "th_TH",
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

/**
 * /ai-map — แผนที่คำศัพท์ AI Engineering ไว้ทบทวน
 *
 * ใช้ธีมเดียวกับหน้าแรก (theme-soft) เพราะเป็นหน้าอ่านของหน้าร้าน ไม่ใช่ตัวแอปข้างใน
 * และตั้งใจให้เบา — ไม่มีฉาก WebGL ไม่มีไลบรารีเพิ่ม เพราะคนที่เปิดหน้าแบบนี้
 * ส่วนใหญ่คือคนที่กำลังเรียน ซึ่งมักเปิดจากมือถือ
 *
 * มีแค่แผนที่ (AiMap) กับป้ายหัวข้อ (TopicLink) ที่ต้องเป็น client
 * ส่วนอื่นเรนเดอร์บนเซิร์ฟเวอร์ทั้งหมด เนื้อหาจึงอยู่ใน HTML ตั้งแต่แรกให้ search engine อ่านได้
 */

/** สีของชั้นซ้อน ไล่จากนอกเข้าใน — ใช้สีของชั้นบนแผนที่ที่คำนั้นอยู่ */
const NEST_LOOK = [
  "border-violet-200 bg-violet-50/70",
  "border-amber-200 bg-amber-50/80",
  "border-brand-200 bg-brand-50/70",
  "border-brand-300 bg-brand-100/60",
  "border-line bg-surface-raised",
];

export default function AiMapPage() {
  return (
    <div className="theme-soft min-h-screen bg-surface text-ink">
      <HomeNav />

      <main id="main-content">
        {/* ---------- เปิดหน้า ---------- */}
        <section className="relative overflow-hidden bg-gradient-to-b from-surface-overlay to-surface">
          <div className="pointer-events-none absolute -left-28 -top-20 size-80 rounded-full bg-brand-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-16 size-64 rounded-full bg-sky-100/70 blur-3xl" />

          <div className="relative mx-auto max-w-6xl px-5 py-12 sm:py-16">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <span className="mb-5 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold tracking-wide text-brand-700">
                  แผนที่ความรู้ · อัปเดต {UPDATED}
                </span>

                <h1 className="text-[2.3rem] font-black leading-[1.08] tracking-tighter text-balance sm:text-5xl">
                  แผนที่ <span className="text-brand-600">AI Engineering</span>
                </h1>

                <p className="mt-5 max-w-[46ch] text-[1.05rem] text-ink-muted">
                  {TOPIC_COUNT} คำที่คนทำ AI ต้องรู้ แต่ละคำคืออะไร เชื่อมกันยังไง ใช้ทำอะไร
                  มีข้อดีข้อเสียแบบไหน และมีอะไรใหม่ล่าสุด พร้อมลิงก์แหล่งอ้างอิงทุกหัวข้อ —
                  กดที่คำไหนก็ได้เพื่อดูรายละเอียด แล้วติ๊กไว้ว่าทบทวนแล้ว
                </p>

                {/* จอเล็กไม่มีการ์ดภาพรวมทางขวา สูตรหลักจึงต้องอยู่ตรงนี้ด้วย */}
                <p className="mt-5 rounded-2xl border border-line bg-surface-raised px-4 py-3 text-[0.93rem] text-ink-muted lg:hidden">
                  <span className="font-mono font-black text-ink">Agent = Model + Harness</span>
                  <br />
                  โมเดลคือสมอง ส่วนคำอื่นเกือบทั้งหมดคือสิ่งที่สร้างล้อมสมองไว้
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <a
                    href="#layers"
                    className="rounded-full bg-brand-600 px-6 py-3 font-bold text-white shadow-md shadow-brand-600/25 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
                  >
                    เปิดแผนที่
                  </a>
                  <a
                    href="#roadmap"
                    className="rounded-full bg-surface-raised px-6 py-3 font-bold text-ink shadow-sm transition-transform duration-300 hover:-translate-y-0.5 hover:text-brand-700 motion-reduce:transform-none"
                  >
                    เริ่มเรียนตรงไหนดี
                  </a>
                </div>
              </div>

              {/* การ์ดภาพรวม 5 ชั้น — แต่ละแถวพาไปที่ชั้นนั้นบนแผนที่ */}
              <div className="hidden rounded-3xl border border-line bg-surface-raised p-5 shadow-sm lg:block">
                <p className="text-[0.8rem] font-bold tracking-wide text-ink-faint">ภาพรวม 5 ชั้น</p>
                <ol className="mt-3 grid gap-1">
                  {LAYERS.map((layer) => {
                    const count = layer.rows.reduce((n, r) => n + r.topics.length, 0);
                    return (
                      <li key={layer.id}>
                        <a
                          href={`#layer-${layer.id}`}
                          className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-surface"
                        >
                          <span
                            className={`grid size-8 flex-none place-items-center rounded-lg font-mono font-black ${TONE[layer.id].num}`}
                          >
                            {layer.no}
                          </span>
                          <span className="font-bold">{layer.name}</span>
                          <span className="truncate text-[0.88rem] text-ink-muted">{layer.th}</span>
                          <span className="ml-auto flex-none text-[0.78rem] text-ink-faint">
                            {count} หัวข้อ
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 rounded-2xl bg-brand-50 px-4 py-3">
                  <p className="font-mono text-[1.05rem] font-black text-brand-800">
                    Agent = Model + Harness
                  </p>
                  <p className="mt-1 text-[0.88rem] text-ink-muted">
                    ชั้น 1 คือสมอง ชั้น 2 คือทุกอย่างรอบสมองที่ทำให้มันลงมือทำงานได้
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <AiMap />

        {/* ---------- 5 คำ Engineering ---------- */}
        <section id="zoom" className="bg-surface-raised py-14 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <span className="mb-3 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
                5 คำ Engineering ที่ฮิตต่อกันมา
              </span>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-3xl">
                Prompt → Context → Harness → Loop → <span className="text-brand-600">Graph</span>
              </h2>
              <p className="mt-3 max-w-[50ch] text-[0.98rem] leading-relaxed text-ink-muted">
                ไม่ได้มาแทนกัน แต่ซ้อนกันเป็นชั้น — Graph ประกอบด้วยหลาย Loop แต่ละ Loop
                สั่งงาน agent ที่ทำงานอยู่ใน Harness, Harness จัดการ Context และ Context
                ถูกประกอบเป็น Prompt ส่งเข้าโมเดล
              </p>
              <p className="mt-3 max-w-[50ch] text-[0.88rem] text-ink-faint">
                ช่วงที่แต่ละคำฮิต: prompt 2022–24 → context 2025 → harness ปลายปี 2025 ถึงต้นปี
                2026 → loop มิ.ย. 2026 → graph ก.ค. 2026 (คำหลังสุดยังเป็นป้ายชื่อใหม่ที่ถกเถียงกันอยู่)
              </p>
            </div>

            <Nest level={0} />
          </div>
        </section>

        {/* ---------- ตามคำถามหนึ่งข้อ ---------- */}
        <section id="flow" className="bg-surface py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
                เห็นทุกตัวทำงานพร้อมกัน
              </span>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-3xl">
                ลูกค้าถามหนึ่งประโยค <span className="text-brand-600">ผ่านอะไรบ้าง</span>
              </h2>
              <p className="mt-2.5 text-[0.98rem] text-ink-muted">
                ตามคำถามเดียววิ่งผ่านทุกชั้นของแผนที่ กดชื่อหัวข้อเพื่อเปิดรายละเอียด
              </p>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
              <div className="lg:sticky lg:top-24">
                <p className="text-[0.8rem] font-bold tracking-wide text-ink-faint">ลูกค้าพิมพ์มาว่า</p>
                <p className="mt-2 inline-block rounded-3xl rounded-tl-md bg-brand-600 px-5 py-3.5 text-[1.05rem] font-semibold text-white shadow-md shadow-brand-600/20">
                  {FLOW.question}
                </p>
              </div>

              <ol className="relative ml-3.5 border-l-2 border-line">
                {FLOW.steps.map((step, i) => (
                  <li key={i} className="relative pb-4 pl-7 last:pb-0">
                    <span className="absolute -left-[15px] top-3 grid size-7 place-items-center rounded-full bg-surface-raised text-[0.78rem] font-black text-brand-700 ring-2 ring-brand-200">
                      {i + 1}
                    </span>
                    <div className="rounded-2xl border border-line bg-surface-raised p-4 shadow-sm">
                      <p className="text-[0.95rem] leading-relaxed">
                        <RichText text={step.text} />
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {step.topics.map((id) => (
                          <TopicLink key={id} id={id} />
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-8 max-w-[60ch] rounded-2xl bg-brand-50 px-5 py-4 text-[0.95rem] text-brand-900 lg:ml-auto">
              {FLOW.outro}
            </p>
          </div>
        </section>

        {/* ---------- ลำดับการเรียน ---------- */}
        <section id="roadmap" className="bg-surface-raised py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
                ลำดับที่แนะนำ
              </span>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-3xl">
                เริ่มเรียน<span className="text-brand-600">ตรงไหนดี</span>
              </h2>
              <p className="mt-2.5 text-[0.98rem] text-ink-muted">
                เรียงจากสิ่งที่ได้ใช้บ่อยและเห็นผลเร็ว ไปจนถึงสิ่งที่ควรทำเมื่อจำเป็นจริง ๆ
              </p>
            </div>

            <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ROADMAP.map((step, i) => (
                <li key={step.title} className="rounded-3xl border border-line bg-surface p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 flex-none place-items-center rounded-xl bg-brand-100 font-mono text-[0.9rem] font-black text-brand-700">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="pt-1 text-[1.02rem] font-bold leading-snug tracking-tight">
                      {step.title}
                    </h3>
                  </div>
                  <p className="mt-2.5 text-[0.93rem] text-ink-muted">{step.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {step.topics.map((id) => (
                      <TopicLink key={id} id={id} />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- ที่ควรรู้ต่อ ---------- */}
        <section id="more" className="bg-surface py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <span className="mb-3 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
                And more…
              </span>
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-3xl">
                คำที่ควรรู้ต่อ
              </h2>
              <p className="mt-2.5 text-[0.98rem] text-ink-muted">
                ไม่ได้อยู่บนแผนที่ แต่จะเจอบ่อยเมื่อลงมือทำจริง
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {MORE.map((item) => (
                <li key={item.name} className="rounded-2xl border border-line bg-surface-raised p-4">
                  <p className="font-bold tracking-tight">{item.name}</p>
                  <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-muted">
                    <RichText text={item.desc} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- แหล่งอ้างอิง + คุยต่อ ---------- */}
        <section id="sources" className="bg-surface-overlay py-14 sm:py-16">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-[1.25fr_0.75fr] md:items-start">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">แหล่งอ้างอิง</h2>
              <p className="mt-1.5 text-[0.9rem] text-ink-muted">
                แหล่งหลักของทั้งหน้า — แต่ละหัวข้อบนแผนที่มีลิงก์ “อ่านต่อ” ของตัวเองด้วย ข้อมูล ณ{" "}
                {UPDATED} วงการนี้เปลี่ยนเร็ว ก่อนตัดสินใจเรื่องใหญ่ให้เช็กเอกสารล่าสุดอีกครั้ง
              </p>
              <ul className="mt-4 grid gap-2 text-[0.92rem]">
                {SOURCES.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      {s.label} <span aria-hidden="true">↗</span>
                      <span className="sr-only">(เปิดแท็บใหม่)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-line bg-surface-raised p-6 shadow-sm">
              <p className="text-[1.15rem] font-extrabold leading-snug tracking-tight">
                อยากเอา AI ไปใช้กับระบบจริง?
              </p>
              <p className="mt-2 text-[0.95rem] text-ink-muted">
                เล่ามาสั้น ๆ ว่าอยากให้ AI ช่วยงานตรงไหน เดี๋ยวช่วยดูว่าควรเริ่มจากชั้นไหนของแผนที่
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                <Link
                  href="/start"
                  className="rounded-full bg-brand-600 px-5 py-2.5 text-[0.92rem] font-bold text-white shadow-sm shadow-brand-600/25 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
                >
                  เล่าโปรเจกต์ให้ฟัง
                </Link>
                <Link
                  href="/#talk"
                  className="text-[0.9rem] font-semibold text-ink-muted transition-colors hover:text-brand-700"
                >
                  หรือทักมาถามเฉย ๆ
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

/**
 * กล่องซ้อนกัน Graph ⊃ Loop ⊃ Harness ⊃ Context ⊃ Prompt
 * วาดเป็นกล่องในกล่องจริง ๆ เพราะประเด็นทั้งหมดคือ “ซ้อนกัน ไม่ได้มาแทนกัน”
 * ถ้าวาดเป็นเส้นเวลาเรียงต่อกัน จะอ่านได้ว่าคำหลังมาแทนคำก่อน
 */
function Nest({ level }: { level: number }) {
  const item = ZOOM[level];
  const inner = level + 1 < ZOOM.length;

  return (
    <div className={`rounded-2xl border p-3 sm:p-4 ${NEST_LOOK[level]}`}>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        {item.topic ? (
          <TopicLink
            id={item.topic}
            className="font-extrabold tracking-tight text-ink underline decoration-line-strong decoration-2 underline-offset-4 transition-colors hover:text-brand-700 hover:decoration-brand-400"
          >
            {item.name}
          </TopicLink>
        ) : (
          <span className="font-extrabold tracking-tight">{item.name}</span>
        )}
        <span className="text-[0.76rem] text-ink-faint">{item.era}</span>
      </div>
      <p className="text-[0.86rem] text-ink-muted">{item.says}</p>
      {inner && (
        <div className="mt-3">
          <Nest level={level + 1} />
        </div>
      )}
    </div>
  );
}
