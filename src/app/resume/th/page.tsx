import type { Metadata } from "next";
import Link from "next/link";
import { getResume } from "@/lib/resume-data";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = {
  title: "เรซูเม่ (ภาษาไทย)",
  description: "เรซูเม่ภาษาไทยของ Watcharin Kurain — Software Architect",
  robots: { index: false, follow: false },
};

const r = getResume("th");

export default function ThaiResumePage() {
  const { profile, experience, education, skills, ecosystem, labels } = r;

  return (
    <main
      className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:p-0"
      style={{ fontFamily: "var(--font-ibm-thai), var(--font-inter), sans-serif" }}
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Toolbar (screen only) */}
      <div className="no-print max-w-[210mm] mx-auto mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/#resume" className="text-sm text-slate-500 hover:text-slate-900">
          ← กลับหน้าหลัก
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 hidden sm:inline">
            กดปุ่ม → เลือกปลายทางเป็น “บันทึกเป็น PDF”
          </span>
          <PrintButton className="gradient-btn text-white font-semibold px-6 py-2.5 rounded-full text-sm">
            ⬇ บันทึกเป็น PDF
          </PrintButton>
        </div>
      </div>

      {/* A4 sheet */}
      <article className="sheet bg-white max-w-[210mm] mx-auto shadow-xl rounded-sm px-10 py-10 md:px-14 md:py-12 text-slate-700 leading-relaxed">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between gap-4 border-b-2 border-brand-500 pb-5 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{profile.name}</h1>
            <div className="text-brand-700 font-semibold mt-1">{profile.role}</div>
            <div className="text-sm text-slate-500 mt-0.5">{profile.tagline}</div>
          </div>
          <div className="text-sm text-slate-500 sm:text-right space-y-0.5 shrink-0">
            <div><a href={`mailto:${profile.email}`} className="text-brand-700 hover:underline">{profile.email}</a></div>
            <div><a href={`https://${profile.website}`} className="text-brand-700 hover:underline">{profile.website}</a></div>
            <div><a href={`https://${profile.github}`} className="text-brand-700 hover:underline">{profile.github}</a></div>
            <div><a href={`https://${profile.linkedin}`} className="text-brand-700 hover:underline">{profile.linkedin}</a></div>
            <div>{profile.location}</div>
          </div>
        </header>

        {/* Summary */}
        <Section title={labels.summary}>
          <p className="text-[15px]">{profile.summary}</p>
        </Section>

        {/* Experience */}
        <Section title={labels.experience}>
          <div className="space-y-5">
            {experience.map((job) => (
              <div key={job.company}>
                <div className="flex flex-wrap justify-between gap-x-4">
                  <h3 className="font-bold text-slate-900">{job.role}</h3>
                  <span className="text-sm text-slate-500">{job.period}</span>
                </div>
                <div className="text-brand-700 font-semibold text-sm mb-1.5">{job.company}</div>
                <ul className="space-y-1">
                  {job.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-[14.5px]">
                      <span className="text-brand-500 mt-0.5">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Education */}
        <Section title={labels.education}>
          <div className="flex flex-wrap justify-between gap-x-4">
            <div>
              <div className="font-bold text-slate-900">{education.degree}</div>
              <div className="text-brand-700 text-sm">{education.school}</div>
            </div>
            <span className="text-sm text-slate-500">{education.year}</span>
          </div>
        </Section>

        {/* Skills */}
        <Section title={labels.skills}>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {skills.map((cat) => (
              <div key={cat.category}>
                <div className="font-bold text-slate-900 text-sm mb-2">{cat.category}</div>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Currently Building */}
        <Section title={`${labels.building} — ${ecosystem.name}`}>
          <p className="text-[14.5px] mb-2">{ecosystem.description}</p>
          <ul className="space-y-1">
            {ecosystem.systems.map((sys) => (
              <li key={sys} className="text-sm text-slate-500 pl-3">· {sys}</li>
            ))}
          </ul>
        </Section>

        <footer className="mt-8 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          {profile.name} · {profile.email} · {profile.website}
        </footer>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}
