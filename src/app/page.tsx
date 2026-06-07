import Image from "next/image";
import { EcosystemGrid } from "@/components/EcosystemGrid";
import { ScrollFader } from "@/components/ScrollFader";

export default function Home() {
  return (
    <>
      {/* ========== NAV ========== */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2.5 font-bold text-base">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
            <span>Watcharin <span className="text-brand-600">Service</span></span>
          </a>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#home" className="hover:text-slate-900 transition">Home</a>
            <a href="#about" className="hover:text-slate-900 transition">About</a>
            <a href="#services" className="hover:text-slate-900 transition">Services</a>
            <a href="#work" className="hover:text-slate-900 transition">Work</a>
            <a href="#resume" className="hover:text-slate-900 transition">Resume</a>
          </div>
          <a href="#contact" className="gradient-btn text-white text-sm font-semibold px-5 py-2.5 rounded-full">
            Contact →
          </a>
        </div>
      </nav>

      {/* ========== HERO ========== */}
      <section id="home" className="gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 grain opacity-60" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-brand-200 text-brand-700 text-sm font-medium mb-6 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 pulse-dot" />
                System Design Studio
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight mb-6">
                วางระบบธุรกิจ<br />ครบวงจร<br />
                <span className="gradient-text">จากแนวคิด สู่ระบบจริง</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-lg">
                รับออกแบบและพัฒนาระบบ <strong className="text-slate-900">Web และ Mobile</strong> สำหรับ <strong className="text-slate-900">ธุรกิจและอุตสาหกรรม</strong> โดย Software Architect ที่ผ่านงานองค์กรใหญ่
              </p>
              <div className="flex flex-wrap gap-4 mb-12">
                <a href="#contact" className="gradient-btn text-white font-semibold px-7 py-3.5 rounded-full text-base">ปรึกษาโปรเจค →</a>
                <a href="#work" className="bg-white border border-slate-200 text-slate-900 font-semibold px-7 py-3.5 rounded-full hover:bg-slate-50 hover:border-slate-300 transition text-base">ดูผลงานของเรา</a>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div>
                  <div className="font-extrabold text-3xl text-slate-900">5+</div>
                  <div className="text-slate-500 mt-1">ระบบใน Ecosystem</div>
                </div>
                <div className="w-px h-12 bg-slate-200" />
                <div>
                  <div className="font-extrabold text-3xl gradient-text">AI-First</div>
                  <div className="text-slate-500 mt-1">Approach</div>
                </div>
                <div className="w-px h-12 bg-slate-200 hidden sm:block" />
                <div className="hidden sm:block">
                  <div className="font-extrabold text-3xl text-slate-900">End-to-End</div>
                  <div className="text-slate-500 mt-1">Solution</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 bg-gradient-to-tr from-brand-400 via-cyan-400 to-brand-300 rounded-3xl blur-3xl opacity-20" />
              <div className="relative bg-gradient-to-tr from-brand-100 to-cyan-100 rounded-3xl p-2 ring-glow">
                <Image src="/watcharin-profile.png" alt="Watcharin Kurain" width={600} height={800} priority className="w-full rounded-2xl shadow-2xl" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-slate-100">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-2xl">🚀</div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Building the future</div>
                  <div className="text-xs text-slate-500">with AI-powered systems</div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-4 py-3 border border-slate-100">
                <div className="text-xs text-slate-500 mb-0.5">Founder & Lead Engineer</div>
                <div className="font-bold text-slate-900 text-sm">Watcharin Kurain</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SERVICES ========== */}
      <section id="services" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-4">What I Build</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">บริการของเรา</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">ออกแบบและสร้างระบบครบวงจร — ตั้งแต่แนวคิดไปจนถึงระบบใช้งานจริง</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🌐", title: "Web Systems", desc: "ระบบ Web Application สำหรับธุรกิจทุกขนาด ใช้ Next.js + TypeScript", grad: "from-brand-500 to-brand-600", shadow: "shadow-brand-500/30" },
              { icon: "📱", title: "Mobile Apps", desc: "แอพบน iOS และ Android ใช้ React Native / Expo", grad: "from-cyan-500 to-cyan-600", shadow: "shadow-cyan-500/30" },
              { icon: "🤖", title: "AI Integration", desc: "เชื่อม AI Agent เข้ากับระบบ — Claude, OpenAI, custom models", grad: "from-purple-500 to-purple-600", shadow: "shadow-purple-500/30" },
              { icon: "🏭", title: "Industrial Solutions", desc: "ระบบสำหรับโรงงาน อุตสาหกรรม การจัดการการผลิต", grad: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/30" },
            ].map((s) => (
              <div key={s.title} className="card-hover scroll-fade bg-white border border-slate-200 rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-2xl mb-5 shadow-lg ${s.shadow}`}>{s.icon}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURED WORK ========== */}
      <section id="work" className="py-20 md:py-28 bg-gradient-to-br from-slate-50 via-brand-50/30 to-cyan-50/20 relative overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-brand-200 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-200 rounded-full blur-3xl opacity-20" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-white border border-brand-200 text-brand-700 text-sm font-medium mb-4 shadow-sm">Featured Work</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Watcharin <span className="gradient-text">Ecosystem</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">5 ระบบที่เชื่อมโยงกันเป็น value chain ครบวงจร — ตั้งแต่รวมคน วิจัย ผลิต ขาย ไปจนถึงจัดการองค์กร</p>
            <p className="text-sm text-slate-500 mt-4">💡 คลิกที่การ์ดเพื่อดูรายละเอียด</p>
          </div>
          <EcosystemGrid />
        </div>
      </section>

      {/* ========== WHY ========== */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-4">Why Watcharin</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              ทำไมต้อง <span className="gradient-text">Watcharin Service</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">เราต่างจาก dev ทั่วไปอย่างไร — มาดูกัน</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              ["End-to-End", "จากแนวคิดถึง production — ไม่ทิ้งกลางทาง"],
              ["AI-First", "ผสาน AI ในทุกระบบ ไม่ใช่แค่ตัวเสริม"],
              ["Business+", "เข้าใจธุรกิจ ไม่ใช่แค่เขียนโค้ด"],
              ["Modern", "ใช้ stack ที่ทันสมัย scale ได้"],
            ].map(([title, desc]) => (
              <div key={title} className="bg-gradient-to-br from-brand-50 to-white border border-brand-100 rounded-2xl p-6 card-hover scroll-fade">
                <div className="text-4xl font-extrabold gradient-text mb-2">{title}</div>
                <p className="text-slate-600 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ABOUT ========== */}
      <section id="about" className="py-20 md:py-28 bg-gradient-to-br from-white via-brand-50/40 to-cyan-50/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-white border border-brand-200 text-brand-700 text-sm font-medium mb-4 shadow-sm">About</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">เรื่องราวของเรา</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">รู้จัก Watcharin ผู้อยู่เบื้องหลังทุกระบบ</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 items-start">
            <div className="scroll-fade">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-slate-200">
                <Image src="/watcharin-profile.png" alt="Watcharin" width={600} height={800} className="w-full" />
              </div>
              <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-sm shadow-sm">
                <div className="flex justify-between"><span className="text-slate-500">ชื่อ</span><span className="font-semibold">Watcharin Kurain</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ตำแหน่ง</span><span className="font-semibold">Founder & Engineer</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ประสบการณ์</span><span className="font-semibold">4+ ปี</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ภาษา</span><span className="font-semibold">ไทย, English</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">Email</span><span className="font-semibold text-brand-600 text-xs">watcharin@<br />watcharin-service.com</span></div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-10 scroll-fade">
              <div>
                <div className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-3">My Story</div>
                <h3 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
                  จาก <span className="gradient-text">Developer</span> สู่ <span className="gradient-text">Architect</span>
                </h3>
                <div className="space-y-4 text-slate-600 leading-relaxed text-base">
                  <p>ผมจบการศึกษาจาก <strong className="text-slate-900">มหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร</strong> สาขา <strong className="text-slate-900">วิศวกรรมคอมพิวเตอร์</strong> ในปี 2561 — ที่นั่นเป็นจุดเริ่มต้นของความหลงใหลในการสร้างระบบ ตั้งแต่บรรทัดแรกของโค้ดจนถึงการเข้าใจสถาปัตยกรรมระดับองค์กร</p>
                  <p>ตลอด <strong className="text-slate-900">4 ปีในวงการ</strong> ผมเดินผ่านหลายระดับของการพัฒนา — เริ่มจาก <strong className="text-slate-900">Application & System Developer</strong> ที่เถ้าแก่น้อย พัฒนาทั้ง web และ mobile application แบบ full-stack ก่อนขยับเป็น <strong className="text-slate-900">Software Engineer</strong> ที่ MFEC รับผิดชอบโปรเจค ServiceNow ระดับองค์กร และเลื่อนสู่ <strong className="text-slate-900">Software Architect</strong> ที่ PTT Digital Solutions ออกแบบโครงสร้างระบบสำหรับองค์กรขนาดใหญ่</p>
                  <p>ปัจจุบันผมกำลังสร้าง <strong className="text-slate-900">Watcharin Ecosystem</strong> — ระบบนิเวศธุรกิจ 5 ระบบที่เชื่อมกันเป็น value chain ครบวงจร พร้อมเปิดรับเป็น <strong className="text-brand-600">dev partner</strong> สำหรับธุรกิจที่ต้องการระบบเป็นของตัวเอง ผมเชื่อว่า AI จะเปลี่ยนวิธีที่เราออกแบบและใช้งานระบบ และผมอยากเป็นส่วนหนึ่งของการเปลี่ยนแปลงนั้น</p>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-brand-600 uppercase tracking-wide mb-4">What I Believe In</div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    ["🎯", "End-to-End", "รับผิดชอบตั้งแต่ idea ถึง production"],
                    ["🤖", "AI-Native", "AI ไม่ใช่ส่วนเสริม แต่เป็นแกนหลัก"],
                    ["💡", "Business First", "โค้ดดีไม่พอ — ต้องสร้างคุณค่าทางธุรกิจ"],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="bg-white border border-slate-200 rounded-xl p-5 card-hover">
                      <div className="text-3xl mb-3">{icon}</div>
                      <div className="font-bold mb-2 text-slate-900">{title}</div>
                      <div className="text-sm text-slate-600">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500 text-white rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="text-sm font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white pulse-dot" />
                    Currently Building
                  </div>
                  <p className="text-xl md:text-2xl font-bold leading-tight">Watcharin Ecosystem — 5 ระบบธุรกิจ ที่เชื่อมกันเป็น value chain ขับเคลื่อนด้วย AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== RESUME ========== */}
      <section id="resume" className="py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-4">Resume</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">ประวัติและทักษะ</h2>
            <a href="#" className="inline-flex items-center gap-2 text-brand-600 font-semibold hover:gap-3 transition-all">📄 Download PDF Resume →</a>
          </div>

          <div className="mb-16 scroll-fade">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">💼 Experience</h3>
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4 card-hover relative">
                <span className="absolute top-4 right-4 text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-1 rounded-full border border-brand-200">LATEST</span>
                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-2xl flex-shrink-0">🏛️</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1 pr-20">
                    <h4 className="font-bold text-lg">Software Architect</h4>
                    <span className="text-sm text-slate-500">Aug 2025 – May 2026</span>
                  </div>
                  <div className="text-brand-600 font-medium mb-2">PTT Digital Solutions Co., Ltd.</div>
                  <p className="text-slate-600 text-sm leading-relaxed">ออกแบบสถาปัตยกรรมระบบสำหรับองค์กรขนาดใหญ่ในกลุ่ม PTT เน้นการเชื่อมต่อระบบ (system integration) และวางโครงสร้างที่ scale ได้ในระยะยาว</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4 card-hover">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-2xl flex-shrink-0">🏢</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1">
                    <h4 className="font-bold text-lg">Software Engineer</h4>
                    <span className="text-sm text-slate-500">Jul 2023 – Sep 2025</span>
                  </div>
                  <div className="text-cyan-600 font-medium mb-2">MFEC Public Company Limited</div>
                  <p className="text-slate-600 text-sm leading-relaxed">พัฒนาโปรเจค ServiceNow แบบ end-to-end ครอบคลุม <strong>ITSM</strong> และ <strong>CRM</strong> พัฒนา API ด้วย Python สำหรับดึงข้อมูลส่งเข้า ServiceNow ตั้งค่า Mid Server วาง path การดึงข้อมูล รวมถึงงาน Opentext ITSM</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4 card-hover">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">🍙</div>
                <div className="flex-1">
                  <div className="flex flex-wrap justify-between gap-2 mb-1">
                    <h4 className="font-bold text-lg">Application & System Developer</h4>
                    <span className="text-sm text-slate-500">Jul 2022 – Mar 2023</span>
                  </div>
                  <div className="text-amber-600 font-medium mb-2">Taokaenoi Food & Marketing Public Co., Ltd.</div>
                  <p className="text-slate-600 text-sm leading-relaxed">พัฒนา full-stack web application — frontend ด้วย <strong>ASP.NET (C#)</strong> backend API ด้วย <strong>C#</strong> + Microsoft SQL Server พัฒนา Mobile App ด้วย <strong>Kotlin</strong> และสร้าง Dashboard วิเคราะห์ข้อมูลด้วย <strong>Tableau</strong></p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16 scroll-fade">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">🎓 Education</h3>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex gap-4 card-hover">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center text-2xl flex-shrink-0">🏫</div>
              <div className="flex-1">
                <div className="flex flex-wrap justify-between gap-2 mb-1">
                  <h4 className="font-bold text-lg">ปริญญาตรี วิศวกรรมคอมพิวเตอร์</h4>
                  <span className="text-sm text-slate-500">จบปี 2561 (2018)</span>
                </div>
                <div className="text-brand-600 font-medium">มหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร</div>
                <div className="text-sm text-slate-500 mt-1">Rajamangala University of Technology Phra Nakhon (RMUTP)</div>
              </div>
            </div>
          </div>

          <div className="scroll-fade">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">⚡ Skills & Tech Stack</h3>
            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { title: "🎨 Frontend / Web", color: "brand", skills: ["React", "Next.js", "TypeScript", "ASP.NET", "Tailwind CSS", "HTML / CSS", "JavaScript"] },
                { title: "⚙️ Backend / API", color: "cyan", skills: ["C#", "Python", "Node.js", "REST API", "Microsoft SQL Server"] },
                { title: "📱 Mobile", color: "purple", skills: ["Kotlin (Android)", "Swift (iOS)", "Flutter", "React Native"] },
                { title: "🛠️ Enterprise / Tools", color: "orange", skills: ["ServiceNow (ITSM, CRM)", "Opentext ITSM", "Tableau", "Docker", "GitHub", "AWS", "Cloudflare"] },
              ].map((cat) => (
                <div key={cat.title} className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="font-bold mb-4 text-slate-900 flex items-center gap-2">{cat.title}</div>
                  <div className="flex flex-wrap gap-2">
                    {cat.skills.map((s) => (
                      <span key={s} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${
                        cat.color === "brand" ? "bg-brand-50 text-brand-700 border-brand-200" :
                        cat.color === "cyan" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                        cat.color === "purple" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-orange-50 text-orange-700 border-orange-200"
                      }`}>{s}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section id="contact" className="py-20 md:py-32 bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-brand-200 text-sm font-medium mb-6">Let&apos;s work together</div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            พร้อมเริ่ม<br />
            <span className="bg-gradient-to-r from-brand-300 via-cyan-300 to-brand-200 bg-clip-text text-transparent">โปรเจคของคุณ?</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">ปรึกษาฟรี ไม่มีค่าใช้จ่าย คุยเรื่อง requirement งบประมาณ และไอเดียก่อนตัดสินใจ</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="mailto:watcharin@watcharin-service.com" className="bg-white text-slate-900 font-semibold px-8 py-4 rounded-full hover:shadow-2xl transition text-base inline-flex items-center gap-2">
              <span>📧</span> watcharin@watcharin-service.com
            </a>
            <a href="#" className="border border-white/30 backdrop-blur text-white font-semibold px-8 py-4 rounded-full hover:bg-white/10 transition text-base">LINE Official</a>
          </div>
          <p className="text-sm text-slate-400 mt-10 flex items-center gap-2 justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-400 pulse-dot" />
            ปกติตอบกลับใน 24 ชั่วโมง
          </p>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
              <span>Watcharin <span className="text-brand-600">Service</span></span>
              <span className="text-slate-400 font-normal text-sm ml-2 hidden sm:inline">— วางระบบธุรกิจครบวงจร</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <a href="#about" className="hover:text-slate-900">About</a>
              <a href="#services" className="hover:text-slate-900">Services</a>
              <a href="#work" className="hover:text-slate-900">Work</a>
              <a href="#resume" className="hover:text-slate-900">Resume</a>
              <a href="#contact" className="hover:text-slate-900">Contact</a>
            </div>
            <div className="text-sm text-slate-500">© 2026 Watcharin Service</div>
          </div>
        </div>
      </footer>

      <ScrollFader />
    </>
  );
}
