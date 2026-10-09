"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  campusBase,
  campusContent,
  campusZones,
  resolveCampusRoute,
  zoneKeys,
} from "@/lib/campus";

type ReturnContext = { path: string; title: string };
type Memory = {
  positions: Record<string, number>;
  origins: Record<string, ReturnContext>;
};
type Flight = { element: HTMLImageElement; rect: DOMRect; key: string };
type PageTransition = {
  path: string;
  pushed: boolean;
  animation?: Animation;
  timer?: number;
  watchdog?: number;
};
type MotionContext = {
  homeHref: string;
  reduced: boolean;
  origins: Memory["origins"];
  prepare: (target?: HTMLElement | null) => void;
  navigate: (path: string, target?: HTMLElement | null) => void;
};
const Context = createContext<MotionContext | null>(null);
export const useCampusMotion = () => useContext(Context)!;
const memoryKey = "campus:next-navigation:v1";

export function CampusLink({
  children,
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  const motion = useCampusMotion();
  const href = props.href === campusBase ? motion.homeHref : props.href;
  return (
    <Link
      {...props}
      href={href}
      scroll={false}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          event.button === 0 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.currentTarget.target !== "_blank" &&
          event.currentTarget.origin === location.origin &&
          event.currentTarget.pathname !== location.pathname
        ) {
          event.preventDefault();
          motion.navigate(
            event.currentTarget.pathname +
              event.currentTarget.search +
              event.currentTarget.hash,
            event.currentTarget,
          );
        }
      }}
    >
      {children}
    </Link>
  );
}

export function CampusBackLink({ projectKey }: { projectKey: string }) {
  const { origins } = useCampusMotion();
  const origin = origins[projectKey];
  return (
    <CampusLink
      href={origin?.path ?? `${campusBase}/work`}
      className="campus-back"
    >
      ← {origin?.title ?? "ผลงานทั้งหมด"}
    </CampusLink>
  );
}

export function CampusShell({
  children,
  homeHref = campusBase,
}: {
  children: ReactNode;
  homeHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const memory = useRef<Memory>({ positions: {}, origins: {} });
  const currentPath = useRef(pathname);
  const flight = useRef<Flight | null>(null);
  const navigationProject = useRef<string | null>(null);
  const cancelFlight = useRef<() => void>(() => {});
  const animations = useRef(new Set<Animation>());
  const [reduced, setReduced] = useState(false);
  const [origins, setOrigins] = useState<Memory["origins"]>({});
  const menu = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const curtain = useRef<HTMLDivElement>(null);
  const transition = useRef<PageTransition | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const finishTransition = useCallback(() => {
    const current = transition.current;
    if (!current) return;
    clearTimeout(current.timer);
    clearTimeout(current.watchdog);
    current.animation?.cancel();
    transition.current = null;
    if (curtain.current) delete curtain.current.dataset.active;
  }, []);
  const revealPage = useCallback(() => {
    const current = transition.current;
    const node = curtain.current;
    if (!current || !node) return;
    clearTimeout(current.watchdog);
    current.animation?.cancel();
    if (root.current?.dataset.reducedMotion === "true") {
      finishTransition();
      return;
    }
    current.animation = node.animate(
      [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }],
      { duration: 420, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" },
    );
    current.animation.finished.then(finishTransition).catch(() => {});
  }, [finishTransition]);
  function navigate(path: string, target?: HTMLElement | null) {
    if (transition.current) return;
    prepare(target);
    menu.current?.close();
    if (root.current?.dataset.reducedMotion === "true" || !curtain.current) {
      router.push(path, { scroll: false });
      return;
    }
    // The curtain replaces the shared-image flight for this navigation.
    cancelFlight.current();
    const node = curtain.current;
    node.dataset.active = "true";
    const current: PageTransition = { path, pushed: false };
    transition.current = current;
    current.animation = node.animate(
      [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }],
      { duration: 260, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" },
    );
    current.timer = window.setTimeout(() => {
      current.pushed = true;
      router.push(path, { scroll: false });
      // Recover if a route cannot resolve; the visitor never gets trapped behind a curtain.
      current.watchdog = window.setTimeout(revealPage, 2200);
    }, 260);
  }

  useEffect(() => {
    return () => {
      finishTransition();
      document.body.style.overflow = "";
    };
  }, [finishTransition]);

  useEffect(() => {
    if (!reduced || !transition.current) return;
    const current = transition.current;
    finishTransition();
    if (!current.pushed) router.push(current.path, { scroll: false });
  }, [reduced, router, finishTransition]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  function save() {
    try {
      sessionStorage.setItem(memoryKey, JSON.stringify(memory.current));
    } catch {
      /* Navigation still works without browser storage. */
    }
  }
  function prepare(target?: HTMLElement | null) {
    cancelFlight.current();
    flight.current?.element.remove();
    flight.current = null;
    memory.current.positions[currentPath.current] = window.scrollY;
    const card = target?.closest<HTMLElement>("[data-project-key]");
    navigationProject.current =
      card?.dataset.projectKey ??
      root.current?.querySelector<HTMLElement>("[data-hero-project]")?.dataset
        .heroProject ??
      null;
    if (card) {
      const key = card.dataset.projectKey!;
      const zone = currentPath.current.split(
        "/zones/",
      )[1] as keyof typeof campusZones;
      memory.current.origins[key] = {
        path: currentPath.current,
        title: campusZones[zone]?.name ?? "ผลงานทั้งหมด",
      };
      setOrigins({ ...memory.current.origins });
    }
    save();
    if (root.current?.dataset.reducedMotion === "true") return;
    const image =
      card?.querySelector<HTMLImageElement>("img") ??
      root.current?.querySelector<HTMLImageElement>("[data-hero-project] img");
    const key =
      card?.dataset.projectKey ??
      image?.closest<HTMLElement>("[data-hero-project]")?.dataset.heroProject;
    if (!image || !key) return;
    const rect = image.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= innerHeight || !rect.width) return;
    const element = new Image();
    element.src = image.currentSrc || image.src;
    element.alt = "";
    element.setAttribute("aria-hidden", "true");
    element.className = "campus-image-flight";
    Object.assign(element.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
    document.body.append(element);
    flight.current = { element, rect, key };
    const timer = window.setTimeout(() => {
      element.remove();
      if (flight.current?.element === element) flight.current = null;
    }, 4000);
    cancelFlight.current = () => {
      clearTimeout(timer);
      element.remove();
      flight.current = null;
    };
  }

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(memoryKey) ?? "null");
      if (saved?.positions && saved?.origins) {
        const validPath = (path: unknown): path is string =>
          typeof path === "string" &&
          (path === homeHref ||
            path === campusBase ||
            path.startsWith(`${campusBase}/`)) &&
          Boolean(
            resolveCampusRoute(
              path === homeHref
                ? []
                : path.slice(campusBase.length).split("/").filter(Boolean),
            ),
          );
        for (const [path, value] of Object.entries(saved.positions))
          if (
            validPath(path) &&
            typeof value === "number" &&
            Number.isFinite(value) &&
            value >= 0
          )
            memory.current.positions[path] = value;
        for (const [key, origin] of Object.entries(saved.origins)) {
          const item = origin as ReturnContext;
          if (
            /^[a-z0-9-]+$/.test(key) &&
            item &&
            validPath(item.path) &&
            typeof item.title === "string"
          )
            memory.current.origins[key] = item;
        }
        setOrigins({ ...memory.current.origins });
      }
    } catch {
      /* Ignore stale or unavailable session storage. */
    }
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      let preference = false;
      try {
        preference = localStorage.getItem("campus:reduce-motion") === "true";
      } catch {}
      const value = media.matches || preference;
      setReduced(value);
      if (root.current) {
        root.current.dataset.reducedMotion = String(value);
        root.current.dispatchEvent(
          new CustomEvent("campus:motion-preference", {
            detail: { reduced: value },
          }),
        );
      }
    };
    const node = root.current;
    const receive = (event: Event) =>
      setReduced((event as CustomEvent<{ reduced: boolean }>).detail.reduced);
    update();
    media.addEventListener("change", update);
    node?.addEventListener("campus:motion-preference", receive);
    const onPop = () => prepare();
    const onPageHide = () => {
      memory.current.positions[currentPath.current] = window.scrollY;
      save();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      media.removeEventListener("change", update);
      node?.removeEventListener("campus:motion-preference", receive);
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pagehide", onPageHide);
      cancelFlight.current();
    };
    // These handlers read route and memory refs; installing them again would capture the next page on browser Back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    currentPath.current = pathname;
    const top = Number(memory.current.positions[pathname]) || 0;
    window.scrollTo({ top, behavior: "instant" });
    let frame = 0;
    const shared = flight.current;
    const projectKey = navigationProject.current;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const image = root.current?.querySelector<HTMLImageElement>(
          `[data-hero-project="${shared?.key}"] img, [data-project-key="${shared?.key}"] img`,
        );
        if (shared && image && root.current?.dataset.reducedMotion !== "true") {
          const rect = image.getBoundingClientRect();
          if (rect.width && rect.bottom > 0 && rect.top < innerHeight) {
            image.style.visibility = "hidden";
            const animation = shared.element.animate(
              [
                { transform: "translate(0,0) scale(1,1)" },
                {
                  transform: `translate(${rect.left - shared.rect.left}px,${rect.top - shared.rect.top}px) scale(${rect.width / shared.rect.width},${rect.height / shared.rect.height})`,
                },
              ],
              {
                duration: 560,
                easing: "cubic-bezier(.22,1,.36,1)",
                fill: "forwards",
              },
            );
            const oldCleanup = cancelFlight.current;
            const cleanup = () => {
              animation.cancel();
              image.style.visibility = "";
              oldCleanup();
            };
            cancelFlight.current = cleanup;
            animation.finished.then(cleanup).catch(() => {});
          } else cancelFlight.current();
        } else cancelFlight.current();
        const focus = projectKey
          ? root.current?.querySelector<HTMLElement>(
              `[data-project-key="${projectKey}"]`,
            )
          : null;
        const heading = root.current?.querySelector<HTMLElement>("main h1");
        (focus ?? heading)?.focus({ preventScroll: true });
        revealPage();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, revealPage]);

  useEffect(() => {
    const nodes =
      root.current?.querySelectorAll<HTMLElement>("[data-campus-reveal]") ?? [];
    if (reduced) {
      for (const node of nodes) delete node.dataset.reveal;
      for (const animation of animations.current) animation.cancel();
      cancelFlight.current();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let index = 0;
        for (const entry of entries)
          if (entry.isIntersecting) {
            const node = entry.target as HTMLElement;
            delete node.dataset.reveal;
            observer.unobserve(node);
            const animation = node.animate(
              [
                { opacity: 0, transform: "translateY(14px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              {
                duration: 520,
                delay: (index++ % 4) * 45,
                easing: "cubic-bezier(.22,1,.36,1)",
              },
            );
            animations.current.add(animation);
            animation.finished
              .catch(() => {})
              .finally(() => animations.current.delete(animation));
          }
      },
      { threshold: 0.08 },
    );
    for (const node of nodes) {
      node.dataset.reveal = "pending";
      observer.observe(node);
    }
    const onScroll = () => cancelFlight.current();
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    const active = animations.current;
    return () => {
      observer.disconnect();
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
      for (const node of nodes) delete node.dataset.reveal;
      for (const animation of active) animation.cancel();
      active.clear();
    };
  }, [pathname, reduced]);

  function toggleMotion() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const value = !reduced;
    try {
      localStorage.setItem("campus:reduce-motion", String(value));
    } catch {}
    setReduced(value);
    root.current?.dispatchEvent(
      new CustomEvent("campus:motion-preference", {
        detail: { reduced: value },
      }),
    );
  }

  return (
    <Context.Provider
      value={{
        homeHref,
        reduced,
        origins,
        prepare,
        navigate,
      }}
    >
      <div
        ref={root}
        id="watcharin-portfolio-mockup"
        className="campus"
        data-reduced-motion={String(reduced)}
        data-home={String(pathname === homeHref || pathname === campusBase)}
      >
        <header className="campus-header">
          <CampusLink
            href={campusBase}
            className="campus-logo"
            aria-label="Watcharin Service — หน้าหลัก"
            onClick={(event) => {
              if (
                pathname !== homeHref ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              window.scrollTo({
                top: 0,
                behavior: reduced ? "instant" : "smooth",
              });
              root.current
                ?.querySelector<HTMLElement>("main h1")
                ?.focus({ preventScroll: true });
            }}
          >
            <strong>W</strong>
            <span>
              WATCHARIN
              <br />
              SERVICE
            </span>
          </CampusLink>
          <div className="campus-header-actions">
            <nav aria-label="เมนูหลัก">
              <CampusLink
                href={campusBase}
                aria-current={pathname === homeHref ? "page" : undefined}
              >
                หน้าหลัก
              </CampusLink>
              <CampusLink
                href={`${campusBase}/work`}
                aria-current={pathname.includes("/work") ? "page" : undefined}
              >
                ผลงาน
              </CampusLink>
              <CampusLink
                href={`${campusBase}/about`}
                aria-current={pathname.endsWith("/about") ? "page" : undefined}
              >
                เกี่ยวกับผม
              </CampusLink>
              <CampusLink href="/campus/resume/th">Resume</CampusLink>
              <CampusLink
                className="campus-button"
                href={`${campusBase}/contact`}
              >
                ติดต่อ ↗
              </CampusLink>
            </nav>
            <button
              className="campus-menu-toggle"
              type="button"
              ref={menuTrigger}
              aria-expanded={menuOpen}
              aria-controls="campus-menu"
              aria-haspopup="dialog"
              onClick={() => {
                menu.current?.showModal();
                setMenuOpen(true);
              }}
            >
              เมนู{" "}
              <span className="campus-menu-icon" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </header>
        <dialog
          className="campus-menu"
          id="campus-menu"
          ref={menu}
          aria-labelledby="campus-menu-title"
          onClose={() => {
            setMenuOpen(false);
            menuTrigger.current?.focus();
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) menu.current?.close();
          }}
        >
          <div className="campus-menu-heading">
            <span id="campus-menu-title">Creative Campus / เมนู</span>
            <button
              type="button"
              autoFocus
              onClick={() => menu.current?.close()}
            >
              ปิด ×
            </button>
          </div>
          <nav
            className="campus-menu-links"
            aria-label="สำรวจเว็บไซต์"
            onClick={() => menu.current?.close()}
          >
            <CampusLink href={campusBase} onClick={() => menu.current?.close()}>
              แคมปัส
            </CampusLink>
            <CampusLink href={`${campusBase}/work`}>ผลงาน</CampusLink>
            <CampusLink href={`${campusBase}/about`}>เกี่ยวกับผม</CampusLink>
            <CampusLink href={`${campusBase}/resume/th`}>Resume</CampusLink>
            <CampusLink href={`${campusBase}/contact`}>
              คุยเรื่องโปรเจกต์
            </CampusLink>
          </nav>
          <nav
            className="campus-menu-zones"
            aria-label="พื้นที่ของแคมปัส"
            onClick={() => menu.current?.close()}
          >
            {zoneKeys.map((zone) => (
              <CampusLink href={`${campusBase}/zones/${zone}`} key={zone}>
                {campusZones[zone].name}
              </CampusLink>
            ))}
          </nav>
          <a
            className="campus-menu-email"
            href={`mailto:${campusContent.profile.email}`}
          >
            {campusContent.profile.email}
          </a>
        </dialog>
        {children}
        <div className="campus-curtain" ref={curtain} aria-hidden="true">
          <span>Creative Campus</span>
        </div>
        <footer className="campus-footer">
          <div>
            <strong>WATCHARIN SERVICE</strong>
            <p>Systems. Brands. Digital experiences.</p>
          </div>
          <div>
            <button type="button" onClick={toggleMotion} aria-pressed={reduced}>
              ลด Motion
            </button>
            <CampusLink href={campusBase}>กลับสู่แคมปัส</CampusLink>
            <CampusLink href="/campus/resume/th">Resume</CampusLink>
            <CampusLink href={`${campusBase}/contact`}>ติดต่อ ↗</CampusLink>
          </div>
        </footer>
      </div>
    </Context.Provider>
  );
}
