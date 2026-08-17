import Link from "next/link";
import { AccountButton } from "@/components/auth/AccountButton";
import { ArchiveNavCta } from "@/components/archive/ArchiveNavCta";
import { MyProjectsLink } from "@/components/archive/MyProjectsLink";

/**
 * เปลือกของ "ตัวแอป" — คลังโปรเจกต์
 * แยกแถบบนออกจากหน้าแรก เพราะที่นี่คือคนละที่: หน้าแรกคือหน้าร้าน ที่นี่คือข้างใน
 */
export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-8">
          <Link href="/" className="flex flex-none items-center gap-2 font-extrabold tracking-tight">
            <span className="grid size-6 place-items-center rounded-lg bg-brand-600 text-[0.74rem] font-black text-white">
              W
            </span>
            watcharin-service
          </Link>

          <nav aria-label="ส่วนต่าง ๆ ของเว็บ" className="hidden gap-6 text-sm font-semibold text-ink-muted sm:flex">
            <Link href="/projects" className="transition-colors hover:text-ink">
              คลังโปรเจกต์
            </Link>
            {/* โผล่เฉพาะคนที่ล็อกอินและอยู่ในโปรเจกต์อย่างน้อยหนึ่งอัน */}
            <MyProjectsLink />
            <Link href="/#talk" className="transition-colors hover:text-ink">
              ปรึกษา
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <AccountButton />
            <ArchiveNavCta />
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {children}
      </main>
    </>
  );
}
