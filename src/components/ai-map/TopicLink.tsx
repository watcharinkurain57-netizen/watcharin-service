"use client";

import type { ReactNode } from "react";
import { TOPICS, type TopicId } from "@/lib/ai-map";
import { revealTopic } from "./store";
import { TONE } from "./tones";

/**
 * ป้ายหัวข้อที่ใช้นอกแผนที่ (ขั้นตอน, ลำดับการเรียน, ชั้นซ้อนของคำ Engineering)
 *
 * ยังเป็นลิงก์ #id ธรรมดา — ก่อน JS โหลดเสร็จ กดแล้วก็ยังพาไปที่ปุ่มบนแผนที่ได้
 * และกดค้าง / cmd-คลิกเพื่อเปิดแท็บใหม่ก็ยังทำงานตามปกติ
 */
export function TopicLink({
  id,
  children,
  className,
}: {
  id: TopicId;
  children?: ReactNode;
  className?: string;
}) {
  const topic = TOPICS[id];

  return (
    <a
      href={`#${id}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        revealTopic(id);
      }}
      className={
        className ??
        `inline-block rounded-full px-2.5 py-1 text-[0.8rem] font-bold transition-colors ${TONE[topic.layer].pill}`
      }
    >
      {children ?? topic.name}
    </a>
  );
}
