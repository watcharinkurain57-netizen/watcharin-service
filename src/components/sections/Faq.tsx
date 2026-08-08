/* FAQ */
export function Faq() {
  return (
<section id="faq" className="py-20 md:py-28 bg-gradient-to-b from-surface to-brand-500/5">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 text-sm font-medium mb-4">FAQ</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">คำถามที่พบบ่อย</h2>
            <p className="text-ink-muted text-lg">เรื่องที่ลูกค้ามักถามก่อนเริ่มงาน</p>
          </div>
          <div className="space-y-3 scroll-fade">
            {[
              {
                q: "รับทำงานประเภทไหนบ้าง?",
                a: "ระบบ Web Application, Mobile App (iOS/Android), การเชื่อม AI เข้ากับระบบ และระบบสำหรับองค์กร/อุตสาหกรรม — ครบตั้งแต่ออกแบบ architecture ไปจนถึง deploy ใช้งานจริง",
              },
              {
                q: "คิดราคายังไง?",
                a: "ประเมินเป็นรายโปรเจคตามขอบเขตงานและความซับซ้อน ไม่มีราคาตายตัว — เริ่มจากปรึกษาฟรีก่อนเสมอ แล้วผมจะสรุปขอบเขตงานพร้อมราคาให้ชัดเจนก่อนเริ่ม ไม่มีค่าใช้จ่ายแอบแฝง",
              },
              {
                q: "โปรเจคหนึ่งใช้เวลานานแค่ไหน?",
                a: "ขึ้นกับขอบเขตงาน — MVP ขนาดเล็กอาจใช้ไม่กี่สัปดาห์ ระบบใหญ่อาจหลายเดือน โดยแบ่งงานเป็น milestone ให้เห็นความคืบหน้าเป็นระยะ ไม่ต้องรอจนจบถึงจะเห็นผล",
              },
              {
                q: "ทำคนเดียว หรือมีทีม?",
                a: "หลักๆ ผมดูแลเองแบบ end-to-end โดยใช้ AI ช่วยเร่ง workflow ทำให้ส่งงานได้เร็วและคุมคุณภาพได้ — สำหรับโปรเจคใหญ่สามารถดึง partner/ผู้เชี่ยวชาญเฉพาะทางมาเสริมได้",
              },
              {
                q: "มีดูแลหลังส่งมอบไหม?",
                a: "มีครับ — ดูแล แก้บั๊ก และพัฒนาต่อเนื่องได้ตามข้อตกลง ระบบที่ส่งมอบจะมีเอกสารและโครงสร้างที่ดูแลต่อง่าย ไม่ผูกขาดให้ต้องจ้างผมตลอด",
              },
              {
                q: "ทำระบบโรงงาน (PLC/Sensor, MES, ERP) ได้ไหม เริ่มยังไง?",
                a: "ได้ครับ — ออกแบบเป็น solution ที่เชื่อมตั้งแต่ PLC/sensor หน้างาน → MES (ติดตามการผลิต OEE, traceability) → ERP โดยไม่ต้องรื้อเครื่องจักรเดิม เริ่มได้ทีละเฟส: Plan A ทำ dashboard อ่านข้อมูล realtime ก่อนเพื่อพิสูจน์ ROI แล้วค่อยต่อยอดเป็น MES และเชื่อม ERP เมื่อพร้อม เริ่มจาก pilot line เดียวก่อนเพื่อคุมความเสี่ยง ดูรายละเอียดได้ที่หัวข้อ Industrial Solutions ด้านบน",
              },
              {
                q: "โค้ดและข้อมูลเป็นของใคร ถ้าเลิกจ้างกลางทาง?",
                a: "เป็นของคุณ 100% — ทั้งซอร์สโค้ด, ข้อมูล, และ IP ระบบ deploy บน infrastructure ในชื่อบัญชีของคุณเอง (Vercel/Supabase/cloud) ไม่มี vendor lock-in ถ้าหยุดกลางทาง คุณได้ทุกอย่างที่ส่งมอบไปแล้วพร้อมเอกสาร ทีมอื่นรับไปต่อได้ทันที",
              },
              {
                q: "ประเมินความคุ้มค่า (ROI) และความเสี่ยงยังไง?",
                a: "เริ่มจากสรุป scope และ timeline ให้ชัดก่อนเริ่ม แล้วส่งมอบเป็น milestone — คุณเห็นของใช้งานได้จริงทุกรอบและจ่ายตามงานที่ส่งมอบ ความเสี่ยงจึงถูกคุมเป็นช่วงสั้นๆ ไม่ใช่เดิมพันก้อนเดียว ความคุ้มค่าหลักมาจากการมี architect เดียวรับผิดชอบ end-to-end (ลด overhead การประสานงาน) และโครงสร้างที่ scale ได้ตั้งแต่ต้น ลดค่า rebuild ในอนาคต",
              },
              {
                q: "ทำงานแบบ remote ได้ไหม อยู่ที่ไหน?",
                a: "อยู่ไทย ทำงานกับลูกค้าได้ทั่วประเทศ (และต่างประเทศ) ผ่านออนไลน์เป็นหลัก นัดประชุม online ได้ตามสะดวก — ถ้าจำเป็นต้องเจอตัวก็คุยกันได้",
              },
              {
                q: "เริ่มต้นทำงานด้วยกันยังไง?",
                a: "ง่ายมาก — ทักผ่านฟอร์มติดต่อด้านล่างหรืออีเมล บอกคร่าวๆ ว่าอยากทำอะไร แล้วเรานัดคุยฟรีเพื่อสรุป requirement และแนวทางก่อนตัดสินใจ",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group bg-surface-raised border border-line rounded-2xl px-6 open:shadow-md transition-shadow"
              >
                <summary className="flex justify-between items-center gap-4 cursor-pointer py-5 font-semibold text-ink list-none [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-lg leading-none transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 -mt-1 text-ink-muted text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
  );
}
