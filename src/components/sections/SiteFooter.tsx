import { LogoMark } from "@/components/Logo";
import { SocialLinks } from "@/components/Social";

/* FOOTER */
export function SiteFooter() {
  return (
<footer className="bg-surface-raised/30 border-t border-line py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 font-bold">
              <LogoMark className="w-7 h-7" idSuffix="footer" />
              <span>Watcharin <span className="text-brand-400">Service</span></span>
              <span className="text-ink-faint font-normal text-sm ml-2 hidden sm:inline">— วางระบบธุรกิจครบวงจร</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-ink-faint">
              <a href="#about" className="hover:text-ink">About</a>
              <a href="#services" className="hover:text-ink">Services</a>
              <a href="#industrial" className="hover:text-ink">Industrial</a>
              <a href="#cases" className="hover:text-ink">Work</a>
              <a href="#resume" className="hover:text-ink">Resume</a>
              <a href="#faq" className="hover:text-ink">FAQ</a>
              <a href="#contact" className="hover:text-ink">Contact</a>
            </div>
            <SocialLinks />
          </div>
          <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-faint">
            © 2026 Watcharin Service · วางระบบธุรกิจครบวงจร จากแนวคิด สู่ระบบจริง
          </div>
        </div>
      </footer>
  );
}
