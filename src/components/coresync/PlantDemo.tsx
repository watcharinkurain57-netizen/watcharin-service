"use client";

import { useEffect, useReducer, useState } from "react";
import { CLAIM_TTL_MS, RESUME_GRACE_MS, initialState, reduce } from "@/lib/demo/plant/engine";
import type { LogEntry, Silo } from "@/lib/demo/plant/types";

/**
 * เดโมระบบจัดการงานรถตัก — เล่นได้จากเบราว์เซอร์ ไม่ต้องติดตั้งอะไร
 *
 * ⚠️ ทั้งหมดจำลองในเครื่องผู้เข้าชม ไม่ต่อ broker ไม่ต่อฐานข้อมูล ไม่ส่งอะไรออก
 * ระบบจริงมี PostgreSQL, MQTT broker และเซิร์ฟเวอร์แยก ซึ่งเปิดให้คนนอกต่อไม่ได้
 * เดโมนี้จึงยกมาเฉพาะ **กฎการทำงาน** เพื่อให้คนนอกกดลองเองได้ว่าระบบตัดสินอย่างไร
 *
 * ⚠️ เป็นโรงงานสมมติ ชื่อไซโล เตา และรถ ตั้งขึ้นใหม่ทั้งหมด ไม่ใช่ของลูกค้ารายใด
 *
 * ⚠️ สไตล์ทั้งหมดใช้คลาส .wl-* ของตัวเอง ไม่ยืมคลาสจากมุมมองอื่น
 * คลาสเดิมอย่าง .alert-row เป็นกริด 24px|1fr|auto ที่ออกแบบไว้ใส่ไอคอนนำหน้า
 * พอเอามาใช้กับ markup ที่ไม่มีไอคอน ข้อความจะถูกบีบลงคอลัมน์ 24px แล้วแตกทีละคำ
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
  const latest = state.log.find((entry) => entry.detail);
  const lastResult = latest ? `${latest.text} — ${latest.detail}` : null;

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

  const activeJobs = state.jobs.filter((j) => j.endedAt === null).length;

  return (
    <section className="view">
      {/* ───────── หัวเรื่องและตัวควบคุม ───────── */}
      <div className="wl-panel">
        <div className="wl-head">
          <div className="wl-title">ระบบจัดการงานรถตัก — โรงงานตัวอย่าง</div>
          <span className="wl-tag wait">โรงงานสมมติ</span>
        </div>
        <p className="wl-note">
          กดลองได้ทุกปุ่ม ระบบจะบอกทุกครั้งว่าตัดสินอย่างไรและเพราะอะไร
          ทั้งหมดทำงานในเบราว์เซอร์ของคุณ ไม่มีการส่งข้อมูลออกและไม่มีการบันทึกที่ใด
        </p>

        <div className="wl-tools">
          <button type="button" className="wl-btn" onClick={() => dispatch({ type: "toggleRun" })}>
            {state.running ? "◼ หยุดเวลา" : "▶ เดินเวลา"}
          </button>
          <button
            type="button"
            className="wl-btn"
            onClick={() => dispatch({ type: "reset", at: Date.now() })}
          >
            ↻ เริ่มใหม่
          </button>
        </div>

        <div className="wl-stats">
          <div className="wl-stat">
            <span>ค่าที่อ่านจากหน้างาน</span>
            <b>{state.counters.scadaMessages.toLocaleString("th-TH")}</b>
          </div>
          <div className="wl-stat">
            <span>คำขอที่ถูกปฏิเสธ</span>
            <b className={state.counters.rejected > 0 ? "t-yellow" : undefined}>
              {state.counters.rejected}
            </b>
          </div>
          <div className="wl-stat">
            <span>ข้อความซ้ำที่กันไว้ได้</span>
            <b className={state.counters.duplicates > 0 ? "t-green" : undefined}>
              {state.counters.duplicates}
            </b>
          </div>
          <div className="wl-stat">
            <span>งานที่กำลังทำ</span>
            <b>{activeJobs}</b>
          </div>
        </div>
      </div>

      {/* ───────── ไซโล ───────── */}
      <div className="wl-sect">ไซโลวัตถุดิบ — กดที่ไซโลเพื่อเลือกเป็นเป้าหมาย</div>
      <div className="wl-silos">
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

      <div className="wl-cols">
        {/* ───────── เตา ───────── */}
        <div className="wl-panel">
          <div className="wl-title">เตาเผา</div>
          <p className="wl-fine">
            สั่งเตาหยุดแล้วดูว่าไซโลที่ป้อนเตานั้นเลิกแจ้งเตือน — ระดับที่ลดตอนเตาหยุด
            ไม่ใช่เหตุให้ต้องรีบเติม ถ้าเตือนผิดบ่อย ๆ คนขับจะเลิกเชื่อการเตือน
          </p>
          <div style={{ marginTop: 10 }}>
            {state.kilns.map((kiln) => {
              const fed = state.silos.filter((s) => s.feedsKiln === kiln.id).map((s) => s.id);
              const inGrace =
                kiln.running &&
                kiln.resumedAt !== null &&
                state.now - kiln.resumedAt < RESUME_GRACE_MS;
              return (
                <div key={kiln.id} className="wl-item">
                  <div className="wl-item-main">
                    <div className="wl-item-top">
                      <span className="wl-item-id">{kiln.id}</span>
                      <span className={`wl-tag ${kiln.running ? "on" : "off"}`}>
                        {kiln.running ? "กำลังเดิน" : "หยุดเดิน"}
                      </span>
                      {inGrace ? <span className="wl-tag wait">ผ่อนผัน</span> : null}
                    </div>
                    <div className="wl-item-sub">
                      {kiln.material} · ป้อนโดย {fed.join(", ")}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wl-btn"
                    onClick={() =>
                      dispatch({
                        type: "setKiln",
                        kilnId: kiln.id,
                        running: !kiln.running,
                        at: Date.now(),
                      })
                    }
                  >
                    {kiln.running ? "สั่งหยุด" : "สั่งเดิน"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ───────── รถตัก ───────── */}
        <div className="wl-panel">
          <div className="wl-title">รถตัก</div>
          <p className="wl-fine">
            หนึ่งคันถือได้ทีละงานเดียว ต้องจบงานเดิมก่อนจึงรับงานใหม่ได้
          </p>
          <div style={{ marginTop: 10 }}>
            {state.vehicles.map((vehicle) => {
              const job = state.jobs.find((j) => j.id === vehicle.activeJobId);
              return (
                <div key={vehicle.id} className="wl-item">
                  <div className="wl-item-main">
                    <div className="wl-item-top">
                      <span className="wl-item-id">{vehicle.id}</span>
                      <span className={`wl-tag ${job ? "on" : "wait"}`}>
                        {job ? "กำลังทำงาน" : "ว่าง"}
                      </span>
                    </div>
                    <div className="wl-item-sub">
                      {vehicle.operator}
                      {job ? ` · ${job.siloId} · ${job.id}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="wl-btn"
                    disabled={!job}
                    onClick={() => dispatch({ type: "stopJob", vehicleId: vehicle.id, at: Date.now() })}
                  >
                    จบงาน
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ───────── สถานการณ์ที่กดลองได้ ───────── */}
      <div className="wl-panel" style={{ marginTop: 14 }}>
        <div className="wl-title">ลองสถานการณ์</div>
        <p className="wl-fine">
          เป้าหมาย <b style={{ color: "#cfe6f7" }}>{selectedSilo}</b> — เลือกได้จากการ์ดไซโลด้านบน
        </p>

        <div className="wl-tools">
          <select
            className="wl-select"
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            aria-label="เลือกรถ"
          >
            {state.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                รถ {v.id}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="wl-btn"
            onClick={() => dispatch({ type: "requestMaterial", siloId: selectedSilo, at: Date.now() })}
          >
            ส่งคำขอวัตถุดิบ
          </button>
          <button
            type="button"
            className="wl-btn"
            onClick={() =>
              dispatch({
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
            className="wl-btn primary"
            onClick={() => dispatch({ type: "raceAll", siloId: selectedSilo, at: Date.now() })}
          >
            กดพร้อมกัน 3 คัน
          </button>
          <button
            type="button"
            className="wl-btn"
            onClick={() => dispatch({ type: "duplicateClaim", at: Date.now() })}
          >
            ส่งข้อความซ้ำ 5 ครั้ง
          </button>
          <button
            type="button"
            className="wl-btn"
            onClick={() => dispatch({ type: "staleClaim", at: Date.now() })}
          >
            สิทธิ์ค้างจากตอนเน็ตหลุด
          </button>
        </div>

        {lastResult ? (
          <div className="wl-result">
            <b>ผลล่าสุด</b>
            {lastResult}
          </div>
        ) : null}

        <ul className="wl-rules">
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
      <div className="wl-panel">
        <div className="wl-head">
          <div className="wl-title">บันทึกทุกอย่างที่ระบบตัดสิน</div>
          <span className="wl-silo-ch">{state.log.length} รายการ</span>
        </div>
        {state.log.length === 0 ? (
          <p className="wl-note">ยังไม่มีรายการ — กดปุ่มด้านบนเพื่อลองสถานการณ์</p>
        ) : (
          <div className="wl-log">
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
    <div className="wl-log-row">
      <span className="wl-log-time">{time}</span>
      <div className="wl-log-body">
        <div className={`wl-log-text ${TONE[entry.kind]}`}>{entry.text}</div>
        {entry.detail ? <div className="wl-log-detail">{entry.detail}</div> : null}
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
      className={`wl-silo${selected ? " sel" : ""}${blinking ? " blink" : ""}`}
      aria-pressed={selected}
    >
      <div className="wl-silo-top">
        <span className="wl-silo-id">{silo.id}</span>
        <span className="wl-silo-ch">{silo.channel}</span>
        <span className="wl-silo-pct" style={{ color: tone }}>
          {silo.levelPct.toFixed(1)}%
        </span>
      </div>

      {/* แถบระดับ พร้อมขีดบอกเกณฑ์แจ้งเตือน */}
      <div className="wl-bar">
        <i style={{ width: `${silo.levelPct}%`, background: tone }} />
        <u style={{ left: `${silo.thresholdPct}%` }} aria-hidden />
      </div>

      <div className="wl-silo-meta">
        สถานะจากหน้างาน {silo.statusRaw} · เกณฑ์ {silo.thresholdPct}% · ป้อน {silo.feedsKiln}
      </div>
      <div className="wl-silo-state">
        {holder ? (
          <span className="t-green">มีรถ {holder} ทำงานอยู่</span>
        ) : suppressReason ? (
          <span className="t-yellow">{suppressReason}</span>
        ) : blinking ? (
          <span className="t-red">กำลังแจ้งเตือน</span>
        ) : (
          <span style={{ color: "#6f8ba3" }}>ปกติ</span>
        )}
      </div>
    </button>
  );
}
