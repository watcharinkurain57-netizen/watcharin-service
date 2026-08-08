import { faq } from "@/lib/faq";

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
            {faq.map((item) => (
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
