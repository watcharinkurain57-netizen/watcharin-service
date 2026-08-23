"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OperatorEvent, OperatorKind } from "@/lib/demo/contract";
import { plantFromReadings, type PlantSilo } from "@/lib/demo/operator/plant";
import {
  DRIVERS,
  VEHICLES,
  bindCard,
  driverForCard,
  maskCard,
  type Driver,
  type Vehicle,
} from "@/lib/demo/operator/roster";
import { useCardReader } from "@/lib/demo/rfid";
import { useHashToken, useViewerSession } from "@/lib/demo/session-store";
import { useDemoChannel, useSecondsSince } from "@/lib/demo/useDemoChannel";

/**
 * หน้าจอคนขับ — แตะบัตรจริงจากเครื่องอ่าน USB แล้วทำงานกับข้อมูลสดของลูกค้า
 *
 * ⚠️ ขอบเขตที่ตั้งใจ: หน้านี้พิสูจน์ 2 อย่างคือ **เครื่องอ่านบัตรใช้ได้จริงโดยไม่ต้องลงอะไร**
 * และ **ไซโลที่คนขับเห็นคือค่าจากโรงงานเขาเอง** ไม่ได้พิสูจน์การแย่งจองที่มีผู้ชนะแน่นอน
 * (เรื่องนั้นอยู่ที่แท็บ Loader Ops ซึ่งจำลองกฎของระบบจริงไว้ครบ) — ต้องเขียนบอกบนจอ
 */

type Screen = "wait" | "bind" | "vehicle" | "meter" | "dash";

export function OperatorTablet() {
  const session = useViewerSession();
  const live = useDemoChannel(session?.sessionId ?? null);
  const since = useSecondsSince(live.lastAt);

  // โทเคนอยู่หลัง # ของลิงก์ — ไม่ติดไปกับ request จึงไม่โผล่ใน log ของเซิร์ฟเวอร์
  const token = useHashToken();

  const [screen, setScreen] = useState<Screen>("wait");
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [card, setCard] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [meterBuf, setMeterBuf] = useState("");
  const [job, setJob] = useState<{ silo: string; startedAt: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [feed, setFeed] = useState<string[]>([]);

  const plant = useMemo(() => plantFromReadings(live.latest), [live.latest]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /**
   * ส่งเหตุการณ์ให้จออื่นเห็น
   *
   * ⚠️ รับ driver/vehicle เป็นพารามิเตอร์ ไม่อ่านจาก state
   * เพราะทุกที่ที่เรียกคือจังหวะที่เพิ่ง setState ไปบรรทัดก่อน ซึ่ง state ยังเป็นค่าเก่า
   * การส่งค่าตรง ๆ ตัดปัญหานี้ทิ้งทั้งหมด แทนที่จะไปไล่แก้ด้วย ref คู่ขนาน
   */
  const send = useCallback(
    async (kind: OperatorKind, who: Driver | null, veh: Vehicle | null, silo?: string) => {
      if (!token || !who || !veh) return;
      const event: OperatorEvent = {
        kind,
        vehicle: veh.id,
        operator: who.name,
        at: new Date().toISOString(),
        ...(silo ? { silo } : {}),
      };
      try {
        await fetch("/api/demo/operator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, event }),
        });
      } catch {
        // เดโม — ส่งไม่ออกไม่ควรทำให้หน้าจอคนขับค้าง
      }
    },
    [token]
  );

  const onCard = useCallback((code: string) => {
    const known = driverForCard(code);
    setCard(code);
    if (known) {
      setDriver(known);
      setScreen("vehicle");
      setToast(`ยืนยันตัวตนสำเร็จ — ${known.name}`);
    } else {
      setPendingCard(code);
      setScreen("bind");
    }
  }, []);

  // รับบัตรเฉพาะตอนที่หน้าจอรออยู่ ไม่งั้นแตะระหว่างทำงานจะเด้งกลับไปหน้าแรก
  const reader = useCardReader(onCard, screen === "wait");

  const startShift = () => {
    if (!meterBuf || Number.isNaN(Number(meterBuf))) {
      setToast("กรุณากรอกเลขมิเตอร์");
      return;
    }
    setScreen("dash");
    setToast(`เริ่มกะแล้ว — รถ ${vehicle?.id}`);
    void send("shift_start", driver, vehicle);
  };

  const claim = (silo: PlantSilo) => {
    if (job?.silo === silo.id) return;
    if (job) void send("job_end", driver, vehicle, job.silo);
    setJob({ silo: silo.id, startedAt: Date.now() });
    setFeed((prev) => [`เริ่มงานที่ ${silo.id} (${silo.levelPct.toFixed(1)}%)`, ...prev].slice(0, 6));
    setToast(`เริ่มงานที่ ${silo.id}`);
    void send("job_start", driver, vehicle, silo.id);
  };

  const stopJob = () => {
    if (!job) return;
    void send("job_end", driver, vehicle, job.silo);
    setFeed((prev) => [`จบงานที่ ${job.silo}`, ...prev].slice(0, 6));
    setJob(null);
    setToast("จบงานแล้ว");
  };

  const endShift = () => {
    if (job) void send("job_end", driver, vehicle, job.silo);
    void send("shift_end", driver, vehicle);
    setJob(null);
    setDriver(null);
    setVehicle(null);
    setCard(null);
    setMeterBuf("");
    setFeed([]);
    setScreen("wait");
    setToast("จบกะแล้ว — แตะบัตรเพื่อเริ่มใหม่");
  };

  if (!session) return <NoSession />;

  return (
    <div className="op-shell">
      <header className="op-top">
        <div className="op-brand">CoreSync · แท็บเล็ตคนขับ</div>
        {driver ? (
          <span className="op-who">
            {driver.name}
            {vehicle ? ` · ${vehicle.id}` : ""}
          </span>
        ) : null}
        <span className="op-sp" />
        <span className={`op-pill ${live.lastAt ? "ok" : "wait"}`}>
          {live.lastAt ? `ข้อมูลสด · ${since === 0 ? "ไม่กี่วิ" : `${since} วิ`}ที่แล้ว` : "รอข้อมูลจากโรงงาน"}
        </span>
        {screen === "dash" ? (
          <button type="button" className="op-btn danger sm" onClick={endShift}>
            จบกะ
          </button>
        ) : null}
      </header>

      <main className="op-body">
        {screen === "wait" && <WaitForCard reader={reader} onSimulate={onCard} />}

        {screen === "bind" && pendingCard && (
          <BindCard
            code={pendingCard}
            onPick={(picked) => {
              bindCard(pendingCard, picked.id);
              setDriver(picked);
              setPendingCard(null);
              setScreen("vehicle");
              setToast(`ผูกบัตรกับ ${picked.name} แล้ว`);
            }}
            onCancel={() => {
              setPendingCard(null);
              setCard(null);
              setScreen("wait");
            }}
          />
        )}

        {screen === "vehicle" && (
          <PickVehicle
            onPick={(picked) => {
              setVehicle(picked);
              setScreen("meter");
              void send("login", driver, picked);
            }}
          />
        )}

        {screen === "meter" && (
          <MeterKeypad
            value={meterBuf}
            vehicle={vehicle}
            onKey={(k) =>
              setMeterBuf((prev) => {
                if (k === "⌫") return prev.slice(0, -1);
                if (k === ".") return prev.includes(".") ? prev : `${prev}.`;
                return prev.length < 9 ? prev + k : prev;
              })
            }
            onSubmit={startShift}
          />
        )}

        {screen === "dash" && (
          <Dashboard
            plant={plant}
            job={job}
            feed={feed}
            waiting={live.lastAt === null}
            onClaim={claim}
            onStop={stopJob}
          />
        )}
      </main>

      <footer className="op-foot">
        <span>
          🧪 โหมดทดลอง — ไม่บันทึกข้อมูล{card ? ` · บัตร ${maskCard(card)}` : ""}
        </span>
        <span className="op-sp" />
        {token ? (
          <span>ส่งเหตุการณ์ให้จออื่นเห็นด้วย</span>
        ) : (
          <span className="op-warn">โหมดเครื่องเดียว — จออื่นจะไม่เห็นการจองงาน</span>
        )}
      </footer>

      {toast ? <div className="op-toast">{toast}</div> : null}
    </div>
  );
}

function NoSession() {
  return (
    <div className="op-shell">
      <main className="op-body op-center">
        <div className="op-card">
          <h1 className="op-h1">ยังไม่ได้ระบุช่องข้อมูล</h1>
          <p className="op-muted">
            หน้านี้ต้องเปิดจากลิงก์ที่หน้าเชื่อมต่อสร้างให้ เพราะต้องรู้ว่าจะฟังข้อมูลของช่องไหน
          </p>
          <Link className="op-btn primary" href="/coresync/connect">
            ไปหน้าเชื่อมต่อข้อมูล
          </Link>
        </div>
      </main>
    </div>
  );
}

function WaitForCard({
  reader,
  onSimulate,
}: {
  reader: { seenReader: boolean; lastCode: string | null };
  onSimulate: (code: string) => void;
}) {
  return (
    <div className="op-center">
      <div className="op-card wide">
        <div className="op-tapicon" aria-hidden>
          ▣
        </div>
        <h1 className="op-h1">แตะบัตรเพื่อเข้าใช้งาน</h1>
        <p className="op-muted">
          เสียบเครื่องอ่าน RFID เข้าพอร์ต USB แล้วแตะบัตรได้เลย — ไม่ต้องติดตั้งโปรแกรมหรือ driver
          เพราะเครื่องอ่านแบบ keyboard-wedge ทำตัวเป็นคีย์บอร์ด
        </p>
        <p className={`op-readerstate ${reader.seenReader ? "ok" : ""}`}>
          {reader.seenReader ? "✓ อ่านบัตรได้แล้ว รอใบถัดไป" : "รอสัญญาณจากเครื่องอ่าน…"}
        </p>

        <div className="op-divider">
          <span>ไม่มีเครื่องอ่านตอนนี้</span>
        </div>
        <p className="op-muted sm">กดบัตรตัวอย่างเพื่อดูขั้นตอนต่อไปได้ โดยไม่ต้องมีอุปกรณ์</p>
        <div className="op-simrow">
          {["DEMO-0001", "DEMO-0002"].map((code) => (
            <button key={code} type="button" className="op-btn ghost" onClick={() => onSimulate(code)}>
              แตะบัตรตัวอย่าง {code.slice(-4)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BindCard({
  code,
  onPick,
  onCancel,
}: {
  code: string;
  onPick: (driver: Driver) => void;
  onCancel: () => void;
}) {
  return (
    <div className="op-center">
      <div className="op-card wide">
        <h1 className="op-h1">บัตรใบนี้ยังไม่มีเจ้าของ</h1>
        <p className="op-muted">
          เลขบัตร <b className="op-mono">{maskCard(code)}</b> — เลือกว่าเป็นของใคร แล้วครั้งต่อไป
          แตะแล้วเข้าระบบได้ทันที
        </p>
        <p className="op-muted sm">
          ระบบจริงมีฐานบัตรที่แยกจากระบบ HR พร้อมบัตรสำรอง บัตรชั่วคราว และวันหมดอายุ —
          ในโหมดทดลองการผูกนี้อยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ปิดแท็บแล้วหาย
        </p>
        <div className="op-pickgrid">
          {DRIVERS.map((d) => (
            <button key={d.id} type="button" className="op-pick" onClick={() => onPick(d)}>
              <b>{d.name}</b>
              <small>{d.code}</small>
            </button>
          ))}
        </div>
        <button type="button" className="op-btn ghost" onClick={onCancel}>
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

function PickVehicle({ onPick }: { onPick: (vehicle: Vehicle) => void }) {
  return (
    <div className="op-center">
      <div className="op-card wide">
        <h1 className="op-h1">เลือกรถ</h1>
        <div className="op-pickgrid">
          {VEHICLES.map((v) => (
            <button key={v.id} type="button" className="op-pick veh" onClick={() => onPick(v)}>
              <span className="op-vbadge" style={{ background: v.color }}>
                {v.id}
                {v.spare ? " (สำรอง)" : ""}
              </span>
              <small>{v.plate}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

function MeterKeypad({
  value,
  vehicle,
  onKey,
  onSubmit,
}: {
  value: string;
  vehicle: Vehicle | null;
  onKey: (key: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="op-center">
      <div className="op-card">
        <h1 className="op-h1">รถ {vehicle?.id} — กรอกเลขมิเตอร์ชั่วโมง</h1>
        <div className="op-display">{value || "0.0"}</div>
        <div className="op-keypad">
          {KEYS.map((k) => (
            <button key={k} type="button" className="op-key" onClick={() => onKey(k)}>
              {k}
            </button>
          ))}
        </div>
        <button type="button" className="op-btn primary" onClick={onSubmit}>
          ยืนยัน เริ่มกะ
        </button>
      </div>
    </div>
  );
}

function Dashboard({
  plant,
  job,
  feed,
  waiting,
  onClaim,
  onStop,
}: {
  plant: ReturnType<typeof plantFromReadings>;
  job: { silo: string; startedAt: number } | null;
  feed: string[];
  waiting: boolean;
  onClaim: (silo: PlantSilo) => void;
  onStop: () => void;
}) {
  return (
    <div className="op-dash">
      <aside className="op-side">
        <div className="op-lbl">สถานะ</div>
        <div className="op-job">{job ? job.silo : "ว่าง"}</div>
        {job ? <Elapsed from={job.startedAt} /> : <p className="op-muted sm">กดไซโลเพื่อเริ่มงาน</p>}
        {job ? (
          <button type="button" className="op-btn danger" onClick={onStop}>
            เลิกการทำงาน
          </button>
        ) : null}
        {feed.length > 0 ? (
          <div className="op-feed">
            <div className="op-lbl">ล่าสุด</div>
            {feed.map((line, i) => (
              <div key={`${line}-${i}`} className="op-feedline">
                {line}
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <section className="op-main">
        {plant.kilns.length > 0 ? (
          <div className="op-kilns">
            {plant.kilns.map((k) => (
              <div key={k.id} className="op-kiln">
                <b>{k.id}</b>
                <span>
                  {k.value.toLocaleString("th-TH", { maximumFractionDigits: 1 })}
                  {k.unit ? ` ${k.unit}` : ""}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        {waiting ? (
          <div className="op-empty">
            <b>ยังไม่มีข้อมูลจากโรงงาน</b>
            <p className="op-muted sm">
              ให้ตัวเชื่อมต่อที่เครื่องหน้างานเริ่มส่งข้อมูล แล้วไซโลจะขึ้นที่นี่เอง
            </p>
          </div>
        ) : plant.silos.length === 0 ? (
          <div className="op-empty">
            <b>ได้รับข้อมูลแล้ว แต่ยังไม่เจอ tag ที่เป็นระดับไซโล</b>
            <p className="op-muted sm">
              หน้านี้มองหา tag ที่ลงท้ายด้วย <span className="op-mono">_LEVEL</span> เช่น{" "}
              <span className="op-mono">KK1_LEVEL</span> — ระบบจริงใช้ตารางแมปที่ตั้งค่าได้
              ไม่ได้เดาจากชื่อแบบนี้
              {plant.others.length > 0 ? ` · ที่รับมาตอนนี้: ${plant.others.slice(0, 6).join(", ")}` : ""}
            </p>
          </div>
        ) : (
          <div className="op-silos">
            {plant.silos.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`op-silo${s.low ? " low" : ""}${job?.silo === s.id ? " mine" : ""}`}
                onClick={() => onClaim(s)}
              >
                <div className="op-siloid">{s.id}</div>
                <div className="op-silopct">{s.levelPct.toFixed(1)}%</div>
                <div className="op-silobar">
                  <span style={{ width: `${Math.max(0, Math.min(100, s.levelPct))}%` }} />
                </div>
                <div className="op-silost">
                  {s.statusRaw ?? (s.low ? "ต่ำกว่าเกณฑ์" : "ปกติ")}
                  {s.stale ? " · ค่าเก่า" : ""}
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="op-note">
          การจองงานที่นี่คือการ <b>ประกาศให้จออื่นเห็น</b> ไม่ใช่การแย่งสิทธิ์ที่มีผู้ชนะแน่นอน —
          กลไกตัดสินจริงดูได้ที่แท็บ Loader Ops ใน{" "}
          <Link href="/coresync">หน้าจอ Factory OS</Link>
        </p>
      </section>
    </div>
  );
}

function Elapsed({ from }: { from: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const s = Math.max(0, Math.floor((now - from) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="op-timer">
      {pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </div>
  );
}
