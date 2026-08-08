/* HOW I WORK */
export function Process() {
  return (
<section id="process" className="pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-6">
          {/* Sub-heading, not a section header: this flows on from Services
              inside the same chapter, so a second full-size h2 would compete. */}
          <div className="text-center mb-10 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-surface-raised border border-brand-500/30 text-brand-300 text-sm font-medium mb-3">How I Work</div>
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">เริ่มงานกับเรา<span className="gradient-text">ง่ายแค่ 4 ขั้น</span></h3>
            <p className="text-ink-muted max-w-2xl mx-auto">ไม่ต้องมี requirement ครบก่อน — เริ่มจากคุยกันก่อน แล้วเราช่วยจัดให้เป็นระบบ</p>
          </div>
          <div className="relative">
            {/* connector line (desktop) */}
            <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-brand-500/40 via-cyan-500/40 to-brand-500/40" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
              {[
                { step: "01", icon: "💬", title: "ปรึกษา", desc: "คุยเรื่อง requirement งบประมาณ และเป้าหมายธุรกิจ — ฟรี ไม่มีค่าใช้จ่าย ไม่มีข้อผูกมัด" },
                { step: "02", icon: "📐", title: "ออกแบบ", desc: "วาง architecture, flow และดีไซน์ ให้เห็นภาพรวมทั้งระบบก่อนลงมือเขียนโค้ด" },
                { step: "03", icon: "⚙️", title: "สร้าง", desc: "พัฒนาเป็นรอบๆ (iterative) อัปเดตความคืบหน้าให้เห็นตลอด ปรับแก้ได้ระหว่างทาง" },
                { step: "04", icon: "🚀", title: "ส่งมอบ + ดูแล", desc: "deploy ขึ้น production จริง พร้อมดูแลและพัฒนาต่อเนื่องหลังส่งมอบ" },
              ].map((s) => (
                <div key={s.step} className="text-center scroll-fade">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 flex items-center justify-center text-2xl shadow-lg shadow-brand-500/30 ring-4 ring-surface relative z-10">
                    {s.icon}
                  </div>
                  <div className="text-xs font-bold text-brand-400 tracking-widest mt-4 mb-1">STEP {s.step}</div>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed max-w-xs mx-auto">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-14 scroll-fade">
            <a href="#contact" className="gradient-btn text-white font-semibold px-7 py-3.5 rounded-full text-base inline-flex items-center gap-2">เริ่มจากคุยกันก่อน →</a>
          </div>
        </div>
      </section>
  );
}
