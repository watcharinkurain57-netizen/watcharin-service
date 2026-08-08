/* TRUST BAR */
export function TrustBar() {
  return (
<section className="border-y border-line bg-surface-raised">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <p className="text-sm font-medium text-ink-faint shrink-0">
              ประสบการณ์จากองค์กรมหาชนชั้นนำ
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {[
                "PTT Digital Solutions",
                "MFEC",
                "Taokaenoi",
              ].map((name) => (
                <span key={name} className="text-base md:text-lg font-bold text-ink-faint">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
}
