"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? ""),
      message: String(data.get("message") ?? ""),
      website: String(data.get("website") ?? ""),
    };

    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "ส่งข้อความไม่สำเร็จ กรุณาลองใหม่");
        return;
      }

      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
      setErrorMsg("เครือข่ายมีปัญหา กรุณาลองใหม่อีกครั้ง");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-brand-400/20 border border-brand-300/40 flex items-center justify-center text-3xl mb-4">
          ✓
        </div>
        <h3 className="text-2xl font-bold mb-2">ส่งข้อความเรียบร้อย!</h3>
        <p className="text-slate-300 mb-6">
          ผมจะติดต่อกลับภายใน 24 ชั่วโมง ขอบคุณที่ติดต่อเข้ามาครับ
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-brand-300 hover:text-brand-200 font-semibold text-sm"
        >
          ส่งข้อความอีกครั้ง →
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full bg-white/5 backdrop-blur border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/60 focus:border-brand-400/60 transition";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-6 md:p-8 text-left space-y-4"
    >
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px" }}
      >
        <label>
          Website (leave blank)
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="contact-name"
            className="block text-sm font-medium text-slate-200 mb-1.5"
          >
            ชื่อ
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={80}
            disabled={status === "submitting"}
            placeholder="ชื่อของคุณ"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor="contact-email"
            className="block text-sm font-medium text-slate-200 mb-1.5"
          >
            อีเมล
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={120}
            disabled={status === "submitting"}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="block text-sm font-medium text-slate-200 mb-1.5"
        >
          ข้อความ
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={5}
          disabled={status === "submitting"}
          placeholder="เล่าเกี่ยวกับโปรเจคที่คุณอยากให้ช่วย — requirement งบประมาณ ไอเดียคร่าวๆ"
          className={inputClass + " resize-none"}
        />
      </div>

      {status === "error" && errorMsg && (
        <div className="bg-red-500/10 border border-red-400/30 text-red-200 text-sm px-4 py-3 rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
        <p className="text-xs text-slate-400">
          ข้อมูลของคุณจะใช้เพื่อตอบกลับเท่านั้น
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="gradient-btn text-white font-semibold px-8 py-3.5 rounded-full text-base disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 min-w-[180px]"
        >
          {status === "submitting" ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              กำลังส่ง...
            </>
          ) : (
            <>ส่งข้อความ →</>
          )}
        </button>
      </div>
    </form>
  );
}
