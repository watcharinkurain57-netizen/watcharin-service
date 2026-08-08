/* FOR DECISION-MAKERS (ROI / RISK / PLAN) */
export function DecisionMakers() {
  return (
<section id="value" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-sm font-medium mb-4">For Decision-Makers</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              จ้างแล้ว<span className="gradient-text">ได้อะไร</span> — และเราจัดการความเสี่ยงยังไง
            </h2>
            <p className="text-ink-muted text-lg max-w-2xl mx-auto">มองในมุมผู้บริหาร: คุณค่าที่วัดได้ การควบคุมความเสี่ยง และแผนส่งมอบที่โปร่งใส</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "📈",
                grad: "from-brand-500 to-brand-600",
                title: "ROI & คุณค่าทางธุรกิจ",
                points: [
                  "Time-to-market เร็วขึ้นด้วย AI-augmented delivery — เห็น MVP ใช้งานได้ในหลักสัปดาห์",
                  "Architect คนเดียวรับผิดชอบ end-to-end — ตัดต้นทุนการประสานงานหลายทีม/หลาย vendor",
                  "Production-proven จริง: 3 ระบบที่ออกแบบเองใช้งานอยู่บน production ตอนนี้",
                  "ออกแบบให้ scale ได้ตั้งแต่ต้น — ลดค่า rebuild ในระยะยาว",
                ],
              },
              {
                icon: "🛡️",
                grad: "from-emerald-500 to-emerald-600",
                title: "การบริหารความเสี่ยง",
                points: [
                  "ส่งมอบเป็น milestone — เห็น working software ทุกรอบ ไม่ต้องรอจนจบ",
                  "โค้ดและ IP เป็นของคุณ 100% deploy บน infra ของคุณเอง ไม่มี vendor lock-in",
                  "NDA + ออกแบบให้สอดคล้อง PDPA เป็นมาตรฐาน (เคยทำ x-tier ตาม พ.ร.บ.ขายตรง มาแล้ว)",
                  "ส่งมอบพร้อมเอกสาร architecture — ทีมคุณรับไปดูแลต่อเองได้",
                ],
              },
              {
                icon: "🗺️",
                grad: "from-cyan-500 to-cyan-600",
                title: "แผนงาน & ความโปร่งใส",
                points: [
                  "Roadmap แบ่งเป็นเฟสชัดเจน + ประเมิน scope และ timeline ก่อนเริ่ม",
                  "จ่ายตาม milestone ที่ส่งมอบ ไม่ใช่เหมาก้อนเดียวจ่ายหน้างาน",
                  "อัปเดตความคืบหน้าโปร่งใส ปรับ scope ได้ระหว่างทาง",
                  "Fixed-scope quote ก่อนเริ่มงาน ไม่มีค่าใช้จ่ายแอบแฝง",
                ],
              },
            ].map((c) => (
              <div key={c.title} className="bg-surface-raised border border-line rounded-2xl p-7 card-hover scroll-fade flex flex-col">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-2xl shadow-lg mb-5`}>{c.icon}</div>
                <h3 className="text-xl font-bold mb-4">{c.title}</h3>
                <ul className="space-y-3">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-ink-muted leading-relaxed">
                      <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* quick differentiators strip */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[
              ["End-to-End", "จากแนวคิดถึง production — ไม่ทิ้งกลางทาง"],
              ["AI-First", "ผสาน AI ในทุกระบบ ไม่ใช่แค่ตัวเสริม"],
              ["Business+", "เข้าใจธุรกิจ ไม่ใช่แค่เขียนโค้ด"],
              ["No Lock-in", "โค้ด เอกสาร และ IP เป็นของคุณทั้งหมด"],
            ].map(([title, desc]) => (
              <div key={title} className="bg-gradient-to-br from-brand-500/10 to-surface-raised border border-brand-500/20 rounded-2xl p-6 card-hover scroll-fade">
                <div className="text-3xl font-extrabold gradient-text mb-2">{title}</div>
                <p className="text-ink-muted text-sm">{desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-14 scroll-fade">
            <a href="#contact" className="gradient-btn text-white font-semibold px-7 py-3.5 rounded-full text-base inline-flex items-center gap-2">คุยเรื่องโปรเจคของคุณ →</a>
          </div>
        </div>
      </section>
  );
}
