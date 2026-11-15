"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { contactMailto, contactTopic, contactTopics } from "@/lib/contact-topics";

export function CampusContactDirect({ email, initialTopic = "" }: { email: string; initialTopic?: string }) {
  const [topic, setTopic] = useState(initialTopic);
  return (
    <aside className="campus-contact-direct">
      <span className="campus-eyebrow">DIRECT CONTACT</span>
      <h2>เล่าโจทย์ของคุณทางอีเมล</h2>
      <p>ชื่อโครงการ เป้าหมาย และสิ่งที่อยากให้ช่วย เป็นจุดเริ่มต้นที่ดีครับ</p>
      <label htmlFor="contact-topic">อยากคุยเรื่องไหน?</label>
      <select id="contact-topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
        <option value="">ยังไม่แน่ใจ / คุยภาพรวม</option>
        {contactTopics.map((item) => <option key={item.key} value={item.key}>{item.name} — {item.detail}</option>)}
      </select>
      <a className="campus-button" href={contactMailto(email, topic)}>เริ่มเขียนอีเมล ↗</a>
      <p className="campus-contact-hint">เปิดแอปอีเมลของคุณ พร้อมหัวข้อและคำถามเริ่มต้น</p>
    </aside>
  );
}

export function CampusContactPanel({ configured, email }: { configured: boolean; email: string }) {
  const search = useSearchParams();
  const topic = contactTopic(search.get("zone"))?.key ?? "";
  return configured
    ? <ContactForm key={topic} variant="campus" initialTopic={topic} contactEmail={email} />
    : <CampusContactDirect key={topic} email={email} initialTopic={topic} />;
}
