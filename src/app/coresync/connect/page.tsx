import type { Metadata } from "next";
import Link from "next/link";
import { ConnectPanel } from "@/components/coresync/ConnectPanel";

export const metadata: Metadata = {
  title: "ต่อข้อมูลของคุณเข้ากับ CoreSync (โหมดทดลอง)",
  description:
    "ทดลองส่งข้อมูลจากระบบของคุณเข้ามาแสดงบน dashboard โดยไม่ต้องติดตั้งอะไร ไม่มีการเก็บข้อมูล และไม่ต้องเปิดช่องทางเข้าโรงงาน",
  alternates: { canonical: "/coresync/connect" },
};

export default function ConnectPage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
      <p className="text-sm text-ink-faint">
        <Link href="/coresync" className="hover:text-ink">
          CoreSync
        </Link>{" "}
        / โหมดทดลอง
      </p>

      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">ต่อข้อมูลของคุณเข้ามาดู</h1>
      <p className="mt-3 text-ink-muted">
        ส่งข้อมูลจากระบบของคุณเข้ามาแสดงบนหน้าจอจริง เพื่อดูว่าถ้าทำระบบขึ้นมาแล้วจะหน้าตาแบบไหน
        ไม่ต้องติดตั้งอะไรที่ฝั่งคุณ และไม่ต้องเปิดช่องทางให้เราเข้าไปในเครือข่ายของคุณเลย
      </p>

      {/* ป้ายนี้ต้องอยู่ตลอด ไม่ใช่ให้ผู้ใช้ไปเจอเองว่าข้อมูลหาย */}
      <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <p className="font-semibold text-amber-300">โหมดทดลอง — ข้อมูลไม่ถูกบันทึก</p>
        <ul className="mt-2 space-y-1 text-ink-muted">
          <li>· ข้อมูลที่ส่งเข้ามาใช้แสดงผลอย่างเดียว ผ่านแล้วผ่านเลย ไม่มีการเก็บลงฐานข้อมูลใด ๆ</li>
          <li>· รีเฟรชหน้านี้แล้วตัวเลขเริ่มนับใหม่ เพราะการนับเกิดขึ้นในเบราว์เซอร์ของคุณ</li>
          <li>· ช่องรับข้อมูลหมดอายุใน 2 ชั่วโมง หลังจากนั้นสร้างใหม่ได้ทันที</li>
          <li>· ถ้าต้องการเก็บข้อมูลจริง ตัวเชื่อมต่อเขียนลงฐานข้อมูลฝั่งคุณเองได้ โดยที่เราไม่เห็นข้อมูล</li>
        </ul>
      </div>

      <div className="mt-8">
        <ConnectPanel />
      </div>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">ทดลองได้ 3 ระดับ</h2>
        <dl className="mt-4 space-y-4 text-sm">
          <div>
            <dt className="font-semibold">ระดับ 0 — กดเล่นเลย</dt>
            <dd className="mt-1 text-ink-muted">
              ไม่ต้องโหลดอะไร กดปุ่มแล้วข้อมูลจำลองวิ่งทันที พิมพ์ชื่อ tag ของคุณเองลงไปได้ด้วย
            </dd>
          </div>
          <div>
            <dt className="font-semibold">ระดับ 1 — ข้อมูลของคุณเอง</dt>
            <dd className="mt-1 text-ink-muted">
              ส่งจากเครื่องของคุณด้วยคำสั่งเดียว หรือชี้ตัวเชื่อมต่อไปที่ไฟล์ที่ระบบเดิมส่งออกมาได้อยู่แล้ว
            </dd>
          </div>
          <div>
            <dt className="font-semibold">ระดับ 2 — ต่อระบบจริง</dt>
            <dd className="mt-1 text-ink-muted">
              ต่อ OPC-UA หรือ Modbus บนเครื่องทดสอบ ระดับนี้ต้องคุยกันก่อนเพราะต้องมีวิศวกรฝั่งคุณช่วย —{" "}
              <Link href="/#contact" className="text-brand-400 underline underline-offset-4">
                ทักมาคุยได้
              </Link>
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
