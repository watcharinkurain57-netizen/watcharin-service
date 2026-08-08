import Image from "next/image";

/* ABOUT */
export function About() {
  return (
<section id="about" className="py-20 md:py-28 bg-gradient-to-br from-surface via-brand-500/[0.07] to-cyan-500/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-surface-raised border border-brand-500/30 text-brand-300 text-sm font-medium mb-4 shadow-sm">About</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">เรื่องราวของเรา</h2>
            <p className="text-ink-muted text-lg max-w-2xl mx-auto">รู้จัก Watcharin ผู้อยู่เบื้องหลังทุกระบบ</p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 items-start">
            <div className="scroll-fade">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-line">
                <Image src="/watcharin-profile.png" alt="Watcharin" width={600} height={800} className="w-full" />
              </div>
              <div className="mt-6 bg-surface-raised border border-line rounded-2xl p-5 space-y-3 text-sm shadow-sm">
                <div className="flex justify-between"><span className="text-ink-faint">ชื่อ</span><span className="font-semibold">Watcharin Kurain</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">ตำแหน่ง</span><span className="font-semibold">Founder & Engineer</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">ประสบการณ์</span><span className="font-semibold">4+ ปี</span></div>
                <div className="flex justify-between"><span className="text-ink-faint">ภาษา</span><span className="font-semibold">ไทย, English</span></div>
                <div className="flex justify-between items-center"><span className="text-ink-faint">Email</span><span className="font-semibold text-brand-400 text-xs">watcharin@<br />watcharin-service.com</span></div>
              </div>
            </div>
            <div className="md:col-span-2 space-y-10 scroll-fade">
              <div>
                <div className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-3">My Story</div>
                <h3 className="text-3xl md:text-4xl font-extrabold mb-4 leading-tight">
                  จาก <span className="gradient-text">Developer</span> สู่ <span className="gradient-text">Architect</span>
                </h3>
                <div className="space-y-4 text-ink-muted leading-relaxed text-base">
                  <p>ผมจบการศึกษาจาก <strong className="text-ink">มหาวิทยาลัยเทคโนโลยีราชมงคลพระนคร</strong> สาขา <strong className="text-ink">วิศวกรรมคอมพิวเตอร์</strong> ในปี 2561 — ที่นั่นเป็นจุดเริ่มต้นของความหลงใหลในการสร้างระบบ ตั้งแต่บรรทัดแรกของโค้ดจนถึงการเข้าใจสถาปัตยกรรมระดับองค์กร</p>
                  <p>ตลอด <strong className="text-ink">4 ปีในวงการ</strong> ผมเดินผ่านหลายระดับของการพัฒนา — เริ่มจาก <strong className="text-ink">Application & System Developer</strong> ที่เถ้าแก่น้อย พัฒนาทั้ง web และ mobile application แบบ full-stack ก่อนขยับเป็น <strong className="text-ink">Software Engineer</strong> ที่ MFEC รับผิดชอบโปรเจค ServiceNow ระดับองค์กร และเลื่อนสู่ <strong className="text-ink">Software Architect</strong> ที่ PTT Digital Solutions ออกแบบโครงสร้างระบบสำหรับองค์กรขนาดใหญ่</p>
                  <p>ปัจจุบันผมกำลังสร้าง <strong className="text-ink">Watcharin Ecosystem</strong> — ระบบนิเวศธุรกิจ 5 ระบบที่เชื่อมกันเป็น value chain ครบวงจร พร้อมเปิดรับเป็น <strong className="text-brand-400">dev partner</strong> สำหรับธุรกิจที่ต้องการระบบเป็นของตัวเอง ผมเชื่อว่า AI จะเปลี่ยนวิธีที่เราออกแบบและใช้งานระบบ และผมอยากเป็นส่วนหนึ่งของการเปลี่ยนแปลงนั้น</p>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-brand-400 uppercase tracking-wide mb-4">What I Believe In</div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    ["🎯", "End-to-End", "รับผิดชอบตั้งแต่ idea ถึง production"],
                    ["🤖", "AI-Native", "AI ไม่ใช่ส่วนเสริม แต่เป็นแกนหลัก"],
                    ["💡", "Business First", "โค้ดดีไม่พอ — ต้องสร้างคุณค่าทางธุรกิจ"],
                  ].map(([icon, title, desc]) => (
                    <div key={title} className="bg-surface-raised border border-line rounded-xl p-5 card-hover">
                      <div className="text-3xl mb-3">{icon}</div>
                      <div className="font-bold mb-2 text-ink">{title}</div>
                      <div className="text-sm text-ink-muted">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-brand-600 via-brand-500 to-cyan-500 text-white rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="text-sm font-semibold uppercase tracking-wide mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-surface-raised pulse-dot" />
                    Currently Building
                  </div>
                  <p className="text-xl md:text-2xl font-bold leading-tight">Watcharin Ecosystem — 5 ระบบธุรกิจ ที่เชื่อมกันเป็น value chain ขับเคลื่อนด้วย AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
  );
}
