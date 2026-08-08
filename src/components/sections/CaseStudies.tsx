/* CASE STUDIES */
export function CaseStudies() {
  return (
<section id="cases" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-sm font-medium mb-4">Case Studies</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">ผลงานที่<span className="gradient-text">ส่งมอบจริง</span></h2>
            <p className="text-ink-muted text-lg max-w-2xl mx-auto">งานที่เคยทำให้องค์กรระดับประเทศ — ชื่อลูกค้าปิดไว้ตามข้อตกลง NDA แต่ขอบเขตงานเป็นของจริง</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tag: "Enterprise Architecture",
                client: "องค์กรพลังงานระดับประเทศ (กลุ่มมหาชน)",
                role: "Software Architect",
                challenge: "หลายระบบในองค์กรขนาดใหญ่ต้องเชื่อมต่อกัน และต้องวางโครงสร้างที่ scale ได้ในระยะยาว",
                did: "ออกแบบ enterprise architecture, วาง pattern การ integrate ระบบ และแปลง business requirement เป็น blueprint ที่ทีมพัฒนานำไปต่อยอดได้",
                stack: ["System Integration", "Architecture", "API"],
                grad: "from-brand-500 to-brand-600",
                icon: "🏛️",
              },
              {
                tag: "ServiceNow ITSM / CRM",
                client: "บริษัท IT Solutions มหาชน",
                role: "Software Engineer",
                challenge: "ลูกค้าองค์กรต้องการระบบ ITSM/CRM ครบวงจร และต้องดึงข้อมูลจากหลายระบบเข้ามารวมศูนย์",
                did: "พัฒนา ServiceNow end-to-end (ITSM + CRM), เขียน Python API ดึงข้อมูลเข้าระบบ, ตั้งค่า Mid Server และงาน Opentext ITSM",
                stack: ["ServiceNow", "Python", "Mid Server"],
                grad: "from-cyan-500 to-cyan-600",
                icon: "🔄",
              },
              {
                tag: "Full-stack + Data",
                client: "บริษัทอาหาร/FMCG มหาชน",
                role: "Application & System Developer",
                challenge: "ทีม operations ต้องการเครื่องมือดิจิทัล — ทั้ง web ภายใน, mobile app และ dashboard วิเคราะห์ข้อมูล",
                did: "พัฒนา full-stack web (ASP.NET/C# + MSSQL), Android app ด้วย Kotlin และสร้าง dashboard วิเคราะห์ข้อมูลด้วย Tableau",
                stack: ["ASP.NET", "Kotlin", "Tableau"],
                grad: "from-amber-500 to-orange-600",
                icon: "📊",
              },
            ].map((c) => (
              <div key={c.tag} className="bg-surface-raised border border-line rounded-2xl p-6 card-hover scroll-fade flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-xl shadow-md`}>{c.icon}</div>
                  <div className="text-sm font-semibold text-ink">{c.tag}</div>
                </div>
                <div className="text-xs text-ink-faint mb-1">{c.client}</div>
                <div className="text-sm font-semibold text-brand-400 mb-4">{c.role}</div>
                <div className="space-y-3 text-sm flex-1">
                  <div>
                    <div className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-1">โจทย์</div>
                    <p className="text-ink-muted leading-relaxed">{c.challenge}</p>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink-faint uppercase tracking-wide mb-1">สิ่งที่ทำ</div>
                    <p className="text-ink-muted leading-relaxed">{c.did}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-line">
                  {c.stack.map((s) => (
                    <span key={s} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-raised/30 text-ink-muted border border-line">{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}
