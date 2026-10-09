import Image from "next/image";
import { campusZones, type CampusZoneKey } from "@/lib/campus";

const watcharinSteps = [
  { title: "จัดโครงสร้างและเส้นทาง", body: "แยกงานเป็น 4 โซน แล้วเชื่อมหน้าแคมปัส ผลงาน กรณีศึกษา และช่องทางติดต่อ" },
  { title: "ออกแบบและต่อหน้าจอ", body: "ใช้ชุดสีและองค์ประกอบร่วมกัน พร้อมภาพ 3D และ Motion ระหว่างหน้าที่เกี่ยวข้อง" },
  { title: "ตรวจการใช้งานจริง", body: "ตรวจบน Desktop และมือถือ รวมคีย์บอร์ด โหมดลด Motion และเส้นทางเว็บก่อนเผยแพร่" },
];
const altByZone: Record<CampusZoneKey, string[]> = {
  systems: ["ภาพเอกสารโจทย์เชื่อมกับงานบริการ การเชื่อมระบบ และข้อมูล", "ภาพ Blueprint แสดงเส้นทางจากผู้ใช้ ผ่านระบบบริการ ไปข้อมูล", "ภาพรายการตรวจการเชื่อมระบบและการส่งมอบ"],
  brands: ["ภาพเอกสารตัวตนและกลุ่มเป้าหมาย เชื่อมกับแนวทางสินค้าเสื้อผ้า", "ภาพกระดานอัตลักษณ์ ตัวอักษร สี และแนวทางใช้กับสินค้า", "ภาพแนวทางนำเสนอสินค้าและเนื้อหาบนเว็บไซต์และมือถือ"],
  media: ["ภาพเอกสารโจทย์ภาพและกระดาน Storyboard", "ภาพจำลองฉาก 3D วัตถุ กล้อง และทิศทางแสง", "ภาพแนวทางตรวจและส่งออกสื่อแนวนอนกับแนวตั้ง"],
  web: ["ภาพโครงสร้างหน้า Home เชื่อม Systems, Brands, Studio และ Digital", "ภาพ Wireframe เว็บไซต์และมือถือที่ใช้องค์ประกอบร่วมกัน", "ภาพตรวจ Responsive คีย์บอร์ด และโหมดลด Motion"],
};

export function CampusProcess({ zone, project = false }: { zone: CampusZoneKey; project?: boolean }) {
  const steps = project ? watcharinSteps : campusZones[zone].steps;
  return (
    <section className={`campus-process${project ? " campus-process-case" : ""}`} aria-label={project ? "ภาพสรุปการพัฒนา Creative Campus" : `กระบวนการทำงานใน ${campusZones[zone].name}`}>
      <div className="campus-process-intro">
        <span className="campus-eyebrow">IDEA / APPROACH / BUILD</span>
        {project ? <h3>จากโครงสร้างหน้า สู่เว็บที่ใช้งานได้.</h3> : <h2>เริ่มจากโจทย์ แล้วค่อยลงมือสร้าง.</h2>}
        <p>{project ? "ภาพสรุปขั้นตอนที่ใช้พัฒนา Creative Campus" : "ภาพอธิบายแนวทางทำงาน ตั้งแต่โจทย์แรกจนถึงการตรวจและส่งมอบ"}</p>
      </div>
      <ol>
        {steps.map((step, i) => (
          <li key={step.title} data-campus-reveal="">
            <Image src={`/campus/process/${zone}-${i + 1}.svg`} width={600} height={380} alt={altByZone[zone][i]} sizes="(max-width: 600px) 100vw, (max-width: 1200px) 33vw, 360px" />
            <div className="campus-process-copy">
              <span className="campus-eyebrow">0{i + 1} / {(["IDEA", "BUILD", "REVIEW"] as const)[i]}</span>
              {project ? <h4>{step.title}</h4> : <h3>{step.title}</h3>}
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
