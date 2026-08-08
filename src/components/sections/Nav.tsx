import { LogoMark } from "@/components/Logo";

/* NAV */
export function Nav() {
  return (
<nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-line/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2 font-bold text-base">
            <LogoMark className="w-7 h-7" idSuffix="nav" />
            <span>Watcharin <span className="text-brand-400">Service</span></span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-muted">
            <a href="#services" className="hover:text-ink transition">Services</a>
            <a href="#industrial" className="hover:text-ink transition">Industrial</a>
            <a href="#process" className="hover:text-ink transition">Process</a>
            <a href="#cases" className="hover:text-ink transition">Work</a>
            <a href="#about" className="hover:text-ink transition">About</a>
            <a href="#resume" className="hover:text-ink transition">Resume</a>
            <a href="#faq" className="hover:text-ink transition">FAQ</a>
          </div>
          <a href="#contact" className="gradient-btn text-white text-sm font-semibold px-5 py-2.5 rounded-full">
            Contact →
          </a>
        </div>
      </nav>
  );
}
