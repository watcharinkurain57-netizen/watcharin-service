"use client";

import { useEffect } from "react";
import { LAYERS, TOPICS, TOPIC_ORDER, type Layer, type TopicId } from "@/lib/ai-map";
import {
  resetReviewed,
  revealTopic,
  selectTopic,
  useIsDesktop,
  useReviewed,
  useSelectedTopic,
} from "./store";
import { NEW_BADGE, TONE } from "./tones";
import { TopicPanel } from "./TopicPanel";
import { TopicSheet } from "./TopicSheet";

type ChipState = "idle" | "on" | "linked" | "dim";

// ประกาศนอกคอมโพเนนต์ให้อ้างอิงคงที่ — effect ที่ฟัง Esc ของแผ่นซ้อนหน้าจะได้ไม่ผูกใหม่ทุกเรนเดอร์
const clearSelection = () => selectTopic(null);

/** กดจากในแผงรายละเอียด แผนที่อยู่ในจออยู่แล้ว ขยับแค่พอให้เห็นปุ่มที่เลือก */
const pickNearby = (id: TopicId) => revealTopic(id, "nearest");

/**
 * แผนที่ 5 ชั้น + แผงรายละเอียด
 *
 * จอใหญ่: แผงติดอยู่ข้างแผนที่ เห็นรายละเอียดกับเส้นเชื่อมบนแผนที่ไปพร้อมกัน
 * จอเล็ก: ไม่มีที่ให้วางข้างกัน รายละเอียดจึงเปิดเป็นแผ่นซ้อนหน้าแทน
 *
 * “เชื่อมกัน” แสดงด้วยการเรืองปุ่มที่เกี่ยวข้องและทำที่เหลือให้จาง
 * แทนการลากเส้นจริง — ปุ่มขยับตำแหน่งตามความกว้างจอ เส้นที่ลากไว้จะเพี้ยนทุกครั้งที่จอเปลี่ยน
 * และชุดที่เรืองคือชุดเดียวกับรายการ “เชื่อมกับ” ในแผง จะได้ไม่เห็นไม่ตรงกัน
 */
export function AiMap() {
  const selected = useSelectedTopic();
  const reviewed = useReviewed();
  const isDesktop = useIsDesktop();

  const linked = new Set(selected ? TOPICS[selected].links.map((l) => l.to) : []);

  const stateOf = (id: TopicId): ChipState => {
    if (!selected) return "idle";
    if (id === selected) return "on";
    return linked.has(id) ? "linked" : "dim";
  };

  // Esc บนจอใหญ่ = กลับไปหน้าภาพรวม (จอเล็กให้แผ่นซ้อนหน้าจัดการเอง)
  useEffect(() => {
    if (!selected || !isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, isDesktop]);

  // หัวข้อถัดไปที่ยังไม่ได้ติ๊ก — เริ่มนับต่อจากหัวข้อที่เปิดอยู่ ไม่ใช่วนกลับไปต้นแผนที่ทุกครั้ง
  const start = selected ? TOPIC_ORDER.indexOf(selected) + 1 : 0;
  let nextToReview: TopicId | null = null;
  for (let i = 0; i < TOPIC_ORDER.length; i++) {
    const id = TOPIC_ORDER[(start + i) % TOPIC_ORDER.length];
    if (!reviewed.has(id)) {
      nextToReview = id;
      break;
    }
  }

  return (
    <section
      id="layers"
      aria-labelledby="layers-title"
      className="bg-surface-overlay/60 pb-12 pt-12 sm:pb-16 sm:pt-16 lg:pb-4"
    >
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="max-w-2xl">
            <span className="mb-3 inline-block rounded-full bg-brand-100 px-3.5 py-1.5 text-[0.78rem] font-bold text-brand-700">
              แผนที่ 5 ชั้น
            </span>
            <h2
              id="layers-title"
              className="text-2xl font-extrabold leading-tight tracking-tight text-balance sm:text-3xl"
            >
              กดที่หัวข้อ <span className="text-brand-600">แล้วดูว่ามันต่อกับอะไร</span>
            </h2>
            <p className="mt-2.5 max-w-[52ch] text-[0.98rem] text-ink-muted">
              หัวข้อที่เชื่อมกับตัวที่เลือกจะเรืองขึ้นมา ส่วนที่เหลือจะจางลง — ชั้นล่างสุดคือตัวโมเดล
              ยิ่งขึ้นไปยิ่งใกล้การใช้งานจริง
            </p>
          </div>

          <Progress done={reviewed.size} total={TOPIC_ORDER.length} next={nextToReview} />
        </div>

        {/* lg:pb-12 (คู่กับ lg:pb-4 ของ section) — ระยะห่างท้ายส่วนเท่าเดิม แต่ย้ายเข้ามาอยู่ในกริด
            แผงข้างที่ติดหน้าจอ (sticky) เลื่อนได้ไกลแค่ขอบล่างของกริด ถ้าไม่ต่อกริดลงมา
            พอเลื่อนมาดูชั้น Model แผงจะโดนดันขึ้นไปมุดใต้แถบบน จนแถวปุ่ม “ปิด” หายไป */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start lg:pb-12">
          <ol className="grid gap-3">
            {LAYERS.map((layer) => (
              <LayerCard
                key={layer.id}
                layer={layer}
                stateOf={stateOf}
                reviewed={reviewed}
              />
            ))}
          </ol>

          {/* แผงข้าง — มีเฉพาะจอใหญ่ จอเล็กใช้ TopicSheet ข้างล่างแทน */}
          <aside aria-label="รายละเอียดหัวข้อ" className="hidden lg:sticky lg:top-24 lg:block">
            <div className="flex max-h-[calc(100dvh-7.5rem)] flex-col overflow-hidden rounded-3xl border border-line bg-surface-raised shadow-sm">
              {selected ? (
                <TopicPanel
                  id={selected}
                  headingId="ai-map-panel-title"
                  onClose={clearSelection}
                  onPick={pickNearby}
                />
              ) : (
                <Overview next={nextToReview} />
              )}
            </div>
          </aside>
        </div>
      </div>

      {selected && !isDesktop && (
        <TopicSheet id={selected} onClose={clearSelection} onPick={pickNearby} />
      )}
    </section>
  );
}

function LayerCard({
  layer,
  stateOf,
  reviewed,
}: {
  layer: Layer;
  stateOf: (id: TopicId) => ChipState;
  reviewed: ReadonlySet<TopicId>;
}) {
  return (
    <li
      id={`layer-${layer.id}`}
      className="scroll-mt-24 rounded-3xl border border-line bg-surface-raised p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`grid size-10 flex-none place-items-center rounded-2xl font-mono text-lg font-black ${TONE[layer.id].num}`}
        >
          {layer.no}
        </span>
        <div className="min-w-0">
          <h3 className="text-[1.05rem] font-extrabold tracking-tight">
            <span className="sr-only">ชั้น {layer.no}: </span>
            {layer.name} <span className="font-semibold text-ink-muted">· {layer.th}</span>
          </h3>
          <p className="text-[0.9rem] text-ink-muted">{layer.blurb}</p>
        </div>
      </div>

      {layer.rows.map((row, i) => (
        <div key={i} className="mt-4">
          {row.label && (
            <p className="mb-2 text-[0.78rem] font-bold tracking-wide text-ink-faint">{row.label}</p>
          )}
          <div className={`grid gap-2 ${row.topics.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {row.topics.map((id) => (
              <TopicChip key={id} id={id} state={stateOf(id)} done={reviewed.has(id)} />
            ))}
          </div>
        </div>
      ))}
    </li>
  );
}

function TopicChip({ id, state, done }: { id: TopicId; state: ChipState; done: boolean }) {
  const topic = TOPICS[id];
  const tone = TONE[topic.layer];

  const look =
    state === "on"
      ? tone.on
      : state === "linked"
        ? tone.linked
        : `${tone.chip} ${state === "dim" ? "opacity-45 hover:opacity-100" : ""}`;

  return (
    <button
      // id เดียวกับ hash ของหัวข้อ — เปิดลิงก์ /ai-map#mcp แล้วเบราว์เซอร์เลื่อนมาที่ปุ่มนี้เอง
      id={id}
      type="button"
      aria-pressed={state === "on"}
      onClick={() => selectTopic(state === "on" ? null : id)}
      className={`flex w-full scroll-mt-28 flex-col items-start rounded-2xl border px-3.5 py-3 text-left transition-[opacity,border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none ${look}`}
    >
      <span className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-bold tracking-tight">{topic.name}</span>
        {topic.badge && <span className={NEW_BADGE}>{topic.badge}</span>}
        {state === "linked" && (
          <span className={`text-[0.72rem] font-bold ${tone.text}`}>
            ● เชื่อมกัน<span className="sr-only">กับหัวข้อที่เลือก</span>
          </span>
        )}
        {done && (
          <span className="ml-auto grid size-5 place-items-center rounded-full bg-brand-600 text-[0.68rem] font-black text-white">
            <span aria-hidden="true">✓</span>
            <span className="sr-only">ทบทวนแล้ว</span>
          </span>
        )}
      </span>
      <span className="mt-0.5 text-[0.86rem] leading-snug text-ink-muted">{topic.tagline}</span>
    </button>
  );
}

function Progress({ done, total, next }: { done: number; total: number; next: TopicId | null }) {
  return (
    <div className="w-full rounded-2xl border border-line bg-surface-raised p-4 shadow-sm sm:w-80">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.92rem] font-bold">
          ทบทวนแล้ว {done} / {total}
        </p>
        {done > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("ล้างเครื่องหมาย “ทบทวนแล้ว” ทั้งหมด แล้วเริ่มใหม่?")) resetReviewed();
            }}
            className="text-[0.8rem] font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            เริ่มใหม่
          </button>
        )}
      </div>

      <div
        role="progressbar"
        aria-label="ความคืบหน้าการทบทวน"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-overlay"
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      {next ? (
        <button
          type="button"
          onClick={() => revealTopic(next)}
          className="mt-3 text-left text-[0.88rem] font-bold text-brand-700 hover:underline"
        >
          ทบทวนต่อ: {TOPICS[next].name} →
        </button>
      ) : (
        <p className="mt-3 text-[0.88rem] font-bold text-brand-700">ครบทุกหัวข้อแล้ว</p>
      )}
      <p className="mt-1 text-[0.78rem] text-ink-faint">จำไว้ในเบราว์เซอร์เครื่องนี้ ไม่ต้องล็อกอิน</p>
    </div>
  );
}

/** แผงข้างตอนยังไม่ได้เลือกอะไร — วิธีอ่านแผนที่ */
function Overview({ next }: { next: TopicId | null }) {
  return (
    <div className="min-h-0 overflow-y-auto p-5">
      <p className="text-[0.8rem] font-bold tracking-wide text-brand-700">วิธีอ่านแผนที่</p>
      <p className="mt-2 font-mono text-[1.2rem] font-black tracking-tight">Agent = Model + Harness</p>
      <p className="mt-2 text-[0.93rem] leading-relaxed text-ink-muted">
        โมเดลคือสมอง ส่วนคำอื่นเกือบทั้งหมดคือสิ่งที่สร้างล้อมสมองไว้ ให้ทำงานได้จริง ปลอดภัย
        วัดผลได้ และไม่แพงเกินไป
      </p>

      <ul className="mt-5 space-y-3 text-[0.9rem]">
        <li className="flex items-center gap-3">
          <span className="h-7 w-11 flex-none rounded-lg border border-brand-600 bg-brand-50 ring-4 ring-brand-500/15" />
          หัวข้อที่เลือก
        </li>
        <li className="flex items-center gap-3">
          <span className="h-7 w-11 flex-none rounded-lg border border-brand-400 bg-brand-50/70" />
          เชื่อมกับหัวข้อที่เลือก
        </li>
        <li className="flex items-center gap-3">
          <span className="h-7 w-11 flex-none rounded-lg border border-line bg-surface opacity-45" />
          ไม่เกี่ยวข้องโดยตรง
        </li>
        <li className="flex items-center gap-3">
          <span className="grid w-11 flex-none place-items-center">
            <span className="grid size-5 place-items-center rounded-full bg-brand-600 text-[0.68rem] font-black text-white">
              ✓
            </span>
          </span>
          ทบทวนแล้ว
        </li>
        <li className="flex items-center gap-3">
          <span className="grid w-11 flex-none place-items-center">
            <span className={NEW_BADGE}>ใหม่</span>
          </span>
          คำที่เพิ่งเกิดหรือเพิ่งเปลี่ยนในปี 2026
        </li>
      </ul>

      <div className="mt-5 rounded-2xl bg-surface-overlay px-4 py-3 text-[0.9rem]">
        <p className="font-bold">วงจรพัฒนา</p>
        <p className="mt-1 leading-relaxed text-ink-muted">
          Observability → Evals → ปรับชั้น 1–4 → deploy → วนใหม่
        </p>
      </div>

      {next && (
        <button
          type="button"
          onClick={() => revealTopic(next)}
          className="mt-5 w-full rounded-full bg-brand-600 px-5 py-3 text-[0.92rem] font-bold text-white shadow-sm shadow-brand-600/25 transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none"
        >
          เริ่มทบทวน: {TOPICS[next].name}
        </button>
      )}
      <p className="mt-3 text-center text-[0.78rem] text-ink-faint">กด Esc เพื่อกลับมาหน้านี้</p>
    </div>
  );
}
