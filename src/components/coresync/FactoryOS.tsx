"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BRAND,
  lineSensorStates,
  machines,
  navItems,
  sensorStatusLabel,
  viewTitles,
} from "@/lib/coresync-data";
import { AiView, DigitalTwinView, GenericView, OverviewView } from "./views";

type ModalTarget = { line: number; machineKey: string };

export function FactoryOS() {
  const [view, setView] = useState("overview");
  const [selectedLine, setSelectedLine] = useState(2);
  const [dtFilter, setDtFilter] = useState("all");
  const [dimmed, setDimmed] = useState(false);
  const [modal, setModal] = useState<ModalTarget | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answered, setAnswered] = useState(false);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modal]);

  const openMachine = (line: number, machineKey: string) => {
    setSelectedLine(line);
    setModal({ line, machineKey });
  };

  const ask = (value?: string) => {
    const q = (value ?? question).trim();
    setQuestion(q || "Why is Line 2 output below target?");
    setAnswered(false);
    setThinking(true);
    window.setTimeout(() => {
      setThinking(false);
      setAnswered(true);
    }, 700);
  };

  const activeNav = navItems.find((item) => item.key === view);
  const title = viewTitles[view] ?? `${activeNav?.label ?? "Factory"} Module`;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo" aria-hidden>C</div>
          <div>
            <b>{BRAND.name}</b>
            <small>{BRAND.suffix.toUpperCase()}</small>
          </div>
        </div>
        <nav className="nav" aria-label="Factory OS modules">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={view === item.key ? "active" : ""}
              onClick={() => setView(item.key)}
              aria-current={view === item.key ? "page" : undefined}
            >
              <span className="ico" aria-hidden>{item.icon}</span>
              {item.label}
              {item.badge ? <span className="badge">{item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          {BRAND.name} {BRAND.suffix}
          <br />
          {BRAND.product} {BRAND.version}
          <Link className="home-link" href="/">‹ กลับไป watcharin-service.com</Link>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="title">{title}</div>
          <div className="live"><span className="dot" aria-hidden />Live</div>
          <span className="demo-tag">Demo · ข้อมูลตัวอย่าง</span>
          <div className="top-actions">
            <button type="button" onClick={() => setToast("Search assets, lines, work orders and reports")} aria-label="Search">⌕</button>
            <button type="button" onClick={() => setToast("12 notifications · 5 operational alerts")}>
              ♢ <span className="badge">12</span>
            </button>
            <button type="button" className="shift">Shift A ▣</button>
            <div className="profile">
              <div className="avatar" aria-hidden>AM</div>
              <div>Alex Morgan<small>Plant Manager</small></div>
            </div>
          </div>
        </header>

        <main className="content">
          {view === "overview" && (
            <OverviewView
              selectedLine={selectedLine}
              onSelectLine={setSelectedLine}
              onMachineClick={openMachine}
              onOpenAi={() => setView("ai")}
            />
          )}
          {view === "digital" && (
            <DigitalTwinView
              filter={dtFilter}
              onFilter={(value) => {
                setDtFilter(value);
                if (value !== "all") setSelectedLine(Number(value));
              }}
              selectedLine={selectedLine}
              onMachineClick={openMachine}
              onCreateWorkOrder={() => setToast("Work order WO-24972 created from AI recommendation")}
              dimmed={dimmed}
              onToggle2D={() => setDimmed((v) => !v)}
            />
          )}
          {view === "ai" && (
            <AiView
              question={question}
              onQuestionChange={setQuestion}
              onAsk={ask}
              answered={answered}
              thinking={thinking}
            />
          )}
          {!["overview", "digital", "ai"].includes(view) && (
            <GenericView title={activeNav?.label ?? "Factory Module"} />
          )}
        </main>
      </section>

      {modal && (
        <MachineModal
          target={modal}
          onClose={() => setModal(null)}
          onOpenTwin={() => {
            setModal(null);
            setView("digital");
            setDtFilter(String(modal.line));
          }}
          onWorkOrder={() => {
            setModal(null);
            setToast("Work order WO-24972 created");
          }}
          onStop={() => {
            setModal(null);
            setToast("Simulation only — no equipment was contacted");
          }}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function MachineModal({
  target,
  onClose,
  onOpenTwin,
  onWorkOrder,
  onStop,
}: {
  target: ModalTarget;
  onClose: () => void;
  onOpenTwin: () => void;
  onWorkOrder: () => void;
  onStop: () => void;
}) {
  const index = machines.findIndex((m) => m.key === target.machineKey);
  const machine = machines[index];
  const state = lineSensorStates[target.line]?.[index] ?? "ok";
  const statusTone = state === "warn" ? "w" : state === "crit" ? "off" : state === "maint" ? "" : "ok";

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Equipment detail"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <small style={{ color: "#6f8da5" }}>EQUIPMENT DETAIL</small>
            <h2>Line {target.line} • {machine?.name.filter(Boolean).join(" ")}</h2>
          </div>
          <button type="button" className="x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="mstats">
          <div className="mini">
            <label>Status</label>
            <b className={statusTone || undefined}>{sensorStatusLabel[state]}</b>
          </div>
          <div className="mini">
            <label>Health</label>
            <b>86%</b>
            <div className="bar"><i style={{ width: "86%" }} /></div>
          </div>
          <div className="mini">
            <label>Last Service</label>
            <b style={{ fontSize: 13 }}>17 May</b>
          </div>
        </div>
        <div className="timeline">
          <b>Live Telemetry</b>
          <br />
          Temperature: 68.4 °C &nbsp;•&nbsp; Vibration: 2.1 mm/s &nbsp;•&nbsp; Current: 6.3 A
          <br />
          Cycle: 38.6 sec &nbsp;•&nbsp; Runtime today: 7h 42m &nbsp;•&nbsp; Error code: None
        </div>
        <div className="actions">
          <button type="button" onClick={onOpenTwin}>Open in Digital Twin</button>
          <button type="button" onClick={onWorkOrder}>Create Work Order</button>
          <button type="button" className="danger" onClick={onStop}>Simulate Stop</button>
        </div>
      </div>
    </div>
  );
}

/**
 * The mockup is an operator console designed for a control-room screen. Squeezing
 * it onto a phone would misrepresent the product, so below 1180px we explain what
 * it is and invite the visitor back on a larger screen.
 */
/**
 * Shown instead of the console below the mockup's 1180px floor.
 *
 * Which of the two is visible is decided purely by a CSS media query, not by
 * measuring the window in JavaScript. Measuring would mean rendering nothing on
 * the server until the client reported a width — and this route is indexed, so
 * an empty first paint would be an empty page as far as a crawler is concerned.
 */
export function DesktopNotice() {
  return (
    <div className="desktop-notice">
      <div className="dn-card">
        <div className="dn-logo" aria-hidden>C</div>
        <h1>{BRAND.name} {BRAND.suffix}</h1>
        <p className="dn-kicker">{BRAND.product.toUpperCase()} · DEMO</p>
        <p className="dn-lead">
          ตัวอย่างระบบ Factory OS — dashboard สำหรับห้องควบคุมการผลิต เห็นสายการผลิตแบบ realtime,
          สุขภาพเครื่องจักร, digital twin ของแต่ละไลน์ และ AI ที่อธิบายว่าทำไมยอดผลิตตก
        </p>
        <p className="dn-note">
          หน้าจอนี้ออกแบบสำหรับจอควบคุมขนาดใหญ่ (กว้างอย่างน้อย 1180px)
          เปิดบนคอมพิวเตอร์เพื่อกดเล่นได้เต็มรูปแบบครับ
        </p>
        <Link className="dn-cta" href="/#industrial">ดู solution โรงงานบนเว็บหลัก →</Link>
        <p className="dn-disclaimer">
          ข้อมูลทั้งหมดในหน้านี้เป็นข้อมูลสมมติสำหรับสาธิต ไม่ใช่โรงงานจริง
        </p>
      </div>
    </div>
  );
}
