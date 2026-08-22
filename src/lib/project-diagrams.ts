/**
 * ไดอะแกรมของโปรเจกต์ — ชนิดข้อมูล ค่าคงที่ และแบบตั้งต้น
 *
 * ต้นฉบับเป็นข้อความภาษา mermaid ที่แปลงเป็นภาพฝั่งเบราว์เซอร์
 * เหตุผลที่เลือกเก็บเป็นข้อความอยู่หัวไฟล์ migration 0020
 */

export type ProjectDiagram = {
  id: string;
  title: string;
  source: string;
  sort: number;
  updated_at: string;
};

export const DIAGRAM_SELECT = "id, title, source, sort, updated_at";

/** ต้องตรงกับ CHECK project_diagrams_source_len ใน migration 0020 */
export const MAX_DIAGRAM_CHARS = 20000;

/**
 * แบบตั้งต้น — ตัวช่วยที่สำคัญที่สุดของฟีเจอร์นี้
 *
 * คนส่วนใหญ่ไม่เคยเขียน mermaid มาก่อน และหน้าจอที่เปิดมาแล้วเป็นช่องเปล่า
 * พร้อมคำว่า "พิมพ์ mermaid ที่นี่" คือหน้าจอที่ไม่มีใครได้ใช้
 * แบบตั้งต้นที่แก้ต่อได้ทันทีเปลี่ยนโจทย์จาก "เขียนเป็นไหม" เป็น "แก้ชื่อกล่อง"
 *
 * ตัวอย่างจงใจใช้เรื่องที่เจอจริงในงานโรงงาน ไม่ใช่ A → B → C
 * เพราะคนอ่านจะได้เห็นทันทีว่าเอาไปใช้กับงานตัวเองยังไง
 */
export const DIAGRAM_TEMPLATES: { id: string; label: string; hint: string; source: string }[] = [
  {
    id: "flow",
    label: "ผังการไหลของข้อมูล",
    hint: "ของวิ่งจากไหนไปไหน — ใช้บ่อยที่สุด",
    source: `flowchart LR
  PLC[PLC หน้างาน] -->|OPC UA| ADP[Scada Adapter]
  ADP -->|JSON / MQTT| BROKER{{MQTT Broker}}
  BROKER --> API[API รับข้อมูล]
  API --> DB[(ฐานข้อมูล)]
  DB --> WEB[Web Dashboard]
  DB --> TAB[แท็บเล็ตหน้างาน]`,
  },
  {
    id: "sequence",
    label: "ลำดับการคุยกัน",
    hint: "ใครเรียกใครก่อนหลัง — ใช้ตอนออกแบบ API",
    source: `sequenceDiagram
  participant T as แท็บเล็ต
  participant A as API
  participant D as ฐานข้อมูล

  T->>A: สแกนบัตร (rfid)
  A->>D: หาพนักงานจากรหัสบัตร
  D-->>A: ข้อมูลพนักงาน
  A-->>T: เปิดงานให้ พร้อมรายการที่ต้องทำ
  Note over T,A: ถ้าบัตรไม่มีในระบบ<br/>ตอบ 404 แล้วให้หน้างานแจ้งหัวหน้ากะ`,
  },
  {
    id: "er",
    label: "ผังตารางข้อมูล",
    hint: "ตารางไหนอ้างตารางไหน",
    source: `erDiagram
  PROJECTS ||--o{ TASKS : "มีงาน"
  TASKS ||--o{ TASK_FILES : "มีไฟล์แนบ"
  PROJECTS ||--o{ MEMBERS : "มีคน"

  PROJECTS {
    uuid id PK
    text slug
  }
  TASKS {
    uuid id PK
    text title
    text description
  }`,
  },
  {
    id: "state",
    label: "ผังสถานะ",
    hint: "ของชิ้นหนึ่งเปลี่ยนสถานะยังไงได้บ้าง",
    source: `stateDiagram-v2
  [*] --> รอทำ
  รอทำ --> กำลังทำ: มอบหมายแล้ว
  กำลังทำ --> รอตรวจ: ส่งงาน
  รอตรวจ --> กำลังทำ: ตีกลับ
  รอตรวจ --> เสร็จแล้ว: ผ่าน
  เสร็จแล้ว --> [*]`,
  },
];

/**
 * ข้อความ error ของ mermaid เป็นอังกฤษล้วนและอ้างหมายเลขบรรทัดในต้นฉบับ
 * เก็บบรรทัดไว้ให้ แต่เติมคำนำหน้าที่บอกว่าต้องไปดูตรงไหน
 */
export function diagramErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const first = raw.split("\n").find((l) => l.trim().length > 0) ?? "อ่านผังไม่ออก";
  return `เขียนผังยังไม่ถูก — ${first.trim()}`;
}
