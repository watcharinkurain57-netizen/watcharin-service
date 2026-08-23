import Image from "next/image";

/* HERO */
export function Hero() {
  return (
<section id="home" className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 grain opacity-60" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-brand-500/30 text-brand-300 text-sm font-medium shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 pulse-dot" />
                  System Design Studio
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
                  เปิดรับ 1–2 โปรเจกต์/เดือน
                </div>
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
                วางระบบธุรกิจ<br />ครบวงจร<br />
                <span className="gradient-text">จากแนวคิด สู่ระบบจริง</span>
              </h1>
              <p className="text-lg md:text-xl text-ink-muted mb-8 leading-relaxed max-w-lg">
                รับออกแบบและพัฒนาระบบ <strong className="text-ink">Web และ Mobile</strong> สำหรับ <strong className="text-ink">ธุรกิจและอุตสาหกรรม</strong> โดย Software Architect ที่ผ่านงานองค์กรใหญ่
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <a href="#contact" className="gradient-btn text-white font-semibold px-7 py-3.5 rounded-full text-base">ปรึกษาโปรเจกต์ →</a>
                <a href="#work" className="bg-surface-raised border border-line text-ink font-semibold px-7 py-3.5 rounded-full hover:bg-surface-overlay hover:border-line-strong transition text-base">ดูผลงานของเรา</a>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <div className="font-extrabold text-3xl text-ink">3</div>
                  <div className="text-ink-faint mt-1">ระบบ Live production</div>
                </div>
                <div className="w-px h-12 bg-line" />
                <div>
                  <div className="font-extrabold text-3xl text-ink">4+</div>
                  <div className="text-ink-faint mt-1">ปีประสบการณ์องค์กร</div>
                </div>
                <div className="w-px h-12 bg-line hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="font-extrabold text-3xl gradient-text">100%</div>
                  <div className="text-ink-faint mt-1">โค้ด/IP เป็นของคุณ</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-tr from-brand-400 via-cyan-400 to-brand-300 rounded-3xl blur-3xl opacity-30" />
              <div className="relative bg-gradient-to-tr from-brand-500/20 to-cyan-500/20 rounded-3xl p-2 ring-glow">
                <Image src="/watcharin-profile.png" alt="Watcharin Kurain" width={600} height={800} priority className="w-full rounded-2xl shadow-2xl" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-surface-raised rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-line">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-2xl">🚀</div>
                <div>
                  <div className="font-bold text-ink text-sm">Building the future</div>
                  <div className="text-xs text-ink-faint">with AI-powered systems</div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-surface-raised rounded-2xl shadow-xl px-4 py-3 border border-line">
                <div className="text-xs text-ink-faint mb-0.5">Founder & Lead Engineer</div>
                <div className="font-bold text-ink text-sm">Watcharin Kurain</div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
