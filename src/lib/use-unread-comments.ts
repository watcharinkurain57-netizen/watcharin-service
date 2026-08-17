"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * นับข้อความที่ยังไม่ได้อ่านในห้องแชทของโปรเจกต์
 *
 * ⚠️ ต้องถูกเรียกจาก **ที่เดียว** คือ ProjectTabs แล้วส่งค่าลงไปให้ลูก
 * ถ้าให้ทั้ง ProjectTabs และ ChatTab เรียกเอง จะกลายเป็นสองตัวยิงถามซ้อนกัน
 * ทั้งที่นับเรื่องเดียวกัน
 *
 * นับด้วย `head: true` + `count: exact` — ขอแค่จำนวน ไม่ดึงตัวข้อความมา
 * คำขอจึงเบามากแม้ห้องจะมีข้อความเป็นพัน
 */

/** ถี่กว่าตัวดึงข้อความในห้อง (15 วิ) ไม่ได้ เพราะอันนี้ทำงานตลอดเวลาที่เปิดหน้าโปรเจกต์ */
export const UNREAD_POLL_MS = 30_000;

export type Unread = {
  count: number;
  /** เรียกตอนผู้ใช้เปิดดูห้องแชทจริง ๆ — เลื่อนหมุดว่าอ่านถึงตรงนี้แล้ว */
  markRead: () => void;
};

export function useUnreadComments(projectId: string, enabled: boolean): Unread {
  const [count, setCount] = useState(0);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  /** เก็บใน ref ไม่ใช่ state เพราะเปลี่ยนแล้วไม่ต้องวาดหน้าใหม่ และกัน effect วนซ้ำ */
  const meRef = useRef<string | null>(null);
  const lastReadRef = useRef<string | null>(null);
  /** เวลาที่เขียนหมุดล่าสุด — กันเขียนรัวตอนนั่งอยู่ในห้องแชทเฉย ๆ */
  const lastWriteRef = useRef(0);

  const count_ = useCallback(async () => {
    const me = meRef.current;
    const since = lastReadRef.current;
    if (!me || !since) return;

    const { count: n } = await supabase
      .from("project_comments")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .gt("created_at", since)
      // ข้อความของตัวเองไม่นับว่ายังไม่ได้อ่าน
      .neq("author_id", me);

    setCount(n ?? 0);
  }, [supabase, projectId]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!alive || !user) return;
      meRef.current = user.id;

      const { data } = await supabase
        .from("project_comment_reads")
        .select("last_read_at")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (data?.last_read_at) {
        lastReadRef.current = data.last_read_at;
      } else {
        /**
         * ยังไม่มีแถว = เพิ่งเข้ามาโปรเจกต์นี้ หรือไม่เคยเปิดห้องแชทเลย
         *
         * ตั้งหมุดไว้ที่ "ตอนนี้" แทนที่จะนับข้อความเก่าทั้งหมดเป็นของใหม่
         * เพราะขึ้นว่า "47 ข้อความใหม่" ตั้งแต่วันแรกคือเสียงรบกวน ไม่ใช่ข้อมูล
         * ข้อดีคือพอสร้างแถวแล้ว ข้อความที่เข้ามาหลังจากนี้จะถูกนับทันที
         * โดยไม่ต้องรอให้ผู้ใช้เปิดห้องแชทก่อน
         */
        const now = new Date().toISOString();
        lastReadRef.current = now;
        await supabase
          .from("project_comment_reads")
          .upsert({ project_id: projectId, user_id: user.id, last_read_at: now });
      }

      await count_();
    })();

    const tick = () => {
      // ไม่ถามตอนผู้ใช้สลับไปแท็บอื่นของเบราว์เซอร์ จะได้ไม่กินโควตาฟรี ๆ
      if (!document.hidden) count_();
    };
    const timer = setInterval(tick, UNREAD_POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [enabled, supabase, projectId, count_]);

  const markRead = useCallback(() => {
    const me = meRef.current;
    if (!me) return;

    // ตัวเลขบนจอเคลียร์ทันทีเสมอ ไม่ต้องรอเซิร์ฟเวอร์
    lastReadRef.current = new Date().toISOString();
    setCount(0);

    /**
     * แต่เขียนลง DB อย่างมากทุก 10 วินาที
     * เพราะตัวนี้ถูกเรียกทุกครั้งที่ห้องแชทดึงข้อความใหม่ (ทุก 15 วิ)
     * ถ้าเขียนทุกครั้งจะกลายเป็นเขียนตลอดเวลาที่เปิดห้องทิ้งไว้
     * โดยที่หมุดขยับไปไม่กี่วินาที ซึ่งไม่ได้ช่วยอะไรเลย
     */
    const t = Date.now();
    if (t - lastWriteRef.current < 10_000) return;
    lastWriteRef.current = t;

    void supabase
      .from("project_comment_reads")
      .upsert({ project_id: projectId, user_id: me, last_read_at: lastReadRef.current });
  }, [supabase, projectId]);

  return { count, markRead };
}
