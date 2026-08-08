/* SERVICES */
export function Services() {
  return (
<section id="services" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-sm font-medium mb-4">What I Build</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">บริการของเรา</h2>
            <p className="text-ink-muted text-lg max-w-2xl mx-auto">ออกแบบและสร้างระบบครบวงจร — ตั้งแต่แนวคิดไปจนถึงระบบใช้งานจริง</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "🌐", title: "Web Systems", desc: "ระบบ Web Application สำหรับธุรกิจทุกขนาด ใช้ Next.js + TypeScript", grad: "from-brand-500 to-brand-600", shadow: "shadow-brand-500/30" },
              { icon: "📱", title: "Mobile Apps", desc: "แอพบน iOS และ Android ใช้ React Native / Expo", grad: "from-cyan-500 to-cyan-600", shadow: "shadow-cyan-500/30" },
              { icon: "🤖", title: "AI Integration", desc: "เชื่อม AI Agent เข้ากับระบบ — Claude, OpenAI, custom models", grad: "from-purple-500 to-purple-600", shadow: "shadow-purple-500/30" },
              { icon: "🏭", title: "Industrial Solutions", desc: "เชื่อม PLC/Sensor → MES → ERP เห็นการผลิต realtime วัด OEE ตัดงานคีย์มือ", grad: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/30" },
            ].map((s) => (
              <div key={s.title} className="card-hover scroll-fade bg-surface-raised border border-line rounded-2xl p-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-2xl mb-5 shadow-lg ${s.shadow}`}>{s.icon}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-ink-muted text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}
