/* INDUSTRIAL / SMART FACTORY */
export function Industrial() {
  return (
<section id="industrial" className="py-20 md:py-28 bg-surface-raised/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-sm font-medium mb-4">Industrial Solutions</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              เชื่อมโรงงานทั้งสาย <span className="gradient-text">PLC/Sensor → MES → ERP</span>
            </h2>
            <p className="text-ink-muted text-lg max-w-2xl mx-auto">จากเครื่องจักรหน้างานถึงข้อมูลบริหาร — ออกแบบเป็นระบบเดียวที่เห็นการผลิตจริง วัด ROI ได้ และลงทีละเฟสอย่างมีแผน</p>
          </div>

          {/* Architecture stack */}
          <div className="relative mb-16">
            <div className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-amber-500/40 via-brand-500/40 to-cyan-500/40" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
              {[
                { icon: "🔌", tier: "EDGE", title: "PLC / Sensor / เครื่องจักร", desc: "ดึงข้อมูลหน้างานแบบ realtime รองรับ protocol อุตสาหกรรม (Modbus, OPC-UA)", grad: "from-amber-500 to-orange-600" },
                { icon: "🏭", tier: "MES", title: "Manufacturing Execution", desc: "ติดตามการผลิต, OEE, downtime, QC และ traceability ราย lot/batch", grad: "from-brand-500 to-brand-600" },
                { icon: "📦", tier: "ERP", title: "วางแผน / คลัง / จัดซื้อ", desc: "ส่งยอดผลิตจริงเข้าสู่การวางแผน สต็อก และบัญชี ไม่ต้องคีย์ซ้ำ", grad: "from-cyan-500 to-cyan-600" },
                { icon: "📈", tier: "BI", title: "Dashboard ผู้บริหาร", desc: "เห็นทุกไลน์การผลิตแบบ realtime ตัดสินใจจากตัวเลขจริง", grad: "from-purple-500 to-purple-600" },
              ].map((l) => (
                <div key={l.tier} className="text-center scroll-fade">
                  <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${l.grad} flex items-center justify-center text-2xl shadow-lg ring-4 ring-surface relative z-10`}>
                    {l.icon}
                  </div>
                  <div className="text-xs font-bold text-ink-faint tracking-widest mt-4 mb-1">{l.tier}</div>
                  <h3 className="text-base font-bold mb-2">{l.title}</h3>
                  <p className="text-ink-muted text-sm leading-relaxed max-w-xs mx-auto">{l.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ROI + Risk */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-surface-raised border border-line rounded-2xl p-7 scroll-fade">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-2xl shadow-lg mb-5">📈</div>
              <h3 className="text-xl font-bold mb-4">โรงงานได้อะไร (ROI)</h3>
              <ul className="space-y-3">
                {[
                  "ลด downtime — เห็นเครื่องหยุดและสาเหตุแบบ realtime แก้ได้ทันที",
                  "เพิ่ม OEE — วัดประสิทธิภาพจริงทุกไลน์ ไม่ใช่ประมาณเอา",
                  "ตัดงานคีย์มือ — ข้อมูลไหลจากเครื่องเข้าระบบอัตโนมัติ ลด error",
                  "Traceability — ตามรอย lot/batch ได้ (สำคัญกับอาหาร/ยา/FMCG)",
                  "ข้อมูลชุดเดียวทั้งโรงงาน — บริหารตัดสินใจจากตัวเลขจริง",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-ink-muted leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-surface-raised border border-line rounded-2xl p-7 scroll-fade">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-2xl shadow-lg mb-5">🛡️</div>
              <h3 className="text-xl font-bold mb-4">คุมความเสี่ยงยังไง</h3>
              <ul className="space-y-3">
                {[
                  "ไม่ rip-and-replace — ต่อยอดจากเครื่องจักร/PLC เดิม ไม่ต้องรื้อทั้งโรงงาน",
                  "เริ่มจาก pilot line เดียวก่อน พิสูจน์ผลจริงแล้วค่อยขยาย",
                  "Vendor-neutral — ไม่ผูกยี่ห้อ PLC/ERP เดียว ข้อมูลเป็นของโรงงาน",
                  "รองรับ on-prem / edge — ไม่บังคับขึ้น cloud ถ้ากังวลความปลอดภัย/เน็ต",
                  "ส่งมอบพร้อมเอกสาร — ทีมโรงงานดูแลต่อเองได้ ไม่ lock-in",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-ink-muted leading-relaxed">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Phased plans — deeper-funnel detail, collapsed by default to keep
              this (already long) section scannable. Native <details> keeps every
              word in the DOM for SEO and gives keyboard/AT support for free. */}
          <details className="group scroll-fade">
            <summary className="cursor-pointer list-none text-center [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-5 py-2.5 text-sm font-semibold text-brand-300 transition hover:border-brand-400/50">
                ดูแผนลงทุนทีละเฟส — Plan A / B / C
                <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
          <div className="text-center mt-10 mb-8">
            <h3 className="text-2xl md:text-3xl font-extrabold mb-2">เลือกได้ตามงบและความพร้อม — เริ่มเล็ก โตทีละเฟส</h3>
            <p className="text-ink-muted">เริ่มจาก Plan A เพื่อพิสูจน์ ROI ก่อน แล้วต่อยอดสู่ B และ C เมื่อพร้อม</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                phase: "PLAN A",
                title: "Monitoring & Dashboard",
                grad: "from-amber-500 to-orange-600",
                blurb: "อ่านข้อมูลจาก PLC/sensor ขึ้น dashboard realtime + แจ้งเตือน",
                points: ["ต่อ PLC/sensor ที่มีอยู่", "Realtime dashboard + alert", "เริ่มต้นเร็ว ลงทุนต่ำ"],
                fit: "เหมาะกับ: อยากเห็นข้อมูลก่อน พิสูจน์ ROI",
              },
              {
                phase: "PLAN B",
                title: "MES — Production Execution",
                grad: "from-brand-500 to-brand-600",
                blurb: "ยกระดับเป็นระบบควบคุมการผลิตเต็มรูปแบบ",
                points: ["OEE + downtime tracking", "QC + traceability ราย lot", "Work order / การผลิตราย line"],
                fit: "เหมาะกับ: อยากคุมคุณภาพและประสิทธิภาพการผลิต",
                featured: true,
              },
              {
                phase: "PLAN C",
                title: "MES ↔ ERP Integration",
                grad: "from-cyan-500 to-cyan-600",
                blurb: "เชื่อมยอดผลิตจริงเข้า ERP เป็นระบบเดียวทั้งโรงงาน",
                points: ["เชื่อม ERP (วางแผน/คลัง/จัดซื้อ)", "ตัดสต็อก/ต้นทุนอัตโนมัติ", "ข้อมูลไหลครบ end-to-end"],
                fit: "เหมาะกับ: อยากได้ระบบครบวงจรทั้งโรงงาน",
              },
            ].map((p) => (
              <div key={p.phase} className={`bg-surface-raised rounded-2xl p-7 card-hover flex flex-col border ${p.featured ? "border-brand-400/50 ring-1 ring-brand-500/30" : "border-line"}`}>
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold tracking-widest bg-gradient-to-r ${p.grad} bg-clip-text text-transparent`}>{p.phase}</span>
                  {p.featured && <span className="text-xs font-semibold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/30">นิยมเริ่ม</span>}
                </div>
                <h4 className="text-lg font-bold mb-2">{p.title}</h4>
                <p className="text-sm text-ink-muted mb-4 leading-relaxed">{p.blurb}</p>
                <ul className="space-y-2 mb-5 flex-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-ink-muted">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-ink-faint pt-4 border-t border-line">{p.fit}</div>
              </div>
            ))}
          </div>
          </details>

          <div className="text-center mt-14 scroll-fade">
            <a href="#contact" className="gradient-btn text-white font-semibold px-7 py-3.5 rounded-full text-base inline-flex items-center gap-2">ปรึกษา solution โรงงานของคุณ (ฟรี) →</a>
          </div>
        </div>
      </section>
  );
}
