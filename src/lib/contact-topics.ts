export const contactTopics = [
  { key: "systems", name: "Systems Lab", detail: "ระบบองค์กร / ServiceNow / เชื่อมต่อข้อมูล" },
  { key: "brands", name: "Brand House", detail: "แบรนด์ / เสื้อผ้า / อาหารและบรรจุภัณฑ์" },
  { key: "media", name: "Creative Studio", detail: "3D / ภาพโฆษณา / Motion" },
  { key: "web", name: "Digital Garage", detail: "เว็บไซต์ / แอปพลิเคชัน / Software" },
] as const;

export function contactTopic(key: unknown) {
  return contactTopics.find((topic) => topic.key === key);
}

export function contactMailto(email: string, topicKey: string) {
  const topic = contactTopic(topicKey);
  const subject = `คุยเรื่องโครงการ${topic ? ` / ${topic.name}` : ""} / Watcharin Service`;
  const body = [
    "สวัสดีครับ Watcharin", "",
    ...(topic ? [`สนใจงาน: ${topic.name} — ${topic.detail}`, ""] : []),
    "ชื่อ / บริษัท:", "ชื่อโครงการ:", "เป้าหมายและสิ่งที่อยากให้ช่วย:",
    "ช่วงเวลาที่ต้องการ:", "ลิงก์หรือข้อมูลประกอบ (ถ้ามี):",
  ].join("\n");
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
