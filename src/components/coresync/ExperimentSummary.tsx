"use client";

import { useState } from "react";
import {
  INCLUDED_DB_GB,
  type SessionStats,
  duration,
  gb,
  months,
  num,
  observedIntervalSeconds,
  project,
  toMarkdown,
} from "@/lib/demo/summary";

/**
 * สรุปผลการทดลอง — ปิดท้ายเดโมด้วยตัวเลขของผู้ใช้เอง
 *
 * ⚠️ ช่อง "เก็บจริงทุกกี่วินาที" ให้ผู้ใช้แก้ได้ตั้งใจไว้แบบนั้น
 * ความถี่ที่เดโมส่ง (ทุก 5 วินาที) ไม่ใช่ความถี่ที่ระบบจริงจะใช้
 * ถ้าเราตั้งให้เอง ตัวเลขจะเป็นของเรา แต่ถ้าเขาเป็นคนใส่ ตัวเลขจะเป็นของเขา
 * และเถียงกันไม่ได้ตอนคุยขอบเขตงาน
 */
export function ExperimentSummary({ stats, tags }: { stats: SessionStats; tags: string[] }) {
  const observed = observedIntervalSeconds(stats);
  // ⚠️ ตามค่าที่วัดได้ไปเรื่อย ๆ จนกว่าผู้ใช้จะพิมพ์เอง
  // ถ้าใช้ค่าเริ่มต้นของ useState เฉย ๆ จะได้ค่าตอน mount ซึ่งตอนนั้น
  // ยังมีข้อมูลชุดเดียว คำนวณอัตราไม่ได้ แล้วช่องจะค้างที่ค่าสำรองตลอด
  const [typed, setTyped] = useState<string | null>(null);
  const interval = typed ?? (observed ? observed.toFixed(1) : "1");
  const [copied, setCopied] = useState(false);

  const parsed = Number(interval);
  const usable = Number.isFinite(parsed) && parsed > 0;
  const projection = project(stats, usable ? parsed : 1);
  const spanSeconds =
    stats.firstAt && stats.lastAt ? (stats.lastAt - stats.firstAt) / 1000 : 0;

  const markdown = toMarkdown(stats, projection, tags, observed);

  // เบราว์เซอร์บล็อกการเขียนคลิปบอร์ดได้หลายกรณี เช่นเปิดผ่าน http ธรรมดา
  // ถ้าล้มเหลวแล้วเงียบไป ผู้ใช้จะกดแล้วไม่เกิดอะไรและไม่รู้ว่าต้องทำยังไงต่อ
  // จึงกางข้อความออกมาให้เลือกคัดลอกเองแทน — ไม่ปล่อยให้เป็นทางตัน
  const [fallback, setFallback] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setFallback(false);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      setFallback(true);
    }
  };

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coresync-สรุปผลการทดลอง-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // ปล่อยหน่วยความจำคืน ไม่งั้น blob ค้างอยู่จนกว่าจะปิดแท็บ
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="chart-head">
        <div className="section-title">สรุปผลการทดลอง</div>
        <div className="dt-toolbar" style={{ margin: 0 }}>
          <button type="button" onClick={copy}>
            {copied ? "คัดลอกแล้ว" : "คัดลอกเป็นข้อความ"}
          </button>
          <button type="button" onClick={download}>
            ดาวน์โหลดไฟล์
          </button>
        </div>
      </div>

      <p className="sub" style={{ marginTop: 8 }}>
        ตัวเลขทั้งหมดคำนวณจากข้อมูลที่คุณส่งเข้ามาจริงในการทดลองครั้งนี้
      </p>

      {fallback ? (
        <div style={{ marginTop: 12 }}>
          <p className="hint" style={{ color: "var(--yellow)" }}>
            เบราว์เซอร์ไม่อนุญาตให้คัดลอกอัตโนมัติ — เลือกข้อความด้านล่างแล้วคัดลอกเอง
            หรือกดดาวน์โหลดไฟล์
          </p>
          <textarea
            readOnly
            value={markdown}
            rows={10}
            onFocus={(e) => e.currentTarget.select()}
            style={{
              marginTop: 8,
              width: "100%",
              padding: 10,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--panel2)",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: 12,
            }}
          />
        </div>
      ) : null}

      {/* ───────── สิ่งที่วัดได้ ───────── */}
      <div className="statstrip" style={{ marginTop: 12 }}>
        <div className="stat">
          <label>tag ที่ส่งเข้ามา</label>
          <strong>{num(stats.tagCount)}</strong>
        </div>
        <div className="stat">
          <label>ค่าที่รับทั้งหมด</label>
          <strong>{num(stats.totalReadings)}</strong>
        </div>
        <div className="stat">
          <label>ระยะเวลาที่ทดลอง</label>
          <strong>{duration(spanSeconds)}</strong>
        </div>
        <div className="stat">
          <label>ความถี่ที่วัดได้</label>
          <strong>{observed ? `${observed.toFixed(1)} วินาที` : "—"}</strong>
        </div>
      </div>

      {/* ───────── ให้เขาเป็นคนใส่ความถี่จริง ───────── */}
      <div style={{ marginTop: 16 }}>
        <label className="section-title" htmlFor="cs-interval">
          ถ้าเก็บจริง อ่านค่าทุกกี่วินาที
        </label>
        <p className="hint" style={{ marginTop: 4 }}>
          ความถี่ที่โหมดทดลองส่งไม่ใช่ความถี่ของระบบจริง — ใส่ค่าที่ระบบของคุณใช้จริงเพื่อให้ประมาณการตรง
        </p>
        <input
          id="cs-interval"
          type="number"
          min={0.1}
          step={0.1}
          value={interval}
          onChange={(e) => setTyped(e.target.value)}
          style={{
            marginTop: 8,
            width: 130,
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--panel2)",
            color: "var(--text)",
            fontFamily: "inherit",
          }}
        />
        {!usable ? (
          <p className="hint" style={{ marginTop: 6, color: "var(--yellow)" }}>
            ใส่ตัวเลขมากกว่า 0 — กำลังแสดงผลโดยใช้ 1 วินาทีแทน
          </p>
        ) : null}
      </div>

      {/* ───────── ประมาณการ ───────── */}
      <table className="dtable" style={{ marginTop: 14 }}>
        <thead>
          <tr>
            <th>ถ้าเก็บข้อมูลจริง</th>
            <th>ประมาณการ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>จำนวนแถวต่อวัน</td>
            <td className="mono">{num(projection.rowsPerDay)}</td>
          </tr>
          <tr>
            <td>จำนวนแถวต่อเดือน</td>
            <td className="mono">{num(projection.rowsPerMonth)}</td>
          </tr>
          <tr>
            <td>ขนาดข้อมูลต่อเดือน</td>
            <td className="mono">
              {gb(projection.gbPerMonthMin)} – {gb(projection.gbPerMonthMax)}
            </td>
          </tr>
          <tr>
            <td>ถ้าเก็บเมื่อค่าเปลี่ยน (deadband)</td>
            <td className="mono t-green">
              {gb(projection.gbPerMonthDeadbandMin)} – {gb(projection.gbPerMonthDeadbandMax)}
            </td>
          </tr>
          <tr>
            <td>โควตา {INCLUDED_DB_GB} GB ของแผนพื้นฐานจะเต็มใน</td>
            <td className="mono">
              {months(projection.monthsToFillIncludedMin)} –{" "}
              {months(projection.monthsToFillIncludedMax)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="panel-note" style={{ marginTop: 14 }}>
        <strong>ข้อสังเกต</strong>
        <p style={{ marginTop: 6 }}>
          ตัวกำหนดค่าใช้จ่ายจริงคือ <b>เก็บย้อนหลังนานแค่ไหน</b> มากกว่าจำนวน tag ·
          แนวทางที่ใช้กันคือเก็บข้อมูลดิบ 30–90 วัน แล้วยุบเป็นรายนาทีหรือรายชั่วโมงสำหรับข้อมูลเก่า ·
          และการเก็บเมื่อค่าเปลี่ยนเกินเกณฑ์เป็นวิธีมาตรฐานของงาน SCADA ที่ลดปริมาณได้มากที่สุด
        </p>
        <p style={{ marginTop: 8 }}>
          ตัวเลขข้างต้นเป็น<b>ประมาณการเพื่อใช้กำหนดขอบเขต ไม่ใช่ใบเสนอราคา</b> —
          ขนาดจริงขึ้นกับโครงสร้างข้อมูลที่ออกแบบ และราคาผู้ให้บริการต้องตรวจ ณ วันที่ใช้จริง
        </p>
      </div>
    </div>
  );
}
