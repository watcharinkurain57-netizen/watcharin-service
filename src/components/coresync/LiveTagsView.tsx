"use client";

import { useState } from "react";
import Link from "next/link";
import { SPARK, seriesToPath } from "@/lib/coresync-data";
import type { OperatorEvent, Reading } from "@/lib/demo/contract";
import { useViewerSession } from "@/lib/demo/session-store";
import { DEFAULT_TAGS, useDemoSimulator } from "@/lib/demo/simulate";
import { ExperimentSummary } from "./ExperimentSummary";
import { useDemoChannel, useSecondsSince } from "@/lib/demo/useDemoChannel";

/**
 * มุมมอง "ข้อมูลสด" — แสดง tag ที่รับเข้ามาตรง ๆ
 *
 * ⚠️ ตั้งใจไม่ดัดข้อมูลของลูกค้าให้เข้าโครงของมุมมองอื่น
 * มุมมองอื่นในเดโมออกแบบรอบแนวคิดเฉพาะ (สายการผลิต OEE ของเสีย) ซึ่งลูกค้า
 * ที่ส่ง tag จากไซโลหรือเตาเผาไม่มีทางแมปลงได้ การพยายามยัดให้เข้าโครงเดิม
 * จะพังทันทีที่เจอข้อมูลจริง — และสิ่งที่ทำให้เขาเชื่อคือ **เห็นชื่อ tag ของตัวเอง**
 * ไม่ใช่เห็นตัวเลขของเราที่ถูกแทนที่ด้วยของเขา
 */
export function LiveTagsView() {
  // ใช้ viewer ไม่ใช่ stored — หน้านี้ต้องเปิดจากลิงก์ที่คนอื่นส่งมาได้ด้วย
  const session = useViewerSession();
  const watching = session !== null && session.token === null;
  const live = useDemoChannel(session?.sessionId ?? null);
  const since = useSecondsSince(live.lastAt);
  const [simOn, setSimOn] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  // ตัวจำลองต้องเดินได้จากหน้านี้ด้วย ไม่ใช่เฉพาะหน้าเชื่อมต่อ
  // ไม่งั้นผู้ใช้กดมาดูแดชบอร์ดแล้วข้อมูลหยุดพอดีตอนที่อยากเห็นมันวิ่ง
  useDemoSimulator({
    token: session?.token ?? null,
    tags: session?.tags?.length ? session.tags : DEFAULT_TAGS,
    enabled: simOn,
    onError: (message) => {
      setSimError(message);
      setSimOn(false);
    },
  });

  if (!session) {
    return (
      <section className="view">
        <div className="card generic">
          <h2>ยังไม่ได้ต่อข้อมูล</h2>
          <p>
            มุมมองนี้แสดงข้อมูลจริงที่ส่งเข้ามาจากระบบของคุณ ไม่ใช่ข้อมูลตัวอย่างเหมือนมุมมองอื่น
            เปิดหน้าเชื่อมต่อเพื่อสร้างช่องรับข้อมูล แล้วกลับมาที่นี่
          </p>
          <p style={{ marginTop: 14 }}>
            <Link className="home-link" href="/coresync/connect">
              ▸ ไปหน้าเชื่อมต่อข้อมูล
            </Link>
          </p>
        </div>
      </section>
    );
  }

  const waiting = live.lastAt === null;

  return (
    <section className="view">
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="chart-head">
          <div className="section-title">
            สถานะการรับข้อมูล
            {watching ? <span className="pill" style={{ marginLeft: 8 }}>ดูอย่างเดียว</span> : null}
          </div>
          <span className={`pill ${waiting ? "warn" : "ok"}`}>
            {live.status === "error" ? "เชื่อมต่อไม่ได้" : waiting ? "รอข้อมูลชุดแรก" : "กำลังรับข้อมูล"}
          </span>
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          {live.status === "error" ? (
            live.error
          ) : waiting ? (
            watching ? (
              <>กำลังฟังช่องของเครื่องที่ส่งลิงก์นี้มา — จะขึ้นเองทันทีที่เขาเริ่มส่งข้อมูล</>
            ) : (
              <>เปิดช่องรับข้อมูลแล้ว — ส่งข้อมูลเข้ามาได้จากหน้าเชื่อมต่อ หรือจากเครื่องของคุณเอง</>
            )
          ) : (
            <>
              ล่าสุดเมื่อ {since === 0 ? "ไม่กี่วินาที" : `${since} วินาที`}ที่แล้ว ·{" "}
              {live.tags.length} tag · {live.totalReadings.toLocaleString("th-TH")} ค่า ·{" "}
              {live.batches} ชุด
            </>
          )}
        </p>
        {/* คนที่เปิดจากลิงก์ไม่มีโทเคน จึงเดินข้อมูลจำลองไม่ได้ — ซ่อนปุ่มดีกว่าให้กดแล้วพัง */}
        <div className="dt-toolbar" style={{ marginTop: 12 }}>
          {watching ? null : (
            <button type="button" className={simOn ? "active" : ""} onClick={() => setSimOn((v) => !v)}>
              {simOn ? "◼ หยุดข้อมูลจำลอง" : "▶ เดินข้อมูลจำลอง"}
            </button>
          )}
          <Link className="home-link" href="/coresync/connect" style={{ display: "inline" }}>
            {watching ? "เปิดช่องของตัวเอง" : "จัดการการเชื่อมต่อ"}
          </Link>
        </div>
        {simError ? (
          <p className="hint" style={{ marginTop: 8, color: "var(--red)" }}>
            {simError}
          </p>
        ) : null}
        <p className="hint" style={{ marginTop: 10 }}>
          ข้อมูลในหน้านี้ไม่ถูกบันทึกที่ใดเลย · เวลาที่แสดงคือเวลาที่ประทับมาจากต้นทาง
        </p>
      </div>

      {waiting ? (
        <div className="card empty">
          <p>ยังไม่มีข้อมูลเข้ามา — เมื่อส่งเข้ามาแล้ว การ์ดของแต่ละ tag จะขึ้นที่นี่เอง</p>
        </div>
      ) : (
        <div className="grid-kpi">
          {live.tags.map((tag) => (
            <TagCard
              key={tag}
              tag={tag}
              reading={live.latest[tag]}
              series={live.history[tag] ?? []}
            />
          ))}
        </div>
      )}

      {/* เหตุการณ์จากแท็บเล็ตคนขับ — จอนี้ทำหน้าที่เป็นจอ CCR ให้เห็นว่าใครรับงานไหน */}
      {live.events.length > 0 ? (
        <div className="card" style={{ marginTop: 14 }}>
          <div className="section-title">จากแท็บเล็ตคนขับ</div>
          <div style={{ marginTop: 10 }}>
            {live.events.map((event, i) => (
              <div key={`${event.at}-${i}`} className="ev-row">
                <span className="mono">{timeOfDay(event.at)}</span>
                <span>{eventText(event)}</span>
              </div>
            ))}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            การจองงานในโหมดทดลองคือการประกาศให้จออื่นเห็น ไม่ใช่การแย่งสิทธิ์ที่มีผู้ชนะแน่นอน —
            กลไกตัดสินจริงอยู่ที่มุมมอง Loader Ops
          </p>
        </div>
      ) : null}

      {/* ปิดท้ายด้วยตัวเลขของผู้ใช้เอง — เปลี่ยนเดโมให้เป็นข้อมูลที่คุยขอบเขตงานต่อได้ */}
      {waiting ? null : (
        <ExperimentSummary
          stats={{
            tagCount: live.tags.length,
            totalReadings: live.totalReadings,
            batches: live.batches,
            firstAt: live.firstAt,
            lastAt: live.lastAt,
          }}
          tags={live.tags}
        />
      )}
    </section>
  );
}

/**
 * ปรับค่าให้อยู่ในช่วง 0..100 ตามช่วงของ tag นั้นเอง
 *
 * ตัววาดกราฟของเดโมรับเฉพาะ 0..100 และแต่ละ tag มีหน่วยคนละแบบ
 * (องศาเซลเซียสเป็นพัน เปอร์เซ็นต์เป็นสิบ) ถ้าไม่ปรับ เส้นจะแบนติดขอบ
 */
function normalize(series: readonly number[]): number[] {
  if (series.length === 0) return [];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min;
  // ค่าคงที่ไม่มีช่วงให้ปรับ — วางไว้กลางกรอบจะอ่านง่ายกว่าติดขอบล่าง
  if (span < 1e-9) return series.map(() => 50);
  return series.map((v) => ((v - min) / span) * 100);
}

function display(value: Reading["value"] | undefined) {
  if (value === undefined) return "—";
  if (typeof value === "boolean") return value ? "ON" : "OFF";
  if (typeof value === "number") {
    return value.toLocaleString("th-TH", { maximumFractionDigits: 2 });
  }
  return value;
}

/** สีของค่าที่ไม่ใช่ตัวเลข — ให้ดูออกทันทีว่าเดินอยู่หรือหยุด */
function toneOf(value: Reading["value"] | undefined): string {
  if (typeof value === "boolean") return value ? "t-green" : "t-red";
  if (typeof value === "string") {
    const v = value.toLowerCase();
    if (/run|on|ok|normal|active/.test(v)) return "t-green";
    if (/stop|off|fault|alarm|error|down/.test(v)) return "t-red";
  }
  return "";
}

function TagCard({
  tag,
  reading,
  series,
}: {
  tag: string;
  reading: Reading | undefined;
  series: readonly number[];
}) {
  const numeric = typeof reading?.value === "number";
  const points = normalize(series);
  const stale = reading?.quality === "stale" || reading?.quality === "bad";

  return (
    <div className="card kpi">
      <div className="iconbox" aria-hidden>
        {numeric ? "◷" : "◉"}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* ชื่อ tag ของลูกค้าเอง — จุดสำคัญที่สุดของการ์ดนี้ ห้ามตัดทิ้ง */}
        <label className="mono" title={tag} style={{ overflowWrap: "anywhere" }}>
          {tag}
        </label>
        <strong className={toneOf(reading?.value)}>
          {display(reading?.value)}
          {reading?.unit ? <small> {reading.unit}</small> : null}
        </strong>
        {points.length > 1 ? (
          <svg className="spark" viewBox={`0 0 ${SPARK.width} ${SPARK.height}`} aria-hidden>
            <path className="spark-line" d={seriesToPath(points, SPARK)} />
          </svg>
        ) : (
          <div className={`trend${stale ? " bad" : ""}`}>
            {stale ? "ข้อมูลอาจไม่ล่าสุด" : numeric ? "รอค่าถัดไปเพื่อวาดกราฟ" : "ค่าสถานะ"}
          </div>
        )}
      </div>
    </div>
  );
}

function timeOfDay(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "--:--" : d.toLocaleTimeString("th-TH", { hour12: false });
}

/** อ่านเหตุการณ์เป็นภาษาคน — จอ CCR ไม่ควรต้องแปลรหัสเอง */
function eventText(event: OperatorEvent) {
  const who = `${event.operator} (${event.vehicle})`;
  switch (event.kind) {
    case "login":
      return `${who} ยืนยันตัวตนและเลือกรถแล้ว`;
    case "shift_start":
      return `${who} เริ่มกะ`;
    case "job_start":
      return `${who} รับงานที่ ${event.silo}`;
    case "job_end":
      return `${who} จบงานที่ ${event.silo}`;
    case "shift_end":
      return `${who} จบกะ`;
  }
}
