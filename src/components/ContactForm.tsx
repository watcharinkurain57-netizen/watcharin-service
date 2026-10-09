"use client";

import { useEffect, useRef, useState } from "react";
import { contactMailto, contactTopics } from "@/lib/contact-topics";

type Status = "idle" | "submitting" | "success" | "error";
type Props = { variant?: "dark" | "campus"; initialTopic?: string; contactEmail?: string };

export function ContactForm({ variant = "dark", initialTopic = "", contactEmail = "watcharin@watcharin-service.com" }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [topic, setTopic] = useState(initialTopic);
  const resultRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const restartRef = useRef(false);
  const submittingRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);
  const attemptRef = useRef<{ signature: string; id: string } | null>(null);

  useEffect(() => {
    if (status === "success" || status === "error") resultRef.current?.focus();
    if (status === "idle" && restartRef.current) {
      nameRef.current?.focus();
      restartRef.current = false;
    }
  }, [status]);
  useEffect(() => () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      website: String(data.get("website") ?? ""),
      topic,
    };
    const signature = JSON.stringify(payload);
    if (attemptRef.current?.signature !== signature) {
      attemptRef.current = { signature, id: crypto.randomUUID() };
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    submittingRef.current = true;
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const response = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestId: attemptRef.current!.id }),
        signal: controller.signal,
      });
      const json = await response.json().catch(() => ({})) as { ok?: boolean; error?: string };
      if (!response.ok || json.ok !== true) {
        setStatus("error");
        setErrorMsg(typeof json.error === "string" ? json.error : "ยังยืนยันการส่งไม่ได้ กรุณาลองอีกครั้ง");
        return;
      }
      setStatus("success");
      form.reset();
      attemptRef.current = null;
    } catch {
      if (controllerRef.current !== controller) return;
      setStatus("error");
      setErrorMsg("ยังยืนยันการส่งไม่ได้ กรุณาลองอีกครั้งหรือติดต่อทางอีเมล ข้อความที่กรอกยังอยู่ครับ");
    } finally {
      clearTimeout(timeout);
      submittingRef.current = false;
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }

  const panelClass = `contact-form-panel ${variant === "campus" ? "contact-form-campus" : ""} bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-6 md:p-8 text-left`;
  if (status === "success") {
    return (
      <div ref={resultRef} tabIndex={-1} role="status" className={`${panelClass} contact-form-success text-center`}>
        <span className="contact-success-icon flex w-14 h-14 mx-auto mb-6 items-center justify-center rounded-full border border-current text-2xl" aria-hidden="true">✓</span>
        <h2 className="text-2xl font-bold mb-2">รับคำขอของคุณแล้วครับ</h2>
        <p className="text-slate-300 mb-6">ขอบคุณที่เล่าเรื่องเข้ามา โปรดติดตามการตอบกลับทางอีเมลที่ให้ไว้</p>
        <button onClick={() => { restartRef.current = true; setStatus("idle"); }} className="contact-reset text-brand-300 font-semibold text-sm">ส่งข้อความอีกครั้ง →</button>
      </div>
    );
  }
  const inputClass = "w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60 transition";
  return (
    <form onSubmit={handleSubmit} className={`${panelClass} space-y-4`} aria-busy={status === "submitting"}>
      {variant === "campus" && <div><span className="campus-eyebrow">START A CONVERSATION</span><h2>เล่าเรื่องที่อยากทำ</h2></div>}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px" }}>
        <label>Website (leave blank)<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-sm font-medium text-slate-200 mb-1.5">ชื่อ</label>
          <input ref={nameRef} id="contact-name" name="name" type="text" autoComplete="name" required minLength={2} maxLength={80} disabled={status === "submitting"} placeholder="ชื่อของคุณ" className={inputClass} />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-sm font-medium text-slate-200 mb-1.5">อีเมล</label>
          <input id="contact-email" name="email" type="email" autoComplete="email" required maxLength={120} disabled={status === "submitting"} placeholder="you@example.com" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="contact-topic" className="block text-sm font-medium text-slate-200 mb-1.5">อยากคุยเรื่องไหน?</label>
        <select id="contact-topic" name="topic" value={topic} onChange={(event) => setTopic(event.target.value)} disabled={status === "submitting"} className={inputClass}>
          <option value="" className={variant === "dark" ? "bg-slate-950" : undefined}>ยังไม่แน่ใจ / คุยภาพรวม</option>
          {contactTopics.map((item) => <option key={item.key} value={item.key} className={variant === "dark" ? "bg-slate-950" : undefined}>{item.name} — {item.detail}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="contact-message" className="block text-sm font-medium text-slate-200 mb-1.5">ข้อความ</label>
        <textarea id="contact-message" name="message" required minLength={10} maxLength={4000} rows={5} disabled={status === "submitting"} placeholder="ชื่อโครงการ เป้าหมาย สิ่งที่อยากให้ช่วย และช่วงเวลาที่ต้องการ" className={inputClass + " resize-y"} />
      </div>
      {status === "error" && errorMsg && (
        <div ref={resultRef} tabIndex={-1} role="alert" className="contact-error bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-lg">
          {errorMsg} <a href={contactMailto(contactEmail, topic)} className="underline">เขียนอีเมลแทน ↗</a>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <p className="text-xs text-slate-400">ใช้ข้อมูลนี้เพื่อติดต่อกลับเกี่ยวกับคำขอของคุณ</p>
        <button type="submit" disabled={status === "submitting"} className="gradient-btn text-white font-semibold px-8 py-3.5 rounded-full text-base disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 min-w-[180px]">
          {status === "submitting" ? <><span aria-hidden="true" className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />กำลังส่ง...</> : "ส่งข้อความ →"}
        </button>
      </div>
    </form>
  );
}
