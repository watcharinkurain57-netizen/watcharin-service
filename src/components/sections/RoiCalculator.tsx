"use client";

import { useState } from "react";

/**
 * Turns a factory owner's own numbers into a payback period.
 *
 * The audience here is the person who signs the cheque, so every output is in
 * baht and months rather than OEE points. Two deliberate choices:
 *
 * - No industry statistics are asserted. The downtime-reduction figure is the
 *   visitor's own assumption with a conservative default, because quoting
 *   "MES cuts downtime 30%" as fact would be a claim we cannot stand behind —
 *   and a sceptical owner discounts numbers they did not choose anyway.
 * - Every formula is shown. Someone deciding on a six-figure purchase should be
 *   able to check the arithmetic, and being able to check it is what makes the
 *   result persuasive.
 */

/** Deterministic grouping — avoids any ICU difference between Node and browser. */
function fmt(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function fmtMillions(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} ล้านบาท`;
  return `${fmt(n)} บาท`;
}

type Field = {
  key: keyof Inputs;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

type Inputs = {
  hoursPerDay: number;
  daysPerMonth: number;
  downtimeHours: number;
  valuePerHour: number;
  reduction: number;
  investment: number;
};

const DEFAULTS: Inputs = {
  hoursPerDay: 16,
  daysPerMonth: 26,
  downtimeHours: 40,
  // A gross-margin figure, not revenue — see the field hint.
  valuePerHour: 12000,
  reduction: 20,
  investment: 800000,
};

const FIELDS: readonly Field[] = [
  {
    key: "hoursPerDay",
    label: "ชั่วโมงเดินเครื่องต่อวัน",
    hint: "รวมทุกกะ",
    min: 1,
    max: 24,
    step: 1,
    unit: "ชม.",
  },
  {
    key: "daysPerMonth",
    label: "วันผลิตต่อเดือน",
    hint: "",
    min: 1,
    max: 31,
    step: 1,
    unit: "วัน",
  },
  {
    key: "downtimeHours",
    label: "เครื่องหยุดไม่ได้วางแผน ต่อเดือน",
    hint: "เสีย ปรับตั้ง รอของ รวมกัน",
    min: 0,
    max: 300,
    step: 1,
    unit: "ชม.",
  },
  {
    key: "valuePerHour",
    label: "กำไรขั้นต้นต่อชั่วโมงเดินเครื่อง",
    // Deliberately margin, not revenue: an hour of downtime costs the margin on
    // what would have been made, not the whole sales price. Using revenue here
    // inflates the result, and the person reading this knows that.
    hint: "ใช้กำไรขั้นต้น ไม่ใช่ยอดขาย — เครื่องหยุดทำให้เสียกำไรส่วนที่ควรได้ ไม่ใช่ยอดขายทั้งก้อน",
    min: 0,
    max: 2000000,
    step: 1000,
    unit: "บาท",
  },
];

export function RoiCalculator() {
  const [v, setV] = useState<Inputs>(DEFAULTS);

  const set = (key: keyof Inputs) => (raw: string) => {
    const n = Number(raw.replace(/[^\d.]/g, ""));
    setV((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  };

  const lostHoursYear = v.downtimeHours * 12;
  const lostBahtYear = lostHoursYear * v.valuePerHour;
  const recoveredHours = lostHoursYear * (v.reduction / 100);
  const savingYear = recoveredHours * v.valuePerHour;
  const paybackMonths = savingYear > 0 ? (v.investment / savingYear) * 12 : Infinity;
  const firstYearNet = savingYear - v.investment;
  const lostWhileWaiting = (lostBahtYear / 12) * 6;
  const capacityHoursYear = v.hoursPerDay * v.daysPerMonth * 12;
  const downtimeShare =
    capacityHoursYear > 0 ? (lostHoursYear / capacityHoursYear) * 100 : 0;

  const paybackText =
    !Number.isFinite(paybackMonths) || savingYear <= 0
      ? "—"
      : paybackMonths < 1
        ? "ไม่ถึง 1 เดือน"
        : paybackMonths <= 36
          ? `~${paybackMonths.toFixed(1)} เดือน`
          : "เกิน 3 ปี";

  return (
    <section id="roi" className="mt-16 scroll-fade">
      <div className="text-center mb-8">
        <div className="inline-block px-3 py-1 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/30 text-sm font-medium mb-4">
          คุ้มหรือไม่
        </div>
        <h3 className="text-2xl md:text-3xl font-extrabold mb-2">
          ใส่ตัวเลขโรงงานคุณ แล้วดูว่า<span className="gradient-text">คืนทุนกี่เดือน</span>
        </h3>
        <p className="text-ink-muted max-w-2xl mx-auto">
          เครื่องหยุดคือเงินที่หายไปทุกชั่วโมง คำนวณจากตัวเลขจริงของคุณก่อนตัดสินใจ
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-start">
        {/* ---------- inputs ---------- */}
        <div className="bg-surface-raised border border-line rounded-2xl p-6">
          <div className="text-xs font-bold text-ink-faint tracking-widest mb-5">
            ตัวเลขของโรงงานคุณ
          </div>

          <div className="space-y-5">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label
                  htmlFor={`roi-${f.key}`}
                  className="flex items-baseline justify-between gap-3 mb-1.5"
                >
                  <span className="text-sm font-medium text-ink">{f.label}</span>
                  <span className="text-xs text-ink-faint">{f.unit}</span>
                </label>
                <input
                  id={`roi-${f.key}`}
                  type="text"
                  inputMode="numeric"
                  value={fmt(v[f.key])}
                  onChange={(e) => set(f.key)(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink font-semibold tabular-nums focus:border-brand-400/50 focus:outline-none transition"
                />
                {f.hint ? (
                  <p className="text-xs text-ink-faint mt-1.5">{f.hint}</p>
                ) : null}
              </div>
            ))}

            <div>
              <label htmlFor="roi-reduction" className="block mb-1.5">
                <span className="text-sm font-medium text-ink">
                  คาดว่าลดเวลาเครื่องหยุดได้
                </span>
                <span className="ml-2 text-brand-300 font-bold tabular-nums">
                  {v.reduction}%
                </span>
              </label>
              <input
                id="roi-reduction"
                type="range"
                min={5}
                max={40}
                step={1}
                value={v.reduction}
                onChange={(e) => set("reduction")(e.target.value)}
                className="w-full accent-brand-500"
              />
              <p className="text-xs text-ink-faint mt-1.5">
                นี่คือ<strong className="text-ink-muted">สมมติฐานของคุณ</strong> ไม่ใช่ตัวเลขที่เรารับประกัน
                — วิธีพิสูจน์คือเริ่มที่ไลน์เดียว (Plan A) แล้ววัดของจริง
              </p>
            </div>

            <div>
              <label htmlFor="roi-investment" className="flex items-baseline justify-between gap-3 mb-1.5">
                <span className="text-sm font-medium text-ink">เงินลงทุนที่ประเมินไว้</span>
                <span className="text-xs text-ink-faint">บาท</span>
              </label>
              <input
                id="roi-investment"
                type="text"
                inputMode="numeric"
                value={fmt(v.investment)}
                onChange={(e) => set("investment")(e.target.value)}
                className="w-full bg-surface border border-line rounded-xl px-4 py-3 text-ink font-semibold tabular-nums focus:border-brand-400/50 focus:outline-none transition"
              />
              <p className="text-xs text-ink-faint mt-1.5">
                ใส่งบที่คิดไว้ได้เลย เราจะสรุปขอบเขตงานกับราคาจริงให้ก่อนเริ่มเสมอ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setV(DEFAULTS)}
            className="mt-5 text-xs text-ink-faint hover:text-ink-muted transition"
          >
            ↺ กลับไปค่าเริ่มต้น
          </button>
        </div>

        {/* ---------- results ---------- */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-brand-500/10 to-surface-raised border border-brand-500/30 rounded-2xl p-6">
            <div className="text-xs font-bold text-brand-300 tracking-widest mb-2">
              คืนทุนประมาณ
            </div>
            <div className="text-5xl font-extrabold tabular-nums mb-1">{paybackText}</div>
            <p className="text-sm text-ink-muted">
              จากเงินลงทุน {fmtMillions(v.investment)} เทียบกับที่ประหยัดได้ปีละ{" "}
              {fmtMillions(savingYear)}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-surface-raised border border-line rounded-2xl p-5">
              <div className="text-xs text-ink-faint mb-1">เครื่องหยุดทำให้เสียโอกาสปีละ</div>
              <div className="text-2xl font-extrabold text-red-400 tabular-nums">
                {fmtMillions(lostBahtYear)}
              </div>
              <div className="text-xs text-ink-faint mt-1.5">
                {fmt(lostHoursYear)} ชม./ปี — คิดเป็น {downtimeShare.toFixed(1)}% ของเวลาเดินเครื่อง
              </div>
            </div>
            <div className="bg-surface-raised border border-line rounded-2xl p-5">
              <div className="text-xs text-ink-faint mb-1">ประหยัดได้ปีละ (ตามสมมติฐาน)</div>
              <div className="text-2xl font-extrabold text-brand-300 tabular-nums">
                {fmtMillions(savingYear)}
              </div>
              <div className="text-xs text-ink-faint mt-1.5">
                ได้เวลาเดินเครื่องคืน {fmt(recoveredHours)} ชม./ปี
              </div>
            </div>
            <div className="bg-surface-raised border border-line rounded-2xl p-5">
              <div className="text-xs text-ink-faint mb-1">ผลต่างปีแรก</div>
              <div
                className={`text-2xl font-extrabold tabular-nums ${firstYearNet >= 0 ? "text-brand-300" : "text-amber-300"}`}
              >
                {firstYearNet >= 0 ? "+" : "−"}
                {fmtMillions(Math.abs(firstYearNet))}
              </div>
              <div className="text-xs text-ink-faint mt-1.5">
                {firstYearNet >= 0 ? "คืนทุนแล้วภายในปีแรก" : "คืนทุนต่อในปีที่สอง"}
              </div>
            </div>
            <div className="bg-surface-raised border border-line rounded-2xl p-5">
              <div className="text-xs text-ink-faint mb-1">ถ้ารออีก 6 เดือน</div>
              <div className="text-2xl font-extrabold text-amber-300 tabular-nums">
                {fmtMillions(lostWhileWaiting)}
              </div>
              <div className="text-xs text-ink-faint mt-1.5">
                คือเงินที่ยังไหลออกระหว่างที่ยังไม่เห็นข้อมูล
              </div>
            </div>
          </div>

          <details className="group bg-surface-raised border border-line rounded-2xl">
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-ink-muted flex items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span>ดูวิธีคิดทั้งหมด</span>
              <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-ink-muted space-y-2 leading-relaxed">
              <p>
                เสียโอกาสต่อปี = เครื่องหยุดต่อเดือน × 12 × มูลค่าต่อชั่วโมง
              </p>
              <p>ประหยัดต่อปี = เสียโอกาสต่อปี × % ที่คุณคาดว่าลดได้</p>
              <p>คืนทุน (เดือน) = เงินลงทุน ÷ ประหยัดต่อปี × 12</p>
              <p className="text-ink-faint pt-2 border-t border-line">
                ตัวเลขทั้งหมดเป็นการประมาณจากสมมติฐานที่คุณกรอกเอง ไว้ใช้ตั้งต้นคุยกัน
                ไม่ใช่การรับประกันผล ของจริงขึ้นกับสาเหตุที่ทำให้เครื่องหยุดในโรงงานคุณ
                ซึ่งเป็นเหตุผลที่เราแนะนำให้เริ่มจากไลน์เดียวเพื่อวัดก่อนขยาย
              </p>
            </div>
          </details>

          <div className="flex flex-wrap gap-3">
            <a
              href="#contact"
              className="gradient-btn text-white font-semibold px-6 py-3.5 rounded-full text-base inline-flex items-center gap-2"
            >
              เอาตัวเลขนี้ไปคุยต่อ (ฟรี) →
            </a>
            <a
              href="/coresync"
              className="bg-surface-raised border border-line text-ink font-semibold px-6 py-3.5 rounded-full text-base inline-flex items-center gap-2 transition hover:border-brand-400/50 hover:text-brand-300"
            >
              ▣ ดูตัวอย่าง dashboard
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
