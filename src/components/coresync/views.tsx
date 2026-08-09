"use client";

import type { ReactNode } from "react";
import {
  type Alert,
  type Chart,
  type ChartBox,
  type LineStatus,
  type ProductionLine,
  type SensorState,
  type WoCard,
  CHART,
  SPARK,
  WIDE,
  aiAnswer,
  aiSuggestions,
  assetHealth,
  baht,
  bandBetween,
  blockingParts,
  builtModules,
  completedWork,
  crew,
  copqToday,
  currentHour,
  defectPareto,
  defectTotal,
  demandChargeMonth,
  downtimeCauses,
  downtimeTotal,
  energyByArea,
  energyCostPerUnit,
  energyCostToday,
  energyToday,
  equipmentHealth,
  equipmentTotal,
  firstPassYield,
  indexToX,
  inspectedTotal,
  kpis,
  line2Metrics,
  lineAlerts,
  lineCharts,
  lineQuality,
  lineSensorStates,
  liveInsights,
  loadProfiles,
  loadToday,
  machines,
  maintenanceHistory,
  maintenanceKpis,
  maintenanceUpcoming,
  monthlyBill,
  offPeakKwh,
  onPeakKwh,
  paretoVitalFew,
  partStatus,
  peakDemand,
  plantAlerts,
  plantCharts,
  pmSchedule,
  productionLines,
  productionSummary,
  qualityHolds,
  robotArmSensors,
  ruleAt,
  scaleSeries,
  scaleValue,
  sensorGlyph,
  seriesToArea,
  seriesToPath,
  seriesToPoints,
  spanBetween,
  sparePartsAtRisk,
  spc,
  spcLcl,
  spcSignals,
  spcStats,
  spcUcl,
  standbyCostPerMonth,
  standbyFinding,
  standbyKwhPerDay,
  tariff,
  thousands,
  valueToY,
  woBoard,
  woColumns,
  woFilters,
  woStats,
} from "@/lib/coresync-data";

const statusClass: Record<LineStatus, string> = {
  running: "",
  warning: "warn",
  maintenance: "maint",
};

const ringColor: Record<LineStatus, string> = {
  running: "var(--green)",
  warning: "var(--yellow)",
  maintenance: "var(--cyan)",
};

const toneVar: Record<string, string> = {
  ok: "var(--green)",
  warn: "var(--yellow)",
  crit: "var(--red)",
  maint: "var(--cyan)",
};

/* ---------------- shared pieces ---------------- */

export function ProductionLineDiagram({
  line,
  selected,
  onMachineClick,
}: {
  line: number;
  selected: boolean;
  onMachineClick: (line: number, machineKey: string) => void;
}) {
  const states = lineSensorStates[line] ?? [];
  return (
    <div className={`prod-line${selected ? " selected" : ""}`}>
      <div className="line-label">LINE {line}</div>
      {machines.map((machine, i) => {
        const state: SensorState = states[i] ?? "ok";
        const label = machine.name.filter(Boolean).join(" ");
        return (
          <button
            key={machine.key}
            type="button"
            className={`machine${machine.variant ? ` ${machine.variant}` : ""}`}
            onClick={() => onMachineClick(line, machine.key)}
            aria-label={`Line ${line} ${label}`}
          >
            <span className={`sensor ${state === "ok" ? "" : state}`} aria-hidden>
              {sensorGlyph[state]}
            </span>
            <div className="micon" aria-hidden>{machine.icon}</div>
            <div className="name">
              {machine.name[0]}
              {machine.name[1] ? <><br />{machine.name[1]}</> : null}
              {machine.key === "agv" ? `-0${line}` : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AlertList({ alerts }: { alerts: readonly Alert[] }) {
  return (
    <div className="alerts">
      {alerts.map((alert) => (
        <div className="alert-row" key={alert.title + alert.time}>
          <div className={`aicon${alert.severity === "critical" ? "" : ` ${alert.severity}`}`} aria-hidden>
            {alert.severity === "info" ? "i" : "!"}
          </div>
          <div>
            <b>{alert.title}</b>
            <small>{alert.detail}</small>
          </div>
          <span className="alert-time">{alert.time}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({ chart }: { chart: Chart }) {
  return (
    <div className="card chart">
      <div className="chart-head">
        <span>{chart.title}</span>
        <b>{chart.value}</b>
      </div>
      <svg
        className="svgchart"
        viewBox={`0 0 ${CHART.width} ${CHART.height}`}
        role="img"
        aria-label={`${chart.title}: ${chart.value}`}
      >
        <path className="gridline" d={[90, 50, 10].map((v) => ruleAt(v)).join(" ")} />
        <path className="targetline" d={ruleAt(50)} />
        <path
          className={`chart-line${chart.tone === "green" ? "" : ` ${chart.tone}`}`}
          d={seriesToPath(chart.series)}
        />
      </svg>
    </div>
  );
}

function LineCard({
  line,
  selected,
  onSelect,
}: {
  line: ProductionLine;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const cls = statusClass[line.status];
  return (
    <button
      type="button"
      className={`line-card${cls ? ` ${cls}` : ""}${selected ? " sel" : ""}`}
      onClick={() => onSelect(line.id)}
    >
      <div className="line-head">
        <b>Line {line.id}</b>
        <span className={`status${cls ? ` ${cls}` : ""}`}>{line.statusLabel}</span>
      </div>
      <div className="line-metrics">
        <div
          className="ring"
          style={{
            background: `conic-gradient(${ringColor[line.status]} 0 ${Math.max(line.oee, 3)}%, #173047 ${Math.max(line.oee, 3)}%)`,
          }}
        >
          <span>{line.oee}%</span>
        </div>
        <div>
          <small>Throughput</small>
          <b>{line.throughput}</b>
          <small style={{ marginTop: 7 }}>{line.secondaryLabel}</small>
          <b>{line.secondaryValue}</b>
        </div>
      </div>
    </button>
  );
}

/* ---------------- overview ---------------- */

export function OverviewView({
  selectedLine,
  onSelectLine,
  onMachineClick,
  onOpenAi,
}: {
  selectedLine: number;
  onSelectLine: (id: number) => void;
  onMachineClick: (line: number, machineKey: string) => void;
  onOpenAi: () => void;
}) {
  // Cumulative offsets computed without mutating anything during render.
  const donutStops = equipmentHealth.map((slice, i) => {
    const from = equipmentHealth.slice(0, i).reduce((sum, s) => sum + s.pct, 0);
    return `${toneVar[slice.tone]} ${from}% ${from + slice.pct}%`;
  });

  return (
    <section className="view">
      <div className="grid-kpi">
        {kpis.map((kpi) => (
          <div className="card kpi" key={kpi.label}>
            <div className="iconbox" aria-hidden>{kpi.icon}</div>
            <div>
              <label>{kpi.label}</label>
              <strong>
                {kpi.value}
                {kpi.unit ? <small> {kpi.unit}</small> : null}
              </strong>
              <div className={`trend${kpi.trendBad ? " bad" : ""}`}>{kpi.trend}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <div className="card">
          <div className="section-title">PRODUCTION LINES</div>
          {productionLines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              selected={line.id === selectedLine}
              onSelect={onSelectLine}
            />
          ))}
        </div>

        <div className="card factory-card">
          <div className="factory-toolbar">
            <b style={{ fontSize: 12 }}>FACTORY DIGITAL VIEW</b>
            <span style={{ fontSize: 10, color: "#748ca1" }}>Real-time operational context</span>
            <div className="legend">
              <span><i className="ld" style={{ background: "var(--green)" }} />Sensor OK</span>
              <span><i className="ld" style={{ background: "var(--yellow)" }} />Warning</span>
              <span><i className="ld" style={{ background: "var(--red)" }} />Issue</span>
              <span><i className="ld" style={{ background: "var(--cyan)" }} />Maintenance</span>
              <span><i className="ld" style={{ background: "var(--purple)" }} />AGV</span>
            </div>
          </div>
          <div className="factory-floor">
            <div className="floor-glow" />
            {productionLines.map((line) => (
              <ProductionLineDiagram
                key={line.id}
                line={line.id}
                selected={line.id === selectedLine}
                onMachineClick={onMachineClick}
              />
            ))}
          </div>
        </div>

        <div className="right-col">
          <div className="card">
            <div className="section-title">
              LIVE ALERTS <span className="badge">{plantAlerts.length}</span>
            </div>
            <AlertList alerts={plantAlerts} />
          </div>
          <div className="card">
            <div className="section-title">EQUIPMENT HEALTH</div>
            <div className="donut-wrap">
              <div className="donut" style={{ background: `conic-gradient(${donutStops.join(", ")})` }}>
                <div className="donut-hole">
                  {equipmentTotal}
                  <small>Total</small>
                </div>
              </div>
              <div className="health-leg">
                {equipmentHealth.map((slice) => (
                  <div key={slice.label}>
                    <i style={{ background: toneVar[slice.tone] }} />
                    {slice.label}&nbsp;&nbsp;{slice.count} ({slice.pct}%)
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        {plantCharts.map((chart) => (
          <ChartCard key={chart.title} chart={chart} />
        ))}
        <div className="card ai-card">
          <span className="ai-badge">Beta</span>
          <div className="section-title" style={{ paddingLeft: 0 }}>AI ASSISTANT</div>
          <div className="ai-orb" aria-hidden />
          <p>Line 2 is showing a higher than normal reject rate driven by Robot Arm temperature fluctuations.</p>
          <div className="rec">Recommendation</div>
          <p style={{ marginTop: 4 }}>Reduce robot speed by 10% and schedule a lubrication check.</p>
          <button type="button" className="primary" onClick={onOpenAi}>View full analysis →</button>
        </div>
        <div className="card summary">
          <div className="section-title" style={{ paddingLeft: 0 }}>PRODUCTION SUMMARY (Today)</div>
          {productionSummary.map((row) => (
            <div className="sum-row" key={row.label}>
              <span>{row.label}</span>
              <b>{row.value}</b>
            </div>
          ))}
          <div style={{ color: "#637d92", fontSize: 9, marginTop: 8 }}>Sample data · not a live plant</div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- digital twin ---------------- */

export function DigitalTwinView({
  filter,
  onFilter,
  selectedLine,
  onMachineClick,
  onCreateWorkOrder,
  dimmed,
  onToggle2D,
}: {
  filter: string;
  onFilter: (value: string) => void;
  selectedLine: number;
  onMachineClick: (line: number, machineKey: string) => void;
  onCreateWorkOrder: () => void;
  dimmed: boolean;
  onToggle2D: () => void;
}) {
  const lines = filter === "all" ? productionLines.map((l) => l.id) : [Number(filter)];

  return (
    <section className="view">
      <div className="crumbs">Overview &nbsp;›&nbsp; Digital Twin &nbsp;›&nbsp; Production Lines</div>
      <div className="dt-grid">
        <div className="card dt-main">
          <div className="dt-toolbar">
            <div className="seg">
              {["all", "1", "2", "3"].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={filter === value ? "active" : ""}
                  onClick={() => onFilter(value)}
                >
                  {value === "all" ? "All Lines" : `Line ${value}`}
                </button>
              ))}
            </div>
            <div className="seg toggle">
              <button type="button" className={dimmed ? "" : "active"} onClick={onToggle2D}>3D</button>
              <button type="button" className={dimmed ? "active" : ""} onClick={onToggle2D}>2D</button>
            </div>
          </div>
          <div className="dt-stage" style={dimmed ? { filter: "saturate(.75) contrast(1.05)" } : undefined}>
            <div className="scan" />
            {lines.map((id) => (
              <ProductionLineDiagram
                key={id}
                line={id}
                selected={id === selectedLine}
                onMachineClick={onMachineClick}
              />
            ))}
          </div>
        </div>

        <div className="dt-info">
          <div className="card">
            <div className="section-title">SELECTED LINE</div>
            <div style={{ padding: "0 10px 3px", display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 19 }}>Line 2</h2>
              <span className="status warn">● Warning</span>
            </div>
            <div className="metric-grid">
              {line2Metrics.map((metric) => (
                <div className="mini" key={metric.label}>
                  <label>{metric.label}</label>
                  <b>{metric.value}</b>
                  <small className={`trend${metric.bad ? " bad" : ""}`}>{metric.delta}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="two-col">
              <div>
                <div className="section-title" style={{ paddingLeft: 0 }}>EQUIPMENT (Line 2)</div>
                <div className="asset-list">
                  {machines.map((machine, i) => {
                    const state = lineSensorStates[2]?.[i] ?? "ok";
                    const label = state === "warn" ? "Warning" : i === 5 || i === 8 ? "Idle" : "Running";
                    return (
                      <div className="asset" key={machine.key}>
                        <span>
                          <span className="num">{i + 1}</span>
                          {machine.name.filter(Boolean).join(" ")}
                        </span>
                        <b className={state === "warn" ? "w" : "ok"}>{label}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="section-title" style={{ paddingLeft: 0 }}>LIVE SENSORS (Robot Arm)</div>
                <div className="sensor-list">
                  {robotArmSensors.map((sensor) => (
                    <div className="sens" key={sensor.label}>
                      <span>{sensor.label}</span>
                      <b className={sensor.tone === "warn" ? "w" : sensor.tone === "ok" ? "ok" : undefined}>
                        {sensor.value}
                      </b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title">CURRENT ALERTS</div>
            <AlertList alerts={lineAlerts} />
          </div>
        </div>
      </div>

      <div className="bottom-grid" style={{ gridTemplateColumns: "repeat(3, 1fr) 1.2fr 1.2fr" }}>
        {lineCharts.map((chart) => (
          <ChartCard key={chart.title} chart={chart} />
        ))}
        <div className="card ai-card">
          <span className="ai-badge">Beta</span>
          <div className="section-title" style={{ paddingLeft: 0 }}>AI RECOMMENDATION</div>
          <div className="rec">Root Cause</div>
          <p>Increased vibration on Robot Arm is likely caused by bearing wear on Joint 2.</p>
          <div className="rec">Next Best Action</div>
          <p>Schedule inspection and bearing replacement during the next maintenance window.</p>
          <button type="button" className="primary" onClick={onCreateWorkOrder}>Create Work Order</button>
        </div>
        <div className="workorders">
          <div className="card wo">
            <div className="section-title" style={{ paddingLeft: 0 }}>MAINTENANCE HISTORY</div>
            {maintenanceHistory.map((wo) => (
              <div className="wo-row" key={wo.id}>
                <span className="complete">{wo.state}</span>
                <b>{wo.id}</b>
                <small>{wo.asset} — {wo.task}</small>
              </div>
            ))}
          </div>
          <div className="card wo">
            <div className="section-title" style={{ paddingLeft: 0 }}>UPCOMING</div>
            {maintenanceUpcoming.map((wo) => (
              <div className="wo-row" key={wo.id}>
                <span className="soon">{wo.state}</span>
                <b>{wo.id}</b>
                <small>{wo.asset} — {wo.task}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- AI insights ---------------- */

export function AiView({
  question,
  onQuestionChange,
  onAsk,
  answered,
  thinking,
}: {
  question: string;
  onQuestionChange: (value: string) => void;
  onAsk: (value?: string) => void;
  answered: boolean;
  thinking: boolean;
}) {
  return (
    <section className="view">
      <div className="ai-view-grid">
        <div className="card big-ai">
          <div className="section-title">AI FACTORY ASSISTANT</div>
          <div className="ai-center">
            <div>
              <div className="core-orb" aria-hidden />
              <h2>Ask your factory anything</h2>
              <p>
                AI combines live production, equipment health, energy, quality, and maintenance data to
                explain what is happening and what to do next.
              </p>
            </div>
          </div>
          <form
            className="promptbar"
            onSubmit={(event) => {
              event.preventDefault();
              onAsk();
            }}
          >
            <input
              value={question}
              onChange={(event) => onQuestionChange(event.target.value)}
              placeholder="e.g. Why is Line 2 output below target?"
              aria-label="Ask the factory assistant"
            />
            <button type="submit">Ask AI</button>
          </form>
          <div className="suggestions">
            {aiSuggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="suggestion" onClick={() => onAsk(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          <div className="ai-answer" aria-live="polite">
            {thinking ? (
              <span style={{ color: "#54c6ff" }}>Analyzing live factory context…</span>
            ) : answered ? (
              <>
                <b style={{ color: "#eaf7ff" }}>{aiAnswer.heading}</b>
                <br />
                {aiAnswer.body}
                <br />
                <br />
                <b style={{ color: "#67c6ff" }}>{aiAnswer.actionLabel}</b> {aiAnswer.action}
              </>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="section-title">LIVE INSIGHTS</div>
          <div className="insight-list">
            {liveInsights.map((insight) => (
              <div className="insight" key={insight.title}>
                <b className={insight.tone === "warn" ? "w" : insight.tone === "ok" ? "ok" : undefined}>
                  {insight.title}
                </b>
                <small>{insight.body}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- plant module pieces ----------------
 *
 * Quality, Energy, Maintenance and Work Orders are all built from the same
 * four parts: a strip of headline numbers, a two-column grid of panels, a
 * horizontal bar list, and a table. Writing them once keeps the four modules
 * looking like one product rather than four screens by four people.
 */

type Stat = { label: string; value: string; note?: string; bad?: boolean };

function StatStrip({ stats }: { stats: readonly Stat[] }) {
  return (
    <div className="statstrip">
      {stats.map((stat) => (
        <div className="card stat" key={stat.label}>
          <label>{stat.label}</label>
          <b>{stat.value}</b>
          {stat.note ? <small className={stat.bad ? "bad" : undefined}>{stat.note}</small> : null}
        </div>
      ))}
    </div>
  );
}

/**
 * Repeated on every module that quotes a baht figure. The topbar badge already
 * says this is a demo, but a screenshot of one panel travels without the topbar.
 */
function SampleNote({ children }: { children?: ReactNode }) {
  return <div className="sample-note">{children ?? "Sample data · not a live plant"}</div>;
}

type BarRow = {
  key: string;
  label: string;
  sub?: string;
  /** Bar width as a percentage of the largest row in the list. */
  bar: number;
  value: string;
  extra?: string;
  tone?: "cyan" | "yellow" | "red" | "green";
};

function relative(value: number, max: number): number {
  return max > 0 ? (value / max) * 100 : 0;
}

function BarBody({ row }: { row: BarRow }) {
  return (
    <>
      <span className="b-label">
        {row.label}
        {row.sub ? <small>{row.sub}</small> : null}
      </span>
      <span className="b-track">
        <i className={row.tone ? `t-${row.tone}` : undefined} style={{ width: `${row.bar}%` }} />
      </span>
      <b className="b-value">{row.value}</b>
      {row.extra !== undefined ? <span className="b-extra">{row.extra}</span> : null}
    </>
  );
}

function BarList({
  rows,
  selected,
  onSelect,
}: {
  rows: readonly BarRow[];
  selected?: string;
  onSelect?: (key: string) => void;
}) {
  const hasExtra = rows.some((row) => row.extra !== undefined);
  return (
    <div className={`bars${hasExtra ? " has-extra" : ""}`}>
      {rows.map((row) =>
        onSelect ? (
          <button
            key={row.key}
            type="button"
            className={`bar-row${selected === row.key ? " sel" : ""}`}
            onClick={() => onSelect(row.key)}
            aria-pressed={selected === row.key}
          >
            <BarBody row={row} />
          </button>
        ) : (
          <div className="bar-row" key={row.key}>
            <BarBody row={row} />
          </div>
        ),
      )}
    </div>
  );
}

function Sparkline({
  series,
  tone,
}: {
  series: readonly number[];
  tone?: "green" | "red" | "cyan";
}) {
  return (
    <svg className="spark" viewBox={`0 0 ${SPARK.width} ${SPARK.height}`} aria-hidden>
      <path className={`spark-line${tone ? ` ${tone}` : ""}`} d={seriesToPath(series, SPARK)} />
    </svg>
  );
}

function DataTable({ head, children }: { head: readonly string[]; children: ReactNode }) {
  return (
    <table className="dtable">
      <thead>
        <tr>
          {head.map((cell) => (
            <th key={cell}>{cell}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

/** Left-hand value axis for the wide charts: min, midpoint, max. */
function ValueAxis({
  labels,
  box = WIDE,
}: {
  labels: readonly { at: number; text: string }[];
  box?: ChartBox;
}) {
  return (
    <>
      {labels.map((label) => (
        <text
          className="axis"
          key={label.text}
          x={box.left - 7}
          y={valueToY(label.at, box) + 3}
          textAnchor="end"
        >
          {label.text}
        </text>
      ))}
    </>
  );
}

function TimeAxis({
  ticks,
  count,
  box = WIDE,
}: {
  ticks: readonly { at: number; label: string }[];
  count: number;
  box?: ChartBox;
}) {
  return (
    <>
      {ticks.map((tick) => (
        <text
          className="axis"
          key={tick.label}
          x={indexToX(tick.at, count, box)}
          y={box.bottom + 14}
          textAnchor="middle"
        >
          {tick.label}
        </text>
      ))}
    </>
  );
}

/* ---------------- quality ---------------- */

export function QualityView({
  selectedDefect,
  onSelectDefect,
  onRaiseWorkOrder,
}: {
  selectedDefect: string;
  onSelectDefect: (key: string) => void;
  onRaiseWorkOrder: (asset: string, task: string, location: string) => void;
}) {
  const defect = defectPareto.find((d) => d.key === selectedDefect) ?? defectPareto[0];
  const biggest = defectPareto[0].count;
  const vitalShare = defectPareto[paretoVitalFew - 1].cumulative;
  const unitsOnHold = qualityHolds
    .filter((hold) => hold.disposition === "Hold")
    .reduce((sum, hold) => sum + hold.units, 0);

  // The control chart is plotted across the full specification width, so the
  // frame itself reads as the spec limits and only the control limits are drawn.
  const onAxis = (mm: number) => scaleValue(mm, spc.lsl, spc.usl);
  const scaled = scaleSeries([...spc.values], spc.lsl, spc.usl);
  const controlBand = bandBetween(onAxis(spcLcl), onAxis(spcUcl), WIDE);

  return (
    <section className="view">
      <StatStrip
        stats={[
          { label: "First pass yield", value: `${firstPassYield.toFixed(2)}%`, note: "target 99.00%", bad: true },
          { label: "Defect rate", value: `${(100 - firstPassYield).toFixed(2)}%`, note: `${thousands(defectTotal)} of ${thousands(inspectedTotal)}` },
          {
            label: "Ppk",
            value: spcStats.ppk.toFixed(2),
            note: `target ${spc.cpkTarget.toFixed(2)} · Cpk ${spcStats.cpk.toFixed(2)}`,
            bad: spcStats.ppk < spc.cpkTarget,
          },
          { label: "Cost of poor quality", value: baht(copqToday), note: "today" },
          { label: "Units on hold", value: thousands(unitsOnHold), note: "awaiting disposition" },
          {
            label: "SPC signals",
            value: String(spcSignals.length),
            note: "Nelson rules tripped",
            bad: spcSignals.length > 0,
          },
        ]}
      />

      <div className="mod-grid">
        <div className="card">
          <div className="section-title">
            DEFECT PARETO (Today)
            <span className="hint">click a defect type</span>
          </div>
          <div className="panel-note">
            The top <b>{paretoVitalFew}</b> of {defectPareto.length} defect types account for{" "}
            <b>{vitalShare.toFixed(0)}%</b> of all {thousands(defectTotal)} rejects. Fix those four
            and the rest barely matters.
          </div>
          <BarList
            selected={defect.key}
            onSelect={onSelectDefect}
            rows={defectPareto.map((row) => ({
              key: row.key,
              label: row.label,
              sub: `${row.line} · ${row.station}`,
              bar: relative(row.count, biggest),
              value: thousands(row.count),
              extra: `${row.cumulative.toFixed(0)}%`,
              tone: row.cumulative <= vitalShare ? "red" : "cyan",
            }))}
          />
          <SampleNote>Cumulative share in the right-hand column · sample data</SampleNote>
        </div>

        <div className="card detail">
          <div className="section-title">DEFECT DETAIL</div>
          <div className="d-body">
            <h3>{defect.label}</h3>
            <div className="d-stats">
              <div className="mini">
                <label>Units</label>
                <b>{thousands(defect.count)}</b>
              </div>
              <div className="mini">
                <label>Share</label>
                <b>{defect.share.toFixed(1)}%</b>
              </div>
              <div className="mini">
                <label>Cost today</label>
                <b>{baht(defect.count * defect.costPerUnit)}</b>
              </div>
            </div>
            <div className="d-block">
              <label>Where</label>
              <p>
                {defect.line} · {defect.station}
              </p>
            </div>
            <div className="d-block">
              <label>Root cause · AI</label>
              <p>{defect.cause}</p>
            </div>
            <div className="d-block">
              <label>Recommended action</label>
              <p>{defect.action}</p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => onRaiseWorkOrder(defect.station, defect.woTask, defect.line)}
            >
              Create Work Order
            </button>
          </div>
        </div>

        <div className="card span-2">
          <div className="section-title">
            CONTROL CHART · {spc.characteristic}
            <span className="hint">
              {spc.chartType} · one part every {spc.sampleEvery}
            </span>
          </div>
          <div className="panel-note">
            Short-term variation is tight — Cp {spcStats.cp.toFixed(2)}, Cpk{" "}
            {spcStats.cpk.toFixed(2)} from the moving range. Overall performance is not:{" "}
            <b>Ppk {spcStats.ppk.toFixed(2)}</b> against a {spc.cpkTarget.toFixed(2)} target,
            because the mean has walked from {spc.target.toFixed(2)} to{" "}
            {spcStats.mean.toFixed(3)} mm across the shift.{" "}
            <b>The machine can hold the tolerance; it is off centre.</b> Re-centring recovers Ppk
            without touching the machine — and the drift is tool wear, the same story the dimension
            defect above is telling.
          </div>
          {spcSignals.length > 0 ? (
            <div className="signals">
              {spcSignals.map((signal) => (
                <span className="signal" key={signal.rule}>
                  <b>{signal.rule}</b> {signal.detail}
                </span>
              ))}
            </div>
          ) : null}
          <svg
            className="wchart"
            viewBox={`0 0 ${WIDE.width} ${WIDE.height}`}
            role="img"
            aria-label={`Control chart for ${spc.characteristic}. ${spcStats.beyondLimits} points outside control limits.`}
          >
            <rect className="ctrl-band" {...controlBand} rx="2" />
            <path className="limit" d={`${ruleAt(onAxis(spcUcl), WIDE)} ${ruleAt(onAxis(spcLcl), WIDE)}`} />
            <path className="targetline" d={ruleAt(onAxis(spc.target), WIDE)} />
            <path className="wline blue" d={seriesToPath(scaled, WIDE)} />
            {seriesToPoints(scaled, WIDE).map((point, i) => {
              const value = spc.values[i];
              const out = value > spcUcl || value < spcLcl;
              return (
                <circle
                  key={spc.values[i] + "-" + i}
                  className={`spc-pt${out ? " bad" : ""}`}
                  cx={point.x}
                  cy={point.y}
                  r={out ? 4 : 2.4}
                />
              );
            })}
            <ValueAxis
              labels={[
                { at: 100, text: `USL ${spc.usl.toFixed(2)}` },
                { at: onAxis(spcUcl), text: `UCL ${spcUcl.toFixed(2)}` },
                { at: onAxis(spc.target), text: `⌀ ${spc.target.toFixed(2)}` },
                { at: onAxis(spcLcl), text: `LCL ${spcLcl.toFixed(2)}` },
                { at: 0, text: `LSL ${spc.lsl.toFixed(2)}` },
              ]}
            />
            <TimeAxis
              count={spc.values.length}
              ticks={[
                { at: 0, label: "-8h" },
                { at: 11, label: "-4h" },
                { at: 23, label: "now" },
              ]}
            />
          </svg>
          <SampleNote>
            Control limits carried from the {spc.studyDate} capability study (σ ={" "}
            {spc.studySigma.toFixed(3)} mm), not recomputed from these readings · sample data
          </SampleNote>
        </div>

        <div className="card">
          <div className="section-title">QUALITY HOLDS &amp; DISPOSITIONS</div>
          <div className="table-wrap">
            <DataTable head={["Lot", "Line", "Defect", "Units", "Disposition", "Raised"]}>
              {qualityHolds.map((hold) => (
                <tr key={hold.lot}>
                  <td className="mono">{hold.lot}</td>
                  <td>Line {hold.line}</td>
                  <td>{hold.defect}</td>
                  <td>{thousands(hold.units)}</td>
                  <td>
                    <span className={`pill ${hold.disposition.toLowerCase()}`}>{hold.disposition}</span>
                  </td>
                  <td className="dim">{hold.time}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>

        <div className="card">
          <div className="section-title">FIRST PASS YIELD BY LINE</div>
          <div className="qlines">
            {lineQuality.map((line) => {
              const fpy = ((line.inspected - line.defects) / line.inspected) * 100;
              const weak = fpy < 98;
              return (
                <div className="qline" key={line.line}>
                  <div className="q-name">
                    Line {line.line}
                    <small>{thousands(line.inspected)} inspected</small>
                  </div>
                  <div className="q-fpy">
                    <b className={weak ? "w" : "ok"}>{fpy.toFixed(2)}%</b>
                    <small>{thousands(line.defects)} defects</small>
                  </div>
                  <Sparkline series={line.trend} tone={weak ? "red" : "green"} />
                </div>
              );
            })}
          </div>
          <SampleNote>Sparkline is first pass yield across the shift · sample data</SampleNote>
        </div>
      </div>
    </section>
  );
}

/* ---------------- energy ---------------- */

export function EnergyView({
  period,
  onPeriod,
  onRaiseWorkOrder,
}: {
  period: string;
  onPeriod: (key: string) => void;
  onRaiseWorkOrder: (asset: string, task: string, location: string) => void;
}) {
  const profile = loadProfiles.find((p) => p.key === period) ?? loadProfiles[0];
  const series = profile.series;
  const axisMax = Math.ceil((Math.max(...series) * 1.1) / 10) * 10;
  const scaled = scaleSeries(series, 0, axisMax);
  const isToday = profile.key === "today";

  const onPeakCost = onPeakKwh * tariff.peakRate;
  const offPeakCost = offPeakKwh * tariff.offPeakRate;
  const peakCostShare = (onPeakCost / energyCostToday) * 100;
  const peakHours = tariff.peakTo - tariff.peakFrom;
  const whPerUnit = (energyToday * 1000) / inspectedTotal;
  const areaMax = Math.max(...energyByArea.map((area) => area.kwh));

  return (
    <section className="view">
      <StatStrip
        stats={[
          { label: "Load now", value: `${loadToday[currentHour]} kW`, note: `peak today ${peakDemand} kW` },
          { label: "Energy today", value: `${thousands(energyToday)} kWh`, note: "↓ 6.3% vs yesterday" },
          { label: "Cost today", value: baht(energyCostToday), note: tariff.name },
          { label: "Per unit", value: `${whPerUnit.toFixed(1)} Wh`, note: "per unit produced" },
          { label: "Billed demand", value: `${peakDemand} kW`, note: `${baht(demandChargeMonth)} / month` },
          {
            label: "Power factor",
            value: "0.94",
            note: `no charge above ${tariff.pfFloor.toFixed(2)}`,
          },
        ]}
      />

      <div className="mod-grid">
        <div className="card span-2">
          <div className="section-title">
            LOAD PROFILE
            <span className="hint">{profile.caption}</span>
            <div className="seg pushed">
              {loadProfiles.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={option.key === period ? "active" : ""}
                  onClick={() => onPeriod(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <svg
            className="wchart"
            viewBox={`0 0 ${WIDE.width} ${WIDE.height}`}
            role="img"
            aria-label={`Load profile, ${profile.label}. Peak ${Math.max(...series)} ${profile.unit}.`}
          >
            {isToday ? (
              <rect
                className="peak-band"
                {...spanBetween(tariff.peakFrom, tariff.peakTo, series.length, WIDE)}
              />
            ) : null}
            <path className="gridline" d={[75, 50, 25].map((v) => ruleAt(v, WIDE)).join(" ")} />
            <path className="warea" d={seriesToArea(scaled, WIDE)} />
            <path className="wline blue" d={seriesToPath(scaled, WIDE)} />
            {isToday ? (
              <path
                className="nowline"
                d={`M${indexToX(currentHour, series.length, WIDE)} ${WIDE.top}V${WIDE.bottom}`}
              />
            ) : null}
            <ValueAxis
              labels={[
                { at: 100, text: thousands(axisMax) },
                { at: 50, text: thousands(axisMax / 2) },
                { at: 0, text: "0" },
              ]}
            />
            <TimeAxis ticks={profile.ticks} count={series.length} />
          </svg>
          <div className="load-legend">
            <span>
              <i className="swatch peak" />
              On-peak {tariff.window} · {peakHours} ชั่วโมง
            </span>
            <span>
              <i className="swatch line" />
              {profile.unit}
            </span>
            <span className="dim">
              {tariff.peakRate.toFixed(2)} ฿/kWh on-peak · {tariff.offPeakRate.toFixed(2)} ฿/kWh
              off-peak
            </span>
          </div>
          <SampleNote>Representative TOU rates · sample data, not a quotation</SampleNote>
        </div>

        <div className="card">
          <div className="section-title">CONSUMPTION BY AREA (Today)</div>
          <BarList
            rows={energyByArea.map((area) => ({
              key: area.label,
              label: area.label,
              bar: relative(area.kwh, areaMax),
              value: `${thousands(area.kwh)} kWh`,
              extra: area.delta,
              tone: area.bad ? "yellow" : "cyan",
            }))}
          />
          <div className="panel-note">
            Compressed air is the only area up on yesterday while production is down — which is what
            the finding below is about.
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            WHERE THE BILL COMES FROM
            <span className="hint">{tariff.name}</span>
          </div>
          <div className="split">
            <div className="split-row">
              <span>
                On-peak today
                <small>{tariff.window}</small>
              </span>
              <b>{thousands(onPeakKwh)} kWh</b>
              <b className="cost">{baht(onPeakCost)}</b>
            </div>
            <div className="split-row">
              <span>
                Off-peak today
                <small>nights, weekends and holidays</small>
              </span>
              <b>{thousands(offPeakKwh)} kWh</b>
              <b className="cost">{baht(offPeakCost)}</b>
            </div>
            <div className="split-row total">
              <span>Energy charge today</span>
              <b>{thousands(energyToday)} kWh</b>
              <b className="cost">{baht(energyCostToday)}</b>
            </div>
          </div>
          <div className="panel-note">
            <b>{peakCostShare.toFixed(0)}%</b> of today&apos;s energy cost falls inside the{" "}
            {peakHours}-hour on-peak window. Anything you can move outside it is charged{" "}
            {((1 - tariff.offPeakRate / tariff.peakRate) * 100).toFixed(0)}% less.
          </div>

          <div className="section-title sub">
            PROJECTED MONTHLY INVOICE
            <span className="hint">at today&apos;s mix × {monthlyBill.days} days</span>
          </div>
          <div className="split">
            {monthlyBill.lines.map((line) => (
              <div className="split-row" key={line.label}>
                <span>
                  {line.label}
                  {line.note ? <small>{line.note}</small> : null}
                </span>
                <b />
                <b className="cost">{baht(line.value)}</b>
              </div>
            ))}
            <div className="split-row total">
              <span>Total payable</span>
              <b />
              <b className="cost">{baht(monthlyBill.total)}</b>
            </div>
          </div>
          <div className="panel-note">
            Energy is {((monthlyBill.lines[0].value / monthlyBill.total) * 100).toFixed(0)}% of the
            invoice — the rest is demand, Ft and VAT, and only the demand charge responds to how you
            run the plant. Cost per unit produced today: <b>{baht(energyCostPerUnit * 1000)}</b> per
            1,000 units.
          </div>
        </div>

        <div className="card span-2 finding">
          <div className="section-title">
            <span className="find-icon" aria-hidden>
              ϟ
            </span>
            ANOMALY · {standbyFinding.title}
          </div>
          <p className="find-text">{standbyFinding.detail}</p>
          <div className="find-math">
            <div>
              <label>Off-shift draw</label>
              <b>{standbyFinding.kw} kW</b>
            </div>
            <div className="op" aria-hidden>
              ×
            </div>
            <div>
              <label>Hours / day</label>
              <b>{standbyFinding.hours} h</b>
            </div>
            <div className="op" aria-hidden>
              =
            </div>
            <div>
              <label>Wasted</label>
              <b>{standbyKwhPerDay.toFixed(1)} kWh / day</b>
            </div>
            <div className="op" aria-hidden>
              →
            </div>
            <div className="result">
              <label>Cost of doing nothing</label>
              <b>
                {baht(standbyCostPerMonth)} / เดือน · {baht(standbyCostPerMonth * 12)} / ปี
              </b>
            </div>
          </div>
          <button
            type="button"
            className="primary find-cta"
            onClick={() =>
              onRaiseWorkOrder("Compressed air ring main", "Leak survey during off-shift", "Utilities")
            }
          >
            Create Work Order — leak survey
          </button>
          <SampleNote />
        </div>
      </div>
    </section>
  );
}

/* ---------------- maintenance ---------------- */

const riskTone: Record<string, "red" | "yellow" | "green"> = {
  high: "red",
  medium: "yellow",
  low: "green",
};

export function MaintenanceView({
  selectedAsset,
  onSelectAsset,
  onRaiseWorkOrder,
}: {
  selectedAsset: string;
  onSelectAsset: (key: string) => void;
  onRaiseWorkOrder: (asset: string, task: string, location: string) => void;
}) {
  const asset = assetHealth.find((item) => item.key === selectedAsset) ?? assetHealth[0];
  const atRisk = assetHealth.filter((item) => item.risk === "high").length;
  const causeMax = Math.max(...downtimeCauses.map((cause) => cause.minutes));
  const overduePm = pmSchedule.reduce((sum, day) => sum + (day.overdue ?? 0), 0);

  return (
    <section className="view">
      <StatStrip
        stats={maintenanceKpis.map((kpi) => ({
          label: kpi.label,
          value: kpi.value,
          note: kpi.note,
          bad: kpi.bad,
        }))}
      />

      <div className="mod-grid">
        <div className="card">
          <div className="section-title">
            ASSET HEALTH
            <span className="hint">ranked by predicted risk · click an asset</span>
          </div>
          <div className="panel-note">
            {atRisk} of {assetHealth.length} monitored assets are flagged. Remaining useful life is
            a prediction from vibration, temperature and duty-cycle history — not a countdown from
            the service interval.
          </div>
          <div className="asset-rank">
            {assetHealth.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`asset-row${item.key === asset.key ? " sel" : ""}`}
                onClick={() => onSelectAsset(item.key)}
                aria-pressed={item.key === asset.key}
              >
                <span className="a-name">
                  {item.name}
                  <small>{item.location}</small>
                </span>
                <span className="a-health">
                  <span className="hbar">
                    <i className={`t-${riskTone[item.risk]}`} style={{ width: `${item.health}%` }} />
                  </span>
                  <small>{item.health}% health</small>
                </span>
                <span className="a-rul">
                  <b className={item.rul === 0 ? "off" : undefined}>
                    {item.rul === 0 ? "failed" : `${item.rul} d`}
                  </b>
                  <small>RUL</small>
                </span>
                <span className={`risk ${item.risk}`}>{item.risk}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card detail">
          <div className="section-title">ASSET DETAIL</div>
          <div className="d-body">
            <h3>{asset.name}</h3>
            <p className="d-sub">{asset.location}</p>
            <div className="d-stats four">
              <div className="mini">
                <label>Health</label>
                <b>{asset.health}%</b>
              </div>
              <div className="mini">
                <label>RUL</label>
                <b>{asset.rul === 0 ? "0 d" : `${asset.rul} d`}</b>
              </div>
              <div className="mini">
                <label>MTBF</label>
                <b>{asset.mtbf}</b>
              </div>
              <div className="mini">
                <label>Serviced</label>
                <b>{asset.lastService}</b>
              </div>
            </div>
            <div className="d-block">
              <label>Health, last 8 weeks</label>
              <Sparkline series={asset.trend} tone={asset.risk === "low" ? "green" : "red"} />
            </div>
            <div className="d-block">
              <label>What the model sees</label>
              <p>{asset.signal}</p>
            </div>
            <div className="d-block">
              <label>Recommended action</label>
              <p>{asset.action}</p>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => onRaiseWorkOrder(asset.name, asset.woTask, asset.location)}
            >
              Create Work Order
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">UNPLANNED DOWNTIME BY CAUSE (Today)</div>
          <div className="panel-note">
            {downtimeTotal} minutes lost today. The vision fault alone is{" "}
            {((downtimeCauses[0].minutes / downtimeTotal) * 100).toFixed(0)}% of it.
          </div>
          <BarList
            rows={downtimeCauses.map((cause) => ({
              key: cause.label,
              label: cause.label,
              sub: cause.line,
              bar: relative(cause.minutes, causeMax),
              value: `${cause.minutes} min`,
              extra: `${((cause.minutes / downtimeTotal) * 100).toFixed(0)}%`,
              tone: "red",
            }))}
          />
        </div>

        <div className="card">
          <div className="section-title">PM SCHEDULE · NEXT 14 DAYS</div>
          <div className="pm-strip">
            {pmSchedule.map((day) => (
              <div
                key={day.day}
                className={`pm-day${day.jobs === 0 ? " empty" : ""}${day.overdue ? " over" : ""}`}
              >
                <b>{day.jobs || "·"}</b>
                <small>{day.day}</small>
              </div>
            ))}
          </div>
          <div className="panel-note">
            {overduePm} job overdue · 92% PM compliance this month. Scheduled work is{" "}
            {maintenanceKpis[3].value} of all hours; the target is 80%, and every point below it is
            work that turned into a breakdown.
          </div>
        </div>

        <div className="card span-2">
          <div className="section-title">
            SPARE PARTS
            <span className="hint">
              {blockingParts} blocking a booked job · the rest are reorder warnings
            </span>
          </div>
          <div className="panel-note">
            Below the reorder point is not the same as out of stock. Only a part the booked job
            cannot be done without actually stops work — the others are purchasing decisions with a
            lead time attached.
          </div>
          <div className="table-wrap">
            <DataTable
              head={["Part", "Code", "On hand", "Job needs", "Reorder at", "Lead time", "Blocks", "Status"]}
            >
              {sparePartsAtRisk.map((part) => {
                const status = partStatus(part);
                return (
                  <tr key={part.code}>
                    <td>{part.part}</td>
                    <td className="mono">{part.code}</td>
                    <td>{part.onHand}</td>
                    <td>{part.required}</td>
                    <td>{part.reorderAt}</td>
                    <td>{part.leadTimeDays} d</td>
                    <td className="mono">{part.neededBy ?? "—"}</td>
                    <td>
                      <span
                        className={`pill ${status.tone === "blocking" ? "scrapped" : status.tone === "risk" ? "hold" : "released"}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
          </div>
          <SampleNote />
        </div>
      </div>
    </section>
  );
}

/* ---------------- work orders ---------------- */

export function WorkOrdersView({
  filter,
  onFilter,
  raised,
  onRaiseWorkOrder,
}: {
  filter: string;
  onFilter: (key: string) => void;
  raised: readonly WoCard[];
  onRaiseWorkOrder: (asset: string, task: string, location: string) => void;
}) {
  const all = [...raised, ...woBoard];
  const visible = all.filter((card) => {
    if (filter === "critical") return card.priority === "critical";
    if (filter === "overdue") return Boolean(card.overdue);
    if (filter === "preventive") return card.kind === "preventive";
    return true;
  });

  const open = all.filter((card) => card.column !== "done");
  const overdue = all.filter((card) => card.overdue);
  const openHours = open.reduce((sum, card) => sum + card.estHours, 0);
  const backlog = openHours / (crew.technicians * crew.hoursPerDay);

  return (
    <section className="view">
      <StatStrip
        stats={[
          { label: "Open", value: String(open.length), note: "across all lines" },
          {
            label: "In progress",
            value: String(all.filter((card) => card.column === "progress").length),
            note: "3 technicians on shift",
          },
          { label: "Overdue", value: String(overdue.length), note: "past committed date", bad: overdue.length > 0 },
          {
            label: "Backlog",
            value: `${backlog.toFixed(1)} d`,
            note: `${openHours} h open · ${crew.technicians} technicians`,
          },
          { label: "Closed this week", value: String(woStats.completedThisWeek), note: "↑ 4 vs last week" },
          { label: "First-time fix", value: woStats.firstTimeFix, note: `avg. close ${woStats.avgCloseHours}` },
        ]}
      />

      <div className="wo-bar">
        <div className="seg">
          {woFilters.map((option) => (
            <button
              key={option.key}
              type="button"
              className={filter === option.key ? "active" : ""}
              onClick={() => onFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="wo-count">
          showing {visible.length} of {all.length}
        </span>
        <button
          type="button"
          className="primary wo-new"
          onClick={() =>
            onRaiseWorkOrder("Line 2 · Robot Arm", "Raised from the work order board", "Line 2")
          }
        >
          + New Work Order
        </button>
      </div>

      <div className="kanban">
        {woColumns.map((column) => {
          const items = visible.filter((card) => card.column === column.key);
          return (
            <div className="kcol" key={column.key}>
              <div className="kcol-head">
                {column.label}
                <span className="kcount">{items.length}</span>
              </div>
              <div className="kcol-body">
                {items.map((card) => (
                  <article
                    className={`wo-card pr-${card.priority}${card.fresh ? " fresh" : ""}`}
                    key={card.id}
                  >
                    <div className="wo-top">
                      <b className="mono">{card.id}</b>
                      <span className={`prio ${card.priority}`}>{card.priority}</span>
                    </div>
                    <div className="wo-task">{card.task}</div>
                    <div className="wo-asset">
                      {card.asset}
                      {card.failureCode ? <em className="fcode">{card.failureCode}</em> : null}
                    </div>
                    <div className="wo-foot">
                      <span>
                        {card.assignee} · {card.estHours} h
                      </span>
                      <span className={card.overdue ? "w" : undefined}>{card.due}</span>
                    </div>
                  </article>
                ))}
                {items.length === 0 ? <div className="kempty">nothing here</div> : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card wide-card">
        <div className="section-title">
          RECENTLY COMPLETED
          <span className="hint">labour and parts, closed jobs</span>
        </div>
        <div className="table-wrap">
          <DataTable head={["Work order", "Asset", "Task", "Duration", "Cost", "Technician"]}>
            {completedWork.map((job) => (
              <tr key={job.id}>
                <td className="mono">{job.id}</td>
                <td>{job.asset}</td>
                <td>{job.task}</td>
                <td>{job.duration}</td>
                <td>{baht(job.cost)}</td>
                <td className="dim">{job.tech}</td>
              </tr>
            ))}
          </DataTable>
        </div>
        <SampleNote />
      </div>
    </section>
  );
}

/* ---------------- placeholder modules ---------------- */

/** "A, B and C" — keeps the placeholder's sentence true as modules get built. */
function listModules(names: readonly string[]): string {
  if (names.length === 0) return "none yet";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function GenericView({ title }: { title: string }) {
  return (
    <section className="view">
      <div className="card generic">
        <h2>{title}</h2>
        <p>
          This module is included in the mockup navigation to show the modular product architecture. The
          fully built interactive flows in this demo are {listModules(builtModules)}.
        </p>
        <div className="generic-kpis">
          {[
            { icon: "◎", label: "Live Status", value: "Normal", trend: "Connected" },
            { icon: "⌁", label: "Active Assets", value: "212", trend: "↑ 3 today" },
            { icon: "!", label: "Open Issues", value: "5", trend: "2 critical", bad: true },
            { icon: "✓", label: "Actions", value: "18", trend: "12 completed" },
          ].map((item) => (
            <div className="card kpi" key={item.label}>
              <div className="iconbox" aria-hidden>{item.icon}</div>
              <div>
                <label>{item.label}</label>
                <strong>{item.value}</strong>
                <div className={`trend${item.bad ? " bad" : ""}`}>{item.trend}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
