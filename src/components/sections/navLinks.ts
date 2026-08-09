export type NavLink = { href: string; label: string };

/**
 * One list for the desktop row and the mobile panel, so the two can never
 * drift apart. Order mirrors the chapter order on the page — anchor jumps
 * should never move the reader backwards.
 */
export const navLinks: readonly NavLink[] = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Process" },
  { href: "#industrial", label: "Industrial" },
  { href: "#cases", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#resume", label: "Resume" },
  { href: "#faq", label: "FAQ" },
];
