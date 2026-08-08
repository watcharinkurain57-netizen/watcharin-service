import { getResume } from "@/lib/resume-data";

/* RESUME */
export function Resume() {
  return (
<section id="resume" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-sm font-medium mb-4">Resume</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">ประวัติและทักษะ</h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="/resume/en"
                className="inline-flex items-center gap-2 bg-surface-raised border border-line text-ink font-semibold px-5 py-2.5 rounded-full hover:border-brand-400/50 hover:text-brand-400 transition"
              >
                📄 Resume (EN)
              </a>
              <a
                href="/resume/th"
                className="inline-flex items-center gap-2 bg-surface-raised border border-line text-ink font-semibold px-5 py-2.5 rounded-full hover:border-brand-400/50 hover:text-brand-400 transition"
              >
                📄 เรซูเม่ (ไทย)
              </a>
            </div>
          </div>

          <div className="mb-16 scroll-fade">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">✨ จุดเด่น</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {getResume("th").highlights.map((h) => (
                <div key={h} className="bg-surface-raised border border-line rounded-2xl p-5 flex items-start gap-3 card-hover">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0 text-lg">✓</span>
                  <p className="text-ink text-sm leading-relaxed">{h}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-16 scroll-fade">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">💼 Experience</h3>
            <div className="space-y-4">
              <div className="bg-surface-raised border border-emerald-500/30 rounded-2xl p-6 flex gap-4 card-hover relative ring-1 ring-emerald-500/20">
                <span className="absolute top-4 right-4 text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/30 inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />NOW</span>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-2xl flex-shrink-0">🚀</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1 pr-20">
                    <h4 className="font-bold text-lg">Founder &amp; Software Architect</h4>
                    <span className="text-sm text-ink-faint">มิ.ย. 2026 – ปัจจุบัน</span>
                  </div>
                  <div className="text-emerald-600 font-medium mb-2">Watcharin Ecosystem</div>
                  <p className="text-ink-muted text-sm leading-relaxed">ส่งระบบขึ้น production จริงแล้ว <strong>3 ระบบ</strong>แบบ end-to-end — <strong>watcharin-service.com</strong>, <strong>tang-tee.com</strong> และ <strong>x-tier.pro</strong> รับผิดชอบตั้งแต่ออกแบบ พัฒนา deploy จนถึงดูแลใช้งานจริง บน Next.js + Supabase (Postgres/RLS) + Vercel พร้อม AI (Claude) และออกแบบให้สอดคล้อง PDPA</p>
                </div>
              </div>
              <div className="bg-surface-raised border border-line rounded-2xl p-6 flex gap-4 card-hover relative">
                <span className="absolute top-4 right-4 text-xs font-semibold text-brand-300 bg-brand-500/10 px-2 py-1 rounded-full border border-brand-500/30">ORG</span>
                <div className="w-12 h-12 rounded-xl bg-brand-500/15 flex items-center justify-center text-2xl flex-shrink-0">🏛️</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1 pr-20">
                    <h4 className="font-bold text-lg">Software Architect</h4>
                    <span className="text-sm text-ink-faint">Aug 2025 – May 2026</span>
                  </div>
                  <div className="text-brand-400 font-medium mb-2">PTT Digital Solutions Co., Ltd.</div>
                  <p className="text-ink-muted text-sm leading-relaxed">ออกแบบสถาปัตยกรรมระบบสำหรับองค์กรขนาดใหญ่ในกลุ่ม PTT เน้นการเชื่อมต่อระบบ (system integration) และวางโครงสร้างที่ scale ได้ในระยะยาว</p>
                </div>
              </div>
              <div className="bg-surface-raised border border-line rounded-2xl p-6 flex gap-4 card-hover">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center text-2xl flex-shrink-0">🏢</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1">
                    <h4 className="font-bold text-lg">Software Engineer</h4>
                    <span className="text-sm text-ink-faint">Jul 2023 – Sep 2025</span>
                  </div>
                  <div className="text-cyan-400 font-medium mb-2">MFEC Public Company Limited</div>
                  <p className="text-ink-muted text-sm leading-relaxed">พัฒนาโปรเจค ServiceNow แบบ end-to-end ครอบคลุม <strong>ITSM</strong> และ <strong>CRM</strong> พัฒนา API ด้วย Python สำหรับดึงข้อมูลส่งเข้า ServiceNow ตั้งค่า Mid Server วาง path การดึงข้อมูล รวมถึงงาน Opentext ITSM</p>
                </div>
              </div>
              <div className="bg-surface-raised border border-line rounded-2xl p-6 flex gap-4 card-hover">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-2xl flex-shrink-0">🍙</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1">
                    <h4 className="font-bold text-lg">Application & System Developer</h4>
                    <span className="text-sm text-ink-faint">Jul 2022 – Mar 2023</span>
                  </div>
                  <div className="text-amber-400 font-medium mb-2">Taokaenoi Food & Marketing Public Co., Ltd.</div>
                  <p className="text-ink-muted text-sm leading-relaxed">พัฒนา full-stack web application — frontend ด้วย <strong>ASP.NET (C#)</strong> backend API ด้วย <strong>C#</strong> + Microsoft SQL Server พัฒนา Mobile App ด้วย <strong>Kotlin</strong> และสร้าง Dashboard วิเคราะห์ข้อมูลด้วย <strong>Tableau</strong></p>
                </div>
              </div>
            </div>
          </div>

          {/* Education + skills are already covered in full on /resume/th and
              /resume/en, so they collapse here. Native <details> keeps the text
              in the DOM, so nothing is lost for SEO. */}
          <details className="group scroll-fade">
            <summary className="mb-8 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-raised px-5 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-brand-400/50 hover:text-brand-300">
                🎓 การศึกษา และ ⚡ ทักษะทั้งหมด
                <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>

          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">🎓 Education</h3>
            <div className="bg-surface-raised border border-line rounded-2xl p-6 flex gap-4 card-hover">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/15 flex items-center justify-center text-2xl flex-shrink-0">🏫</div>
              <div className="flex-1">
                <div className="flex flex-wrap justify-between gap-2 mb-1">
                  <h4 className="font-bold text-lg">ปริญญาตรี วิศวกรรมคอมพิวเตอร์</h4>
                  <span className="text-sm text-ink-faint">2561 – 2565 (2018 – 2022)</span>
                </div>
                <div className="text-brand-400 font-medium">มหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร</div>
                <div className="text-sm text-ink-faint mt-1">Rajamangala University of Technology Phra Nakhon (RMUTP)</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">⚡ Skills & Tech Stack</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {getResume("en").skills.map((cat, i) => {
                const meta = [
                  { emoji: "🎨", color: "brand" },
                  { emoji: "⚙️", color: "cyan" },
                  { emoji: "📱", color: "purple" },
                  { emoji: "☁️", color: "emerald" },
                  { emoji: "🛠️", color: "orange" },
                ][i % 5];
                return (
                  <div key={cat.category} className="bg-surface-raised border border-line rounded-2xl p-6">
                    <div className="font-bold mb-4 text-ink flex items-center gap-2">{meta.emoji} {cat.category}</div>
                    <div className="flex flex-wrap gap-2">
                      {cat.items.map((s) => (
                        <span key={s} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                          meta.color === "brand" ? "bg-brand-500/10 text-brand-300 border-brand-500/30" :
                          meta.color === "cyan" ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" :
                          meta.color === "purple" ? "bg-purple-500/10 text-purple-300 border-purple-500/30" :
                          meta.color === "emerald" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" :
                          "bg-orange-500/10 text-orange-300 border-orange-500/30"
                        }`}>{s}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </details>
        </div>
      </section>
  );
}
