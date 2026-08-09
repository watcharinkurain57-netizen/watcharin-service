import { LogoMark } from "@/components/Logo";
import { MobileNav } from "./MobileNav";
import { navLinks } from "./navLinks";

/* NAV */
export function Nav() {
  return (
    <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-line/60">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <a href="#home" className="flex items-center gap-2 font-bold text-base">
          <LogoMark className="w-7 h-7" idSuffix="nav" />
          <span>Watcharin <span className="text-brand-400">Service</span></span>
        </a>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-muted">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-ink transition">
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#contact"
            className="gradient-btn text-white text-sm font-semibold px-4 py-2.5 sm:px-5 rounded-full whitespace-nowrap"
          >
            Contact →
          </a>
          {/* Client island: everything else in this nav stays server-rendered. */}
          <MobileNav links={navLinks} />
        </div>
      </div>
    </nav>
  );
}
