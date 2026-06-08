import Link from "next/link";
import { LogoMark } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-white via-brand-50/40 to-cyan-50/30">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg mb-10">
        <LogoMark className="w-8 h-8" idSuffix="nf" />
        <span>Watcharin <span className="text-brand-600">Service</span></span>
      </Link>

      <div className="text-7xl md:text-8xl font-extrabold gradient-text tracking-tight mb-4">
        404
      </div>
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
        ไม่พบหน้าที่คุณกำลังหา
      </h1>
      <p className="text-slate-600 max-w-md mb-8">
        หน้านี้อาจถูกย้าย เปลี่ยนชื่อ หรือไม่มีอยู่จริง — ลองกลับไปหน้าหลักแล้วเริ่มใหม่ได้เลย
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="gradient-btn text-white font-semibold px-7 py-3.5 rounded-full text-base"
        >
          ← กลับหน้าหลัก
        </Link>
        <Link
          href="/#contact"
          className="bg-white border border-slate-200 text-slate-900 font-semibold px-7 py-3.5 rounded-full hover:border-slate-300 transition text-base"
        >
          ติดต่อเรา
        </Link>
      </div>
    </main>
  );
}
