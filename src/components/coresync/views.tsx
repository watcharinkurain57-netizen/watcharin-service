"use client";

import {
  type Alert,
  type Chart,
  type LineStatus,
  type ProductionLine,
  type SensorState,
  aiAnswer,
  aiSuggestions,
  equipmentHealth,
  equipmentTotal,
  kpis,
  line2Metrics,
  lineAlerts,
  lineCharts,
  lineSensorStates,
  liveInsights,
  machines,
  maintenanceHistory,
  maintenanceUpcoming,
  plantAlerts,
  plantCharts,
  productionLines,
  productionSummary,
  robotArmSensors,
  sensorGlyph,
  seriesToPath,
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
      <svg className="svgchart" viewBox="0 0 220 105" role="img" aria-label={`${chart.title}: ${chart.value}`}>
        <path className="gridline" d="M8 20H212M8 52H212M8 84H212" />
        <path className="targetline" d="M8 52H212" />
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

/* ---------------- placeholder modules ---------------- */

export function GenericView({ title }: { title: string }) {
  return (
    <section className="view">
      <div className="card generic">
        <h2>{title}</h2>
        <p>
          This module is included in the mockup navigation to show the modular product architecture. The
          fully built interactive flows in this demo are Overview, Digital Twin and AI Insights.
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
