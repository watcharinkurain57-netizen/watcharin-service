"use client";

import type { ReactNode } from "react";
import { LAYER_BY_ID, TOPICS, TOPIC_ORDER, type TopicId } from "@/lib/ai-map";
import { RichText } from "./RichText";
import { setReviewed, useReviewed } from "./store";
import { NEW_BADGE, TONE } from "./tones";

/**
 * เนื้อหาของหัวข้อหนึ่ง พร้อมแถบบนและแถบล่าง
 * ใช้ทั้งในแผงข้างแผนที่ (จอใหญ่) และแผ่นซ้อนหน้า (จอเล็ก) — ต่างกันแค่กรอบที่ห่อ
 *
 * แถบล่างอยู่กับที่ ไม่เลื่อนหายไปกับเนื้อหา เพราะจังหวะของการทบทวนคือ
 * อ่านจบ → ติ๊ก → ไปต่อ ถ้าปุ่มอยู่ท้ายเนื้อหา ต้องเลื่อนหาปุ่มทุกหัวข้อ
 */
export function TopicPanel({
  id,
  headingId,
  onClose,
  onPick,
}: {
  id: TopicId;
  headingId: string;
  onClose: () => void;
  onPick: (id: TopicId) => void;
}) {
  const layer = LAYER_BY_ID[TOPICS[id].layer];
  const done = useReviewed().has(id);

  const index = TOPIC_ORDER.indexOf(id);
  const total = TOPIC_ORDER.length;
  const prev = TOPIC_ORDER[(index - 1 + total) % total];
  const next = TOPIC_ORDER[(index + 1) % total];

  return (
    <>
      <div className="flex flex-none items-center gap-3 border-b border-line px-5 py-3">
        <span className={`rounded-full px-2.5 py-1 text-[0.74rem] font-bold ${TONE[layer.id].badge}`}>
          ชั้น {layer.no} · {layer.name}
        </span>
        <span className="text-[0.8rem] text-ink-faint">
          หัวข้อ {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-lg px-2.5 py-1 text-[0.85rem] font-bold text-ink-faint transition-colors hover:text-ink"
        >
          ปิด
        </button>
      </div>

      {/* key — เปลี่ยนหัวข้อแล้วเริ่มอ่านจากบนสุด ไม่ค้างอยู่ที่ตำแหน่งเลื่อนของหัวข้อเดิม */}
      <div key={id} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5">
        <TopicBody id={id} headingId={headingId} onPick={onPick} />
      </div>

      <div className="flex flex-none items-center gap-2 border-t border-line px-4 py-3">
        <label
          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-[0.88rem] font-bold transition-colors ${
            done
              ? "border-brand-300 bg-brand-50 text-brand-800"
              : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
          }`}
        >
          <input
            type="checkbox"
            checked={done}
            onChange={(e) => setReviewed(id, e.target.checked)}
            className="size-4 accent-brand-600"
          />
          ทบทวนแล้ว
        </label>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPick(prev)}
            title={TOPICS[prev].name}
            className="grid size-10 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">ก่อนหน้า: {TOPICS[prev].name}</span>
          </button>
          <button
            type="button"
            onClick={() => onPick(next)}
            title={TOPICS[next].name}
            className="rounded-full bg-ink px-4 py-2.5 text-[0.88rem] font-bold text-surface-raised transition-opacity hover:opacity-85"
          >
            ถัดไป <span aria-hidden="true">→</span>
            <span className="sr-only">: {TOPICS[next].name}</span>
          </button>
        </div>
      </div>
    </>
  );
}

function TopicBody({
  id,
  headingId,
  onPick,
}: {
  id: TopicId;
  headingId: string;
  onPick: (id: TopicId) => void;
}) {
  const topic = TOPICS[id];

  return (
    <article aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h3 id={headingId} className="text-[1.7rem] font-black leading-tight tracking-tight">
          {topic.name}
        </h3>
        {topic.badge && <span className={NEW_BADGE}>{topic.badge}</span>}
      </div>
      {topic.full && <p className="mt-0.5 text-[0.86rem] text-ink-faint">{topic.full}</p>}

      <p className="mt-4 rounded-2xl bg-surface-overlay px-4 py-3 text-[0.93rem] leading-relaxed">
        <span className="font-bold">เทียบง่าย ๆ</span> — {topic.analogy}
      </p>

      <Block title="คืออะไร">
        <p>
          <RichText text={topic.what} />
        </p>
      </Block>

      <Block title="ใช้ทำอะไร">
        <p>
          <RichText text={topic.use} />
        </p>
      </Block>

      {topic.extra && (
        <Block title={topic.extra.title}>
          <ul className="space-y-1.5">
            {topic.extra.items.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-[0.6em] size-1.5 flex-none rounded-full bg-ink-faint" />
                <span>
                  <RichText text={item} />
                </span>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="ข้อดี" titleClass="text-brand-700">
        <ul className="space-y-1.5">
          {topic.pros.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden="true" className="flex-none font-black text-brand-600">
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="ข้อควรระวัง" titleClass="text-amber-800">
        <ul className="space-y-1.5">
          {topic.cons.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden="true" className="w-2 flex-none text-center font-black text-amber-600">
                !
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Block>

      {topic.examples && (
        <Block title="ตัวอย่างเครื่องมือ">
          <p className="text-ink-muted">{topic.examples}</p>
        </Block>
      )}

      {topic.note && (
        <p className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[0.9rem] leading-relaxed text-amber-950">
          <RichText text={topic.note} />
        </p>
      )}

      <Block title="เชื่อมกับ">
        <ul className="grid gap-2">
          {topic.links.map((link) => {
            const other = TOPICS[link.to];
            return (
              <li key={link.to}>
                <button
                  type="button"
                  onClick={() => onPick(link.to)}
                  className="flex w-full flex-col items-start gap-1.5 rounded-2xl border border-line bg-surface-raised p-3 text-left transition-colors hover:border-line-strong hover:bg-surface"
                >
                  <span className={`rounded-full px-2.5 py-1 text-[0.78rem] font-bold ${TONE[other.layer].badge}`}>
                    {other.name} <span aria-hidden="true">→</span>
                  </span>
                  <span className="text-[0.88rem] leading-snug text-ink-muted">
                    <RichText text={link.why} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Block>
    </article>
  );
}

function Block({
  title,
  titleClass = "text-ink-faint",
  children,
}: {
  title: string;
  titleClass?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-5">
      <h4 className={`mb-1.5 text-[0.8rem] font-bold tracking-wide ${titleClass}`}>{title}</h4>
      <div className="text-[0.95rem] leading-relaxed text-ink">{children}</div>
    </div>
  );
}
