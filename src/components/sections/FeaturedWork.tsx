import { EcosystemGrid } from "@/components/EcosystemGrid";

/* FEATURED WORK */
export function FeaturedWork() {
  return (
<section id="work" className="py-20 md:py-28 bg-gradient-to-br from-surface-raised/30 via-brand-500/5 to-cyan-500/5 relative overflow-hidden">
        <div className="absolute top-20 right-0 w-96 h-96 bg-brand-500 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl opacity-20" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16 scroll-fade">
            <div className="inline-block px-3 py-1 rounded-full bg-surface-raised border border-brand-500/30 text-brand-300 text-sm font-medium mb-4 shadow-sm">Featured Work</div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              Watcharin <span className="gradient-text">Ecosystem</span>
            </h2>
            <p className="text-ink-muted text-lg max-w-2xl mx-auto">5 ระบบที่เชื่อมโยงกันเป็น value chain ครบวงจร — ตั้งแต่รวมคน วิจัย ผลิต ขาย ไปจนถึงจัดการองค์กร</p>
            <p className="text-sm text-ink-faint mt-4">💡 คลิกที่การ์ดเพื่อดูรายละเอียด</p>
          </div>
          <EcosystemGrid />
        </div>
      </section>
  );
}
