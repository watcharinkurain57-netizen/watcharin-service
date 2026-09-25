import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SHARE_IMAGE } from "@/lib/share-image";

/**
 * รูปที่ขึ้นตอนแชร์ลิงก์ (LINE, Facebook, X) — ใช้ทั้งเว็บ
 *
 * หน้าตาตามหน้าแรก: พื้นสว่างแบบ theme-soft กับหัวข้อเดียวกับ hero
 * คนที่เห็นรูปแล้วกดเข้ามาจะเจอหน้าที่ตรงกับรูป
 *
 * ไม่ได้ตั้ง runtime = "edge" — ให้ Next สร้างรูปครั้งเดียวตอน build แล้วเสิร์ฟเป็นไฟล์นิ่ง
 * รูปนี้ไม่มีอะไรเปลี่ยนตามคนเปิด จึงไม่ต้องวาดใหม่ทุกครั้งที่มีคนแชร์
 *
 * ตัววาดรูป (satori) รับ CSS ได้แค่บางส่วน:
 * - div ที่มีลูกมากกว่าหนึ่งตัวต้องเป็น display: flex ไม่งั้นทั้งรูปพัง (ตอบ 500)
 * - ไม่มี width: fit-content ใช้ alignSelf แทน
 * - อ่านตัวแปรสีใน globals.css ไม่ได้ สีข้างล่างจึงคัดลอกค่ามาจาก theme-soft
 *
 * ⚠️ ข้อความไทยในรูปต้องไม่มีสระบนกับวรรณยุกต์ซ้อนกัน เช่น "ที่" "ตั้ง"
 * satori ไม่ขยับวรรณยุกต์ขึ้นหลบสระ มันจะทับกันจนอ่านไม่ออก
 * ป้ายด้านบนจึงเขียนว่า "รับปรึกษาและพัฒนาระบบ" แทน "ที่ปรึกษาและรับพัฒนาระบบ" ของหน้าแรก
 */
export const alt = SHARE_IMAGE.alt;
export const size = { width: SHARE_IMAGE.width, height: SHARE_IMAGE.height };
export const contentType = "image/png";

const INK = "#121a17";
const INK_MUTED = "#55645f";
const BRAND_100 = "#d1fae5";
const BRAND_600 = "#059669";
const BRAND_700 = "#047857";

/**
 * ฟอนต์ต้องแนบมาเอง — satori มีแค่ฟอนต์ละตินหนึ่งตัว ตัวหนังสือไทยจะไม่ขึ้นเลย
 * เป็นคู่เดียวกับหน้าเว็บ (Inter + IBM Plex Sans Thai) ไฟล์มาจาก @fontsource
 * ตัดมาเฉพาะชุดอักษรที่ใช้ และต้องเป็น .woff เพราะ satori อ่าน .woff2 ไม่ได้
 *
 * เขียนพาธเต็มทีละไฟล์ ไม่ประกอบจากตัวแปร — ตัวรวบไฟล์ตอน deploy
 * ต้องอ่านพาธออกจากโค้ดได้ ถึงจะแนบฟอนต์ไปด้วย
 */
function loadFonts() {
  return Promise.all([
    readFile(join(process.cwd(), "src/assets/og/inter-latin-600.woff")),
    readFile(join(process.cwd(), "src/assets/og/inter-latin-800.woff")),
    readFile(join(process.cwd(), "src/assets/og/ibm-plex-sans-thai-thai-500.woff")),
    readFile(join(process.cwd(), "src/assets/og/ibm-plex-sans-thai-thai-700.woff")),
  ]);
}

/** ขอบเขตงาน ย่อจากป้ายในหน้าแรก — เหลือคำละตินสั้น ๆ ให้พอดีแถวเดียว */
const SCOPE = ["PLC", "SCADA", "MES", "ERP", "Web", "Mobile", "AI", "LINE Bot"];

export default async function Image() {
  const [inter600, inter800, thai500, thai700] = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          padding: "56px 72px",
          backgroundImage: "linear-gradient(180deg, #e4efea 0%, #f1f7f4 100%)",
          color: INK,
          fontFamily: "Inter, IBM Plex Sans Thai",
        }}
      >
        {/* วงสีฟุ้งแบบหน้าแรก — satori ไม่มี blur จึงใช้ radial-gradient ที่จางลงจนโปร่งแทน */}
        <div
          style={{
            position: "absolute",
            left: -200,
            top: -220,
            width: 640,
            height: 640,
            backgroundImage: "radial-gradient(circle, rgba(167,243,208,0.8) 0%, rgba(167,243,208,0) 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: -160,
            bottom: -240,
            width: 620,
            height: 620,
            backgroundImage: "radial-gradient(circle, rgba(254,243,199,0.95) 0%, rgba(254,243,199,0) 70%)",
          }}
        />

        {/* ไอคอนเว็บตัวใหญ่ — ตัวเดียวกับ icon.svg ให้คนจำได้ว่าเป็นเว็บเดียวกับแท็บที่เปิดอยู่ */}
        <div
          style={{
            position: "absolute",
            right: 84,
            top: 196,
            width: 236,
            height: 236,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 56,
            backgroundImage: "linear-gradient(135deg, #10b981, #06b6d4)",
            boxShadow: "0 28px 60px -18px rgba(5,150,105,0.45)",
            transform: "rotate(-6deg)",
          }}
        >
          <svg width={164} height={164} viewBox="0 0 100 100" fill="none">
            <path
              d="M24 32 L38 70 L50 46 L62 70 L76 32"
              stroke="white"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
            <circle cx={24} cy={32} r={8} fill="white" />
            <circle cx={38} cy={70} r={8} fill="white" />
            <circle cx={50} cy={46} r={8} fill="white" />
            <circle cx={62} cy={70} r={8} fill="white" />
            <circle cx={76} cy={32} r={8} fill="white" />
          </svg>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 46,
              height: 46,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 13,
              background: BRAND_600,
              color: "white",
              fontSize: 25,
              fontWeight: 800,
            }}
          >
            W
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>watcharin-service</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              alignSelf: "flex-start",
              padding: "7px 18px",
              borderRadius: 999,
              background: BRAND_100,
              color: BRAND_700,
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            รับปรึกษาและพัฒนาระบบ
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 18,
              fontSize: 98,
              fontWeight: 700,
              lineHeight: 1.16,
            }}
          >
            <div>ปรึกษา</div>
            <div style={{ display: "flex" }}>
              และ<span style={{ color: BRAND_600 }}>ทำร่วมกันได้</span>
            </div>
          </div>

          <div style={{ marginTop: 18, fontSize: 32, fontWeight: 500, color: INK_MUTED }}>
            ระบบโรงงาน เว็บ แอปมือถือ AI และบอทไลน์
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {SCOPE.map((item) => (
            <div
              key={item}
              style={{
                padding: "5px 15px",
                borderRadius: 999,
                border: "2px solid #c6d6cf",
                background: "rgba(255,255,255,0.7)",
                color: INK_MUTED,
                fontSize: 21,
                fontWeight: 600,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: inter600, weight: 600, style: "normal" },
        { name: "Inter", data: inter800, weight: 800, style: "normal" },
        { name: "IBM Plex Sans Thai", data: thai500, weight: 500, style: "normal" },
        { name: "IBM Plex Sans Thai", data: thai700, weight: 700, style: "normal" },
      ],
    },
  );
}
