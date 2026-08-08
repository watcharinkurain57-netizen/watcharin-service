import { ContactForm } from "@/components/ContactForm";

/* FINAL CTA */
export function FinalCta() {
  return (
<section id="contact" className="py-20 md:py-32 bg-gradient-to-br from-surface-raised via-brand-900 to-surface-raised text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-brand-200 text-sm font-medium">Let&apos;s work together</div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 backdrop-blur border border-emerald-400/30 text-emerald-200 text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              เปิดรับ 1–2 โปรเจค/เดือน
            </div>
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            พร้อมเริ่ม<br />
            <span className="bg-gradient-to-r from-brand-300 via-cyan-300 to-brand-200 bg-clip-text text-transparent">โปรเจคของคุณ?</span>
          </h2>
          <p className="text-lg md:text-xl text-ink-muted mb-10 max-w-2xl mx-auto leading-relaxed">ปรึกษาฟรี ไม่มีค่าใช้จ่าย คุยเรื่อง requirement งบประมาณ และไอเดียก่อนตัดสินใจ</p>
          <ContactForm />
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 text-sm text-ink-faint">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 pulse-dot" />
              ปกติตอบกลับใน 24 ชั่วโมง
            </span>
            <span className="hidden sm:inline text-ink-muted">·</span>
            <a
              href="mailto:watcharin@watcharin-service.com"
              className="text-ink-muted hover:text-white transition"
            >
              หรืออีเมลโดยตรง: watcharin@watcharin-service.com
            </a>
          </div>
        </div>
      </section>
  );
}
