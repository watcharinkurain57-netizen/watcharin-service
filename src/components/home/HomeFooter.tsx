import Link from "next/link";

const COLUMNS = [
  {
    title: "โปรเจกต์",
    links: [
      { label: "คลังโปรเจกต์", href: "/projects" },
      { label: "งานโรงงาน", href: "/studio" },
      { label: "เดโม CoreSync", href: "/coresync" },
    ],
  },
  {
    title: "บริการ",
    links: [
      { label: "มาถามเฉย ๆ", href: "#modes" },
      { label: "ทำไปด้วยกัน", href: "#modes" },
      { label: "ทำให้เลย", href: "#modes" },
    ],
  },
  {
    title: "เกี่ยวกับ",
    links: [
      { label: "เรซูเม่ (ไทย)", href: "/resume/th" },
      { label: "Resume (EN)", href: "/resume/en" },
      { label: "ติดต่อ", href: "#talk" },
    ],
  },
];

export function HomeFooter() {
  return (
    <footer className="bg-[#16302a] py-14 text-[#9db5ac]">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="mb-2 text-[1.1rem] font-extrabold text-[#eaf3ef]">watcharin-service</p>
            <p className="max-w-[26ch] text-[0.92rem]">
              ที่ปรึกษาและรับพัฒนาระบบ — ระบบโรงงาน เว็บ แอปมือถือ AI และบอทไลน์
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-3.5 text-[0.76rem] font-semibold uppercase tracking-[0.14em] text-brand-400">
                {col.title}
              </h2>
              <ul className="grid gap-2 text-[0.92rem]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[0.85rem]">
          <span>© {new Date().getFullYear()} watcharin-service</span>
          <span>ปรึกษา และทำร่วมกันได้</span>
        </div>
      </div>
    </footer>
  );
}
