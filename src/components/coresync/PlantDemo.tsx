"use client";

import { useEffect, useReducer, useState } from "react";
import { CLAIM_TTL_MS, RESUME_GRACE_MS, initialState, reduce } from "@/lib/demo/plant/engine";
import type { LogEntry, PlantState, Silo } from "@/lib/demo/plant/types";

/**
 * เดโมระบบจัดการงานรถตัก — เล่นได้จากเบราว์เซอร์ ไม่ต้องติดตั้งอะไร
 *
 * ⚠️ ทั้งหมดจำลองในเครื่องผู้เข้าชม ไม่ต่อ broker ไม่ต่อฐานข้อมูล ไม่ส่งอะไรออก
 * ระบบจริงมี PostgreSQL, MQTT broker และเซิร์ฟเวอร์แยก ซึ่งเปิดให้คนนอกต่อไม่ได้
 * เดโมนี้จึงยกมาเฉพาะ **กฎการทำงาน** เพื่อให้คนนอกกดลองเองได้ว่าระบบตัดสินอย่างไร
 *
 * ⚠️ เป็นโรงงานสมมติ ชื่อไซโล เตา และรถ ตั้งขึ้นใหม่ทั้งหมด ไม่ใช่ของลูกค้ารายใด
 */

const TICK_MS = 1000;

export function PlantDemo() {
  const [state, dispatch] = useReducer(reduce, 0, () => initialState(Date.now()));
  const [selectedSilo, setSelectedSilo] = useState("SL2");
  const [selectedVehicle, setSelectedVehicle] = useState("LD-01");

  useEffect(() => {
    const timer = window.setInterval(() => dispatch({ type: "tick", at: Date.now() }), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  // ผลลัพธ์ล่าสุดอนุมานจากบันทึกได้ตรง ๆ ไม่ต้องเก็บเป็น state คู่ขนาน
  // ซึ่งจะหลุดจากกันได้และต้องคอยซิงค์ด้วย effect โดยไม่จำเป็น
  const latest = state.log.find((entry) => entry.detail);
  const lastResult = latest ? `${latest.text} — ${latest.detail}` : null;
  const run = dispatch;

  const holderOf = (siloId: string) =>
    state.jobs.find((j) => j.siloId === siloId && j.endedAt === null)?.vehicleId ?? null;

  /** เหตุผลที่ไซโลนี้ไม่แจ้งเตือน — ต้องแยกให้ออกว่าเตาหยุด หรือเพิ่งกลับมาเดิน */
  const suppressReason = (siloId: string): string | null => {
    if (!state.suppressed.includes(siloId)) return null;
    const silo = state.silos.find((s) => s.id === siloId);
    const kiln = state.kilns.find((k) => k.id === silo?.feedsKiln);
    if (!kiln) return null;
    return kiln.running
      ? `ผ่อนผัน — ${kiln.id} เพิ่งกลับมาเดิน`
      : `ระงับแจ้งเตือน — ${kiln.id} หยุดเดิน`;
  };

  return (
    <section className="view">
      {/* ───────── คำอธิบายว่านี่คืออะไร ───────── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="chart-head">
          <div className="section-title">ระบบจัดการงานรถตัก — โรงงานตัวอย่าง</div>
          <span className="pill warn">โรงงานสมมติ</span>
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          กดลองได้ทุกปุ่ม ระบบจะบอกทุกครั้งว่าตัดสินอย่างไรและเพราะอะไร
          ทั้งหมดทำงานในเบราว์เซอร์ของคุณ ไม่มีการส่งข้อมูลออกและไม่มีการบันทึกที่ใด
        </p>
        <div className="dt-toolbar" style={{ marginTop: 12 }}>
          <button type="button" className={state.running ? "active" : ""} onClick={() => run({ type: "toggleRun" })}>
            {state.running ? "◼ หยุดเวลา" : "▶ เดินเวลา"}
          </button>
          <button type="button" onClick={() => run({ type: "reset", at: Date.now() })}>
            ↻ เริ่มใหม่
          </button>
        </div>
        <div className="statstrip" style={{ marginTop: 12 }}>
          <div className="stat">
            <label>ค่าที่อ่านจากหน้างาน</label>
            <strong>{state.counters.scadaMessages.toLocaleString("th-TH")}</strong>
          </div>
          <div className="stat">
            <label>คำขอที่ถูกปฏิเสธ</label>
            <strong className={state.counters.rejected > 0 ? "t-yellow" : ""}>
              {state.counters.rejected}
            </strong>
          </div>
          <div className="stat">
            <label>ข้อความซ้ำที่กันไว้ได้</label>
            <strong className={state.counters.duplicates > 0 ? "t-green" : ""}>
              {state.counters.duplicates}
            </strong>
          </div>
          <div className="stat">
            <label>งานที่กำลังทำ</label>
            <strong>{state.jobs.filter((j) => j.endedAt === null).length}</strong>
          </div>
        </div>
      </div>

      {/* ───────── ไซโล ───────── */}
      <div className="section-title" style={{ marginBottom: 8 }}>
        ไซโลวัตถุดิบ — กดที่ไซโลเพื่อเลือกเป็นเป้าหมาย
      </div>
      <div className="grid-kpi" style={{ marginBottom: 14 }}>
        {state.silos.map((silo) => (
          <SiloCard
            key={silo.id}
            silo={silo}
            blinking={state.blinking.includes(silo.id)}
            suppressReason={suppressReason(silo.id)}
            holder={holderOf(silo.id)}
            selected={selectedSilo === silo.id}
            onSelect={() => setSelectedSilo(silo.id)}
          />
        ))}
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* ───────── เตา ───────── */}
        <div className="card">
          <div className="section-title">เตาเผา</div>
          <p className="hint" style={{ marginTop: 4 }}>
            สั่งเตาหยุดแล้วดูว่าไซโลที่ป้อนเตานั้นเลิกแจ้งเตือน — ระดับที่ลดตอนเตาหยุด
            ไม่ใช่เหตุให้ต้องรีบเติม ถ้าเตือนผิดบ่อย ๆ คนขับจะเลิกเชื่อการเตือน
          </p>
          {state.kilns.map((kiln) => {
            const fed = state.silos.filter((s) => s.feedsKiln === kiln.id).map((s) => s.id);
            const inGrace =
              kiln.running && kiln.resumedAt !== null && state.now - kiln.resumedAt < RESUME_GRACE_MS;
            return (
              <div key={kiln.id} className="alert-row" style={{ marginTop: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="mono">{kiln.id}</b>{" "}
                  <span className={kiln.running ? "pill ok" : "pill crit"}>
                    {kiln.running ? "กำลังเดิน" : "หยุดเดิน"}
                  </span>
                  {inGrace ? <span className="pill warn"> ผ่อนผัน</span> : null}
                  <div className="sub" style={{ marginTop: 3 }}>
                    {kiln.material} · ป้อนโดย {fed.join(", ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    run({ type: "setKiln", kilnId: kiln.id, running: !kiln.running, at: Date.now() })
                  }
                >
                  {kiln.running ? "สั่งหยุด" : "สั่งเดิน"}
                </button>
              </div>
            );
          })}
        </div>

        {/* ───────── รถตัก ───────── */}
        <div className="card">
          <div className="section-title">รถตัก</div>
          <p className="hint" style={{ marginTop: 4 }}>
            หนึ่งคันถือได้ทีละงานเดียว ต้องจบงานเดิมก่อนจึงรับงานใหม่ได้
          </p>
          {state.vehicles.map((vehicle) => {
            const job = state.jobs.find((j) => j.id === vehicle.activeJobId);
            return (
              <div key={vehicle.id} className="alert-row" style={{ marginTop: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="mono">{vehicle.id}</b>{" "}
                  <span className="sub">{vehicle.operator}</span>
                  <div className="sub" style={{ marginTop: 3 }}>
                    {job ? (
                      <span className="t-green">กำลังทำงานที่ {job.siloId} · {job.id}</span>
                    ) : (
                      "ว่าง"
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!job}
                  onClick={() => run({ type: "stopJob", vehicleId: vehicle.id, at: Date.now() })}
                >
                  จบงาน
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────── สถานการณ์ที่กดลองได้ ───────── */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="section-title">ลองสถานการณ์</div>
        <p className="hint" style={{ marginTop: 4 }}>
          เป้าหมาย: <b className="mono">{selectedSilo}</b> · รถ:{" "}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            style={{
              background: "var(--panel2)",
              color: "var(--text)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              padding: "2px 6px",
              fontFamily: "inherit",
            }}
          >
            {state.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
        </p>

        <div className="dt-toolbar" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => run({ type: "requestMaterial", siloId: selectedSilo, at: Date.now() })}
          >
            ส่งคำขอวัตถุดิบ
          </button>
          <button
            type="button"
            onClick={() =>
              run({
                type: "claim",
                vehicleId: selectedVehicle,
                siloId: selectedSilo,
                msgId: `M-${Date.now()}`,
                at: Date.now(),
              })
            }
          >
            รับงาน (คันเดียว)
          </button>
          <button
            type="button"
            className="active"
            onClick={() => run({ type: "raceAll", siloId: selectedSilo, at: Date.now() })}
          >
            🏁 กดพร้อมกัน 3 คัน
          </button>
          <button type="button" onClick={() => run({ type: "duplicateClaim", at: Date.now() })}>
            ส่งข้อความซ้ำ 5 ครั้ง
          </button>
          <button type="button" onClick={() => run({ type: "staleClaim", at: Date.now() })}>
            สิทธิ์ค้างจากตอนเน็ตหลุด
          </button>
        </div>

        {lastResult ? (
          <div className="panel-note" style={{ marginTop: 12 }}>
            <b>ผลล่าสุด</b>
            <p style={{ marginTop: 4 }}>{lastResult}</p>
          </div>
        ) : null}

        <ul className="hint" style={{ marginTop: 12, paddingLeft: 16, listStyle: "disc" }}>
          <li>
            <b>กดพร้อมกัน 3 คัน</b> — ชนะได้คันเดียว อีกสองคันได้คำตอบว่าใครรับไปแล้ว
            ตัดสินจากลำดับที่คำขอถึงเซิร์ฟเวอร์ ไม่ใช่เวลาที่กดบนเครื่อง
          </li>
          <li>
            <b>ส่งข้อความซ้ำ</b> — เน็ตไม่ดีแล้วเครื่องส่งซ้ำ ต้องได้งานเดิม ไม่ใช่งานซ้อน
          </li>
          <li>
            <b>สิทธิ์ค้างจากตอนเน็ตหลุด</b> — กดไว้นานเกิน {CLAIM_TTL_MS / 1000} วินาทีแล้วเพิ่งส่งถึง
            ระบบต้องปฏิเสธ ไม่ใช่ให้งานย้อนหลัง
          </li>
        </ul>
      </div>

      {/* ───────── บันทึก ───────── */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="chart-head">
          <div className="section-title">บันทึกทุกอย่างที่ระบบตัดสิน</div>
          <span className="sub">{state.log.length} รายการ</span>
        </div>
        {state.log.length === 0 ? (
          <p className="sub" style={{ marginTop: 8 }}>
            ยังไม่มีรายการ — กดปุ่มด้านบนเพื่อลองสถานการณ์
          </p>
        ) : (
          <div style={{ marginTop: 8, maxHeight: 280, overflowY: "auto" }}>
            {state.log.map((entry) => (
              <LogRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

const TONE: Record<string, string> = {
  claim: "t-green",
  reject: "t-red",
  alert: "t-yellow",
  request: "t-cyan",
  system: "",
  scada: "",
};

function LogRow({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.at).toLocaleTimeString("th-TH", { hour12: false });
  return (
    <div className="alert-row" style={{ alignItems: "flex-start", gap: 10 }}>
      <span className="mono sub" style={{ minWidth: 62 }}>
        {time}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={TONE[entry.kind]}>{entry.text}</div>
        {entry.detail ? (
          <div className="sub mono" style={{ fontSize: 12, marginTop: 2 }}>
            {entry.detail}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SiloCard({
  silo,
  blinking,
  suppressReason,
  holder,
  selected,
  onSelect,
}: {
  silo: Silo;
  blinking: boolean;
  suppressReason: string | null;
  holder: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  const low = silo.levelPct < silo.thresholdPct;
  const tone = low ? "var(--red)" : silo.levelPct >= 85 ? "var(--yellow)" : "var(--green)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`card kpi${blinking ? " wl-blink" : ""}`}
      style={{
        textAlign: "left",
        cursor: "pointer",
        borderColor: selected ? "var(--cyan)" : undefined,
        display: "block",
        width: "100%",
      }}
      aria-pressed={selected}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <b className="mono" style={{ fontSize: 16 }}>
          {silo.id}
        </b>
        <span className="sub" style={{ fontSize: 11 }}>
          {silo.channel}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 18, fontWeight: 700, color: tone }}>
          {silo.levelPct.toFixed(1)}%
        </span>
      </div>

      {/* แถบระดับ พร้อมขีดบอกเกณฑ์แจ้งเตือน */}
      <div
        style={{
          position: "relative",
          height: 8,
          borderRadius: 4,
          background: "var(--panel2)",
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${silo.levelPct}%`,
            height: "100%",
            background: tone,
            transition: "width 0.6s linear",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${silo.thresholdPct}%`,
            top: -2,
            bottom: -2,
            width: 2,
            background: "var(--muted)",
          }}
          aria-hidden
        />
      </div>

      <div className="sub" style={{ marginTop: 6, fontSize: 12 }}>
        สถานะจากหน้างาน: <span className="mono">{silo.statusRaw}</span> · เกณฑ์ {silo.thresholdPct}%
      </div>
      <div style={{ marginTop: 4, fontSize: 12 }}>
        {holder ? (
          <span className="t-green">มีรถ {holder} ทำงานอยู่</span>
        ) : suppressReason ? (
          <span className="t-yellow">{suppressReason}</span>
        ) : blinking ? (
          <span className="t-red">กำลังแจ้งเตือน</span>
        ) : (
          <span className="sub">ปกติ · ป้อน {silo.feedsKiln}</span>
        )}
      </div>
    </button>
  );
}

/** ให้หน้าอื่นอ้างชนิดได้โดยไม่ต้อง import จาก types โดยตรง */
export type { PlantState };
