import Link from "next/link";
import { AccountButton } from "@/components/auth/AccountButton";

export function HomeNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface-raised/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-5 lg:gap-7">
        {/* จอมือถือเหลือแค่ตัว W — ชื่อเต็ม + ปุ่มเข้าสู่ระบบ + ปุ่มเล่าโปรเจกต์ กว้างรวมราว 490px
            เกินจอ 360–390px ทั้งหน้าจึงเลื่อนซ้ายขวาได้ และกล่องที่ลอยเต็มจอ (fixed) กว้างตามจนตกขอบ
            ชื่อยังอยู่ให้เครื่องอ่านหน้าจออ่าน (sr-only) ไม่ได้หายไปจากลิงก์ */}
        <Link href="/" className="flex flex-none items-center gap-2 text-[1.05rem] font-extrabold tracking-tight">
          <span className="grid size-6.5 place-items-center rounded-lg bg-brand-600 text-[0.78rem] font-black text-white">
            W
          </span>
          <span className="sr-only sm:not-sr-only">watcharin-service</span>
        </Link>

        {/* whitespace-nowrap — ที่ 768px เมนูโดนบีบจน "คลังโปรเจกต์" แตกเป็นหลายบรรทัด
            ยอมให้แถบแน่นขึ้นดีกว่าให้คำหักกลางคำ */}
        <nav
          aria-label="เมนูหลัก"
          className="hidden gap-4 whitespace-nowrap text-[0.94rem] font-semibold text-ink-muted md:flex lg:gap-6"
        >
          <Link href="/projects" className="transition-colors hover:text-brand-600">
            คลังโปรเจกต์
          </Link>
          {/* /#modes ไม่ใช่ #modes — แถบนี้ใช้ในหน้าอื่นด้วย (/start, /ai-map)
              ถ้าเขียนแค่ #modes กดจากหน้าอื่นจะไปหา #modes ในหน้านั้นเองซึ่งไม่มี */}
          <Link href="/#modes" className="transition-colors hover:text-brand-600">
            บริการ
          </Link>
          <Link href="/studio" className="transition-colors hover:text-brand-600">
            งานโรงงาน
          </Link>
          {/* ตัวที่สี่ขึ้นเฉพาะจอ 1024px ขึ้นไป — ช่วงแท็บเล็ตที่ไม่พอวาง มีลิงก์เดียวกันใน footer */}
          <Link href="/ai-map" className="hidden transition-colors hover:text-brand-600 lg:block">
            แผนที่ AI
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
