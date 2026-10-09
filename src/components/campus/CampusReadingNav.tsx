"use client";
import { useEffect, useState } from "react";
import { useCampusMotion } from "./CampusShell";
const sections = [
  { id: "brief", title: "โจทย์" },
  { id: "development", title: "การพัฒนา" },
  { id: "role", title: "บทบาทและสถานะ" },
];
export function CampusReadingNav() {
  const [active, setActive] = useState("brief");
  const { reduced } = useCampusMotion();
  useEffect(() => {
    const elements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((node): node is HTMLElement => Boolean(node));
    const update = () => {
      let id = "brief";
      for (const element of elements)
        if (element.getBoundingClientRect().top <= 160) id = element.id;
      setActive(id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <nav className="campus-story-nav" aria-label="หัวข้อกรณีศึกษา">
      {sections.map(({ id, title }, i) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={active === id ? "step" : undefined}
          onClick={(event) => {
            event.preventDefault();
            document.getElementById(id)?.scrollIntoView({
              behavior: reduced ? "instant" : "smooth",
              block: "start",
            });
            document.getElementById(id)?.focus({ preventScroll: true });
          }}
        >
          <small>0{i + 1}</small> {title}
        </a>
      ))}
    </nav>
  );
}
