import Link from "next/link";
import { AccountButton } from "@/components/auth/AccountButton";

export function HomeNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface-raised/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-7 px-5">
        <Link href="/" className="flex flex-none items-center gap-2 text-[1.05rem] font-extrabold tracking-tight">
          <span className="grid size-6.5 place-items-center rounded-lg bg-brand-600 text-[0.78rem] font-black text-white">
            W
          </span>
          watcharin-service
        </Link>

        <nav aria-label="เมนูหลัก" className="hidden gap-6 text-[0.94rem] font-semibold text-ink-muted md:flex">
          <Link href="/projects" className="transition-colors hover:text-brand-600">
            คลังโปรเจกต์
          </Link>
          <Link href="#modes" className="transition-colors hover:text-brand-600">
            บริการ
          </Link>
          <Link href="/studio" className="transition-colors hover:text-brand-600">
            งานโรงงาน
          </Link>
        </nav>

        <div className="ml-auto flex flex-none items-center gap-2.5">
          <AccountButton />
          {/* พาไปหน้าเล่าโปรเจกต์ (ล็อกอินแล้วกรอกสองช่อง) ไม่ใช่เลื่อนลงไปฟอร์มอีเมล
              ฟอร์มอีเมลยังอยู่ท้ายหน้าสำหรับคนที่ไม่อยากล็อกอิน */}
          <Link
            href="/start"
            className="rounded-full bg-brand-600 px-5 py-2.5 text-[0.9rem] font-bold text-white shadow-sm shadow-brand-600/25 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
          >
            เล่าโปรเจกต์ให้ฟัง
          </Link>
        </div>
      </div>
    </header>
  );
}
