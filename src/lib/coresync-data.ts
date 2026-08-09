/**
 * Mockup data for the CoreSync Systems Factory OS demo at /coresync.
 *
 * Everything the dashboard shows lives here, typed, so the numbers can be
 * retuned for a pitch without going near the markup. All of it is invented —
 * the UI labels itself as sample data, and nothing here is or should look like
 * a real customer's plant.
 */

export type SensorState = "ok" | "warn" | "crit" | "maint";
export type LineStatus = "running" | "warning" | "maintenance";

export const BRAND = {
  name: "CoreSync",
  suffix: "Systems",
  product: "Factory OS",
  version: "v2.4.1",
} as const;

export type NavItem = {
  key: string;
  icon: string;
  label: string;
  badge?: number;
  /** Built out for real. The rest are named to show the product's scope. */
  built?: boolean;
};

export const navItems: readonly NavItem[] = [
  { key: "overview", icon: "⌂", label: "Overview", built: true },
  { key: "digital", icon: "◇", label: "Digital Twin", built: true },
  { key: "ai", icon: "✦", label: "AI Insights", built: true },
  { key: "lines", icon: "▤", label: "Lines" },
  { key: "equipment", icon: "▧", label: "Equipment" },
  { key: "alerts", icon: "△", label: "Alerts", badge: 5 },
  { key: "maintenance", icon: "⚒", label: "Maintenance", built: true },
  { key: "quality", icon: "⬡", label: "Quality", built: true },
  { key: "energy", icon: "ϟ", label: "Energy", built: true },
  { key: "reports", icon: "▣", label: "Reports" },
  { key: "workorders", icon: "▦", label: "Work Orders", built: true },
  { key: "inventory", icon: "⬢", label: "Inventory" },
  { key: "settings", icon: "⚙", label: "Settings" },
];

/** Read by the placeholder module so its wording cannot go stale. */
export const builtModules = navItems.filter((item) => item.built).map((item) => item.label);

export const viewTitles: Record<string, string> = {
  overview: "Factory Command Center",
  digital: "Digital Twin — Production Lines",
  ai: "AI Factory Assistant",
  quality: "Quality & Defect Analytics",
  energy: "Energy & Utilities",
  maintenance: "Maintenance & Asset Health",
  workorders: "Work Orders",
};

export type Kpi = {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  trend: string;
  /** A downward trend is good for downtime and energy, bad for output. */
  trendBad?: boolean;
};

export type ProductionLine = {
  id: number;
  status: LineStatus;
  statusLabel: string;
  oee: number;
  throughput: string;
  /** Second metric shown under throughput — defect rate, or the maintenance window. */
  secondaryLabel: string;
  secondaryValue: string;
};

export const productionLines: readonly ProductionLine[] = [
  {
    id: 1,
    status: "running",
    statusLabel: "● Running",
    oee: 84,
    throughput: "4,320/hr",
    secondaryLabel: "Defect Rate",
    secondaryValue: "0.42%",
  },
  {
    id: 2,
    status: "warning",
    statusLabel: "● Warning",
    oee: 72,
    throughput: "3,250/hr",
    secondaryLabel: "Defect Rate",
    secondaryValue: "1.25%",
  },
  {
    id: 3,
    status: "maintenance",
    statusLabel: "◆ Maintenance",
    oee: 0,
    throughput: "0/hr",
    secondaryLabel: "Scheduled",
    secondaryValue: "Until 14:00",
  },
];

/**
 * Plant headline figures.
 *
 * Output and OEE are derived from `productionLines` rather than typed, because
 * the first thing anyone with a manufacturing background does with a dashboard
 * is add the lines up and check they make the plant total. Per ISO 22400,
 * planned downtime is excluded from OEE, so Line 3's maintenance window drops
 * out of the plant figure rather than dragging it toward zero.
 */
const lineRate = (line: ProductionLine) => Number(line.throughput.replace(/[^0-9.]/g, ""));
const oeeLines = productionLines.filter((line) => line.status !== "maintenance");

export const plantOutputPerHour = productionLines.reduce((sum, l) => sum + lineRate(l), 0);
export const plantOee =
  oeeLines.reduce((sum, l) => sum + l.oee * lineRate(l), 0) /
  oeeLines.reduce((sum, l) => sum + lineRate(l), 0);

export const kpis: readonly Kpi[] = [
  {
    icon: "◎",
    label: "OEE",
    value: `${plantOee.toFixed(1)}%`,
    trend: "↑ 4.2% · Lines 1–2, Line 3 planned",
  },
  {
    icon: "▥",
    label: "Output / hr",
    value: plantOutputPerHour.toLocaleString("en-US"),
    trend: "↑ 8.7% vs yesterday",
  },
  { icon: "◷", label: "Downtime", value: "45", unit: "min", trend: "↓ 12.1% vs yesterday" },
  { icon: "ϟ", label: "Energy Use", value: "1,250", unit: "kWh", trend: "↓ 6.3% vs yesterday" },
  { icon: "⬡", label: "Quality Rate", value: "98.2%", trend: "↑ 1.6% vs yesterday" },
  { icon: "◔", label: "Utilization", value: "88.1%", trend: "↑ 3.3% vs yesterday" },
];

export type Machine = {
  key: string;
  /** Rendered on two lines in the diagram. */
  name: readonly [string, string?];
  icon: string;
  variant?: "conveyor" | "robot" | "agv" | "inspect" | "reject";
};

export const machines: readonly Machine[] = [
  { key: "feeder", name: ["Raw Material", "Feeder"], icon: "▰" },
  { key: "conveyor", name: ["Conveyor"], icon: "▭", variant: "conveyor" },
  { key: "robot", name: ["Robot Arm"], icon: "⌁", variant: "robot" },
  { key: "process", name: ["Processing", "Station"], icon: "▣" },
  { key: "inspect", name: ["Inspection", "(Camera)"], icon: "◉", variant: "inspect" },
  { key: "reject", name: ["Reject Bin"], icon: "▥", variant: "reject" },
  { key: "pack", name: ["Packaging", "Machine"], icon: "▦" },
  { key: "pallet", name: ["Palletizer"], icon: "⌁", variant: "robot" },
  { key: "agv", name: ["AGV"], icon: "▱", variant: "agv" },
];

/** Sensor state per machine, in the same order as `machines`. */
export const lineSensorStates: Record<number, readonly SensorState[]> = {
  1: ["ok", "ok", "ok", "ok", "crit", "ok", "ok", "ok", "ok"],
  2: ["ok", "ok", "warn", "ok", "ok", "warn", "ok", "ok", "ok"],
  3: ["maint", "maint", "maint", "maint", "maint", "maint", "maint", "maint", "maint"],
};

export const sensorGlyph: Record<SensorState, string> = {
  ok: "○",
  warn: "!",
  crit: "×",
  maint: "◆",
};

export const sensorStatusLabel: Record<SensorState, string> = {
  ok: "Running",
  warn: "Warning",
  crit: "Critical",
  maint: "Maintenance",
};

export type Alert = {
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  time: string;
};

export const plantAlerts: readonly Alert[] = [
  { severity: "critical", title: "Line 1 • Inspection Camera", detail: "Vision system offline", time: "2m ago" },
  { severity: "warn", title: "Line 2 • Robot Arm", detail: "Overtemperature detected", time: "5m ago" },
  { severity: "warn", title: "Line 2 • Reject Bin", detail: "High reject rate detected", time: "8m ago" },
  { severity: "warn", title: "Energy • Plant", detail: "Energy use above target", time: "15m ago" },
  { severity: "info", title: "Line 3 • Maintenance", detail: "Scheduled maintenance in progress", time: "20m ago" },
];

export const lineAlerts: readonly Alert[] = [
  { severity: "warn", title: "Robot Arm vibration high", detail: "Check Joint 2 bearing", time: "2m" },
  { severity: "critical", title: "Vision system offline", detail: "Inspection Camera 02", time: "6m" },
  { severity: "warn", title: "Defect rate above target", detail: "Line 2 +0.35%", time: "15m" },
];

export type HealthSlice = { label: string; count: number; pct: number; tone: "ok" | "warn" | "crit" | "maint" };

export const equipmentHealth: readonly HealthSlice[] = [
  { label: "Healthy", count: 162, pct: 76, tone: "ok" },
  { label: "Warning", count: 32, pct: 15, tone: "warn" },
  { label: "Critical", count: 8, pct: 4, tone: "crit" },
  { label: "Maintenance", count: 10, pct: 5, tone: "maint" },
];

export const equipmentTotal = equipmentHealth.reduce((sum, s) => sum + s.count, 0);

export type Chart = {
  title: string;
  value: string;
  tone: "green" | "red" | "blue";
  /** 0..100, where 100 is the top of the chart. Path is generated from these. */
  series: readonly number[];
};

export const plantCharts: readonly Chart[] = [
  {
    title: "OUTPUT TREND (Today)",
    value: `${plantOutputPerHour.toLocaleString("en-US")}/hr`,
    tone: "green",
    series: [8, 22, 26, 40, 34, 52, 58, 51, 64, 71, 88, 60, 66, 54, 61, 56],
  },
  {
    title: "DOWNTIME TREND (Today)",
    value: "45 min",
    tone: "red",
    series: [8, 16, 30, 25, 41, 38, 49, 54, 61, 77, 83, 70, 90, 78, 80, 73],
  },
  {
    title: "ENERGY TREND (Today)",
    value: "1,250 kWh",
    tone: "blue",
    series: [8, 17, 21, 37, 30, 46, 56, 49, 65, 69, 80, 91, 72, 77, 64, 70],
  },
];

export const lineCharts: readonly Chart[] = [
  {
    title: "OUTPUT TREND (Line 2)",
    value: "3,250/hr",
    tone: "green",
    series: [8, 22, 28, 42, 34, 50, 58, 51, 63, 55, 76, 61, 66, 57, 62, 59],
  },
  {
    title: "DEFECT RATE TREND",
    value: "1.25%",
    tone: "red",
    series: [18, 21, 33, 28, 46, 41, 49, 57, 67, 76, 63, 69, 59, 63, 57, 60],
  },
  {
    title: "ENERGY TREND",
    value: "320 kWh",
    tone: "blue",
    series: [15, 20, 27, 36, 30, 46, 49, 55, 60, 65, 69, 76, 70, 77, 69, 71],
  },
];

export type MiniMetric = { label: string; value: string; delta: string; bad?: boolean };

export const line2Metrics: readonly MiniMetric[] = [
  { label: "OEE", value: "72.3%", delta: "↓ 6.1%", bad: true },
  { label: "Throughput", value: "3,250/hr", delta: "↓ 4.2%", bad: true },
  { label: "Defect Rate", value: "1.25%", delta: "↑ 0.35%", bad: true },
  { label: "Downtime", value: "18 min", delta: "↑ 6 min", bad: true },
  { label: "Energy Use", value: "320 kWh", delta: "↓ 3.4%" },
  { label: "Cycle Time", value: "38.6 sec", delta: "↑ 2.1 sec", bad: true },
];

export type SensorReading = { label: string; value: string; tone?: "ok" | "warn" | "crit" };

export const robotArmSensors: readonly SensorReading[] = [
  { label: "Temperature", value: "68.4 °C" },
  { label: "Vibration", value: "2.1 mm/s", tone: "warn" },
  { label: "Pressure", value: "5.2 bar" },
  { label: "Speed", value: "72 rpm" },
  { label: "Current", value: "6.3 A" },
  { label: "Camera Status", value: "OK", tone: "ok" },
];

export type WorkOrder = { id: string; asset: string; task: string; state: string; done: boolean };

export const maintenanceHistory: readonly WorkOrder[] = [
  { id: "WO-24871", asset: "Robot Arm", task: "Inspect Bearing", state: "Completed", done: true },
  { id: "WO-24802", asset: "Inspection Camera", task: "Calibration", state: "Completed", done: true },
  { id: "WO-24711", asset: "Conveyor Belt", task: "Belt Tension", state: "Completed", done: true },
];

export const maintenanceUpcoming: readonly WorkOrder[] = [
  { id: "WO-24921", asset: "Robot Arm", task: "Bearing Replacement", state: "In 3 days", done: false },
  { id: "WO-24935", asset: "Packaging Machine", task: "PM", state: "In 6 days", done: false },
  { id: "WO-24948", asset: "AGV-02", task: "Battery Service", state: "In 9 days", done: false },
];

/**
 * The plant profile row matters more than it looks. Without it a reader has no
 * way to judge whether 1,250 kWh or 7,570 units an hour is a sensible number,
 * and every figure in the demo reads as arbitrary.
 */
export const productionSummary: readonly { label: string; value: string }[] = [
  { label: "Plant profile", value: "Light assembly · 3 lines · 2 shifts" },
  { label: "Total Output", value: "126,540 units" },
  { label: "Good Output", value: "124,228 units" },
  { label: "Rejects", value: "2,312 units" },
  { label: "Avg. Cycle Time", value: "8.6 sec" },
  { label: "Best Performing Line", value: "Line 1 (84% OEE)" },
];

export type Insight = { title: string; tone?: "ok" | "warn"; body: string };

export const liveInsights: readonly Insight[] = [
  {
    title: "Line 2 anomaly detected",
    tone: "warn",
    body: "Robot Arm vibration is 28% above its 14-day baseline. Probability of bearing wear: 76%.",
  },
  {
    title: "Energy efficiency improved",
    tone: "ok",
    body: "Chilled-water demand is 6.3% below yesterday while maintaining production output.",
  },
  {
    title: "Quality correlation found",
    body: "Reject rate increases when Robot Arm temperature exceeds 66°C for more than 18 minutes.",
  },
  {
    title: "Maintenance risk",
    tone: "warn",
    body: "AGV-02 battery health is at 21%. Recommended service within 9 days.",
  },
];

export const aiSuggestions: readonly string[] = [
  "Why is Line 2 output below target?",
  "Which machine needs attention first?",
  "Summarize this shift in 5 bullets.",
];

export const aiAnswer = {
  heading: "AI Analysis",
  body:
    "Line 2 is currently 4.2% below its hourly output target. The strongest contributing signal is the Robot Arm on Joint 2: vibration is 28% above baseline and temperature has remained above 66°C for 24 minutes. This correlates with a 0.35% increase in reject rate.",
  actionLabel: "Recommended action:",
  action:
    "reduce robot speed by 10% until the next maintenance window, inspect the Joint 2 bearing, and verify the inspection camera calibration.",
} as const;

/* ================= QUALITY =================
 *
 * The figures here are tied to the plant totals above rather than invented a
 * second time: the defect counts add up to the 2,312 rejects in
 * `productionSummary`, and per-line inspected counts add up to its 126,540
 * total output. A visitor who clicks between modules should not be able to
 * catch the demo contradicting itself.
 */

export type DefectType = {
  key: string;
  label: string;
  count: number;
  /** Baht lost per affected unit — scrap value plus the rework labour. */
  costPerUnit: number;
  line: string;
  station: string;
  cause: string;
  action: string;
  /** Short imperative title used when this becomes a work order. */
  woTask: string;
};

/** Sorted descending: the Pareto and its cumulative curve depend on it. */
export const defectTypes: readonly DefectType[] = [
  {
    key: "scratch",
    label: "Surface scratch",
    count: 864,
    costPerUnit: 18,
    line: "Line 2",
    station: "Conveyor → Packaging",
    cause:
      "Transfer guide at the packaging infeed has worn 0.8 mm out of alignment, so parts drag on the rail.",
    action: "Re-shim the infeed guide and add it to the weekly PM checklist.",
    woTask: "Re-shim packaging infeed guide",
  },
  {
    key: "dimension",
    label: "Dimension out of tolerance",
    count: 561,
    costPerUnit: 42,
    line: "Line 2",
    station: "Processing Station",
    cause:
      "Tool wear on Station 3. The control chart has drifted toward the upper limit for 4 hours and crossed it twice.",
    action: "Index the tool now rather than at the shift change; verify with 5 pieces.",
    woTask: "Index Station 3 tool and verify",
  },
  {
    key: "porosity",
    label: "Weld porosity",
    count: 363,
    costPerUnit: 65,
    line: "Line 1",
    station: "Processing Station",
    cause: "Shielding-gas flow drops below 12 l/min whenever the compressor unloads.",
    action: "Fit a buffer regulator on the gas line; check compressor duty cycle.",
    woTask: "Fit buffer regulator on shielding gas line",
  },
  {
    key: "contamination",
    label: "Contamination",
    count: 201,
    costPerUnit: 30,
    line: "Line 3",
    station: "Raw Material Feeder",
    cause: "Feeder hopper filter is past its service interval by 11 days.",
    action: "Replace the hopper filter during the maintenance window already in progress.",
    woTask: "Replace feeder hopper filter",
  },
  {
    key: "label",
    label: "Label misprint",
    count: 134,
    costPerUnit: 6,
    line: "Line 1",
    station: "Packaging Machine",
    cause: "Print head temperature swings when the sealing jaws cycle.",
    action: "Separate the print head supply from the jaw heater circuit.",
    woTask: "Separate print head supply from jaw heater",
  },
  {
    key: "gap",
    label: "Assembly gap",
    count: 86,
    costPerUnit: 35,
    line: "Line 2",
    station: "Robot Arm",
    cause: "Placement repeatability degrades as Joint 2 vibration rises.",
    action: "Covered by the Joint 2 bearing replacement already scheduled.",
    woTask: "Verify placement accuracy after bearing job",
  },
  {
    key: "colour",
    label: "Colour mismatch",
    count: 61,
    costPerUnit: 12,
    line: "Line 3",
    station: "Inspection",
    cause: "Two pigment lots in circulation; the older lot reads 2.4 ΔE darker.",
    action: "Quarantine the older lot and re-run the colour standard.",
    woTask: "Quarantine pigment lot and re-run colour standard",
  },
  {
    key: "burr",
    label: "Burr / sharp edge",
    count: 42,
    costPerUnit: 9,
    line: "Line 1",
    station: "Processing Station",
    cause: "Deburring brush is at the end of its bristle life.",
    action: "Swap the brush head at the next changeover.",
    woTask: "Replace deburring brush head",
  },
];

export const defectTotal = defectTypes.reduce((sum, d) => sum + d.count, 0);

/** Cost of poor quality for the day, derived so it can never drift from the counts. */
export const copqToday = defectTypes.reduce((sum, d) => sum + d.count * d.costPerUnit, 0);

/** Each defect type with its share and running cumulative share. */
export const defectPareto = defectTypes.map((defect, i) => {
  const cumulativeCount = defectTypes
    .slice(0, i + 1)
    .reduce((sum, d) => sum + d.count, 0);
  return {
    ...defect,
    share: (defect.count / defectTotal) * 100,
    cumulative: (cumulativeCount / defectTotal) * 100,
  };
});

/** How many defect types account for 80% of all rejects — the Pareto headline. */
export const paretoVitalFew =
  defectPareto.findIndex((d) => d.cumulative >= 80) + 1 || defectPareto.length;

export type LineQuality = {
  line: number;
  inspected: number;
  defects: number;
  /** First pass yield trend for the shift, 0..100 on the chart axis. */
  trend: readonly number[];
};

export const lineQuality: readonly LineQuality[] = [
  { line: 1, inspected: 52400, defects: 640, trend: [72, 78, 74, 81, 79, 84, 82, 86] },
  { line: 2, inspected: 41180, defects: 1412, trend: [68, 64, 59, 55, 48, 42, 38, 31] },
  { line: 3, inspected: 32960, defects: 260, trend: [84, 86, 83, 88, 90, 87, 91, 89] },
];

export const inspectedTotal = lineQuality.reduce((sum, l) => sum + l.inspected, 0);
export const firstPassYield = ((inspectedTotal - defectTotal) / inspectedTotal) * 100;

/**
 * Statistical process control for the shaft diameter on Line 2, Station 3.
 *
 * This is an individuals chart (I-MR): one part measured every 20 minutes, so
 * the control limits are the process centre ±3σ. That distinction matters — on
 * an X-bar chart of subgroup means the limits would be ±3σ/√n and these same
 * readings would sit well outside them.
 *
 * The limits come from the last capability study, not from today's readings.
 * Recomputing limits from the data you are judging defeats the point of a
 * control chart: a drifting process would simply widen its own limits and never
 * signal. Capability indices below *are* computed from today's readings.
 */
export const spc = {
  characteristic: "Shaft Ø · Line 2 · Station 3",
  chartType: "Individuals & moving range (I-MR)",
  unit: "mm",
  target: 12.0,
  lsl: 11.9,
  usl: 12.1,
  /** Short-term sigma measured during the last capability study. */
  studySigma: 0.02,
  studyDate: "14 Jul",
  cpkTarget: 1.33,
  sampleEvery: "20 min",
  values: [
    11.985, 12.002, 11.996, 12.01, 11.992, 12.005, 11.998, 12.014, 12.001, 11.994,
    12.008, 12.019, 12.003, 12.022, 12.011, 12.031, 12.017, 12.042, 12.028, 12.063,
    12.038, 12.071, 12.049, 12.034,
  ],
} as const;

export const spcUcl = spc.target + 3 * spc.studySigma;
export const spcLcl = spc.target - 3 * spc.studySigma;

/**
 * Capability from the plotted readings, per the AIAG SPC manual.
 *
 * Cp/Cpk use within-process sigma estimated from the mean moving range
 * (MR̄/d₂, d₂ = 1.128 for n = 2). Pp/Ppk use the overall sample standard
 * deviation. Quoting only one pair hides the story: when a process drifts, the
 * short-term pair stays healthy while the overall pair falls, and that gap is
 * the difference between a machine that cannot hold tolerance and one that is
 * merely off centre.
 */
function capability(values: readonly number[]) {
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const overallSigma = Math.sqrt(
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1),
  );
  const ranges = values.slice(1).map((v, i) => Math.abs(v - values[i]));
  const withinSigma = ranges.reduce((sum, r) => sum + r, 0) / ranges.length / 1.128;

  const spread = spc.usl - spc.lsl;
  const toNearestLimit = Math.min(spc.usl - mean, mean - spc.lsl);

  // Longest run on one side of the centre line — Nelson rule 2 fires at nine.
  let longestRun = 0;
  let run = 0;
  let side = 0;
  for (const v of values) {
    const s = Math.sign(v - spc.target);
    run = s !== 0 && s === side ? run + 1 : 1;
    side = s;
    longestRun = Math.max(longestRun, run);
  }

  return {
    mean,
    withinSigma,
    overallSigma,
    cp: spread / (6 * withinSigma),
    cpk: toNearestLimit / (3 * withinSigma),
    pp: spread / (6 * overallSigma),
    ppk: toNearestLimit / (3 * overallSigma),
    beyondLimits: values.filter((v) => v > spcUcl || v < spcLcl).length,
    longestRun,
  };
}

export const spcStats = capability(spc.values);

/** Western Electric / Nelson rules the current readings actually trip. */
export const spcSignals: readonly { rule: string; detail: string }[] = [
  ...(spcStats.beyondLimits > 0
    ? [
        {
          rule: "Rule 1",
          detail: `${spcStats.beyondLimits} points beyond the ±3σ control limits`,
        },
      ]
    : []),
  ...(spcStats.longestRun >= 9
    ? [
        {
          rule: "Rule 2",
          detail: `${spcStats.longestRun} consecutive points on one side of the centre line`,
        },
      ]
    : []),
];

export type QualityHold = {
  lot: string;
  line: number;
  defect: string;
  units: number;
  disposition: "Hold" | "Rework" | "Scrapped" | "Released";
  time: string;
};

export const qualityHolds: readonly QualityHold[] = [
  { lot: "LOT-8841", line: 2, defect: "Dimension out of tolerance", units: 320, disposition: "Hold", time: "12m ago" },
  { lot: "LOT-8836", line: 2, defect: "Surface scratch", units: 145, disposition: "Rework", time: "48m ago" },
  { lot: "LOT-8829", line: 1, defect: "Weld porosity", units: 62, disposition: "Scrapped", time: "1h 20m ago" },
  { lot: "LOT-8824", line: 3, defect: "Contamination", units: 88, disposition: "Released", time: "2h 05m ago" },
  { lot: "LOT-8817", line: 1, defect: "Label misprint", units: 210, disposition: "Rework", time: "3h 12m ago" },
];

/* ================= ENERGY =================
 *
 * Thailand runs industrial customers on a time-of-use tariff, so the module is
 * built around that: the on-peak window is where the money is, and the load
 * curve is only interesting once you can see which side of that line it sits
 * on. Rates are representative TOU figures, not a quotation.
 */

export const tariff = {
  name: "TOU · 22–33 kV",
  peakRate: 4.18,
  offPeakRate: 2.6,
  /** Baht per kW of peak-period maximum demand, charged monthly. */
  demandRate: 132.93,
  /** Fuel adjustment charge, baht per kWh. Revised quarterly. */
  ft: 0.3972,
  /** Fixed monthly service charge for this voltage class. */
  serviceCharge: 312.24,
  vat: 0.07,
  /**
   * Power factor is only charged when reactive demand exceeds 61.97% of kW,
   * which is a lagging power factor below about 0.85.
   */
  pfFloor: 0.85,
  pfPenaltyRate: 56.07,
  /** On-peak window, as hours of the day. */
  peakFrom: 9,
  peakTo: 22,
  window: "จ.–ศ. 09:00–22:00",
} as const;

/** Hourly average load in kW, midnight to 23:00. */
export const loadToday: readonly number[] = [
  22, 21, 20, 21, 22, 25, 34, 49, 58, 70, 75, 78, 62, 74, 77, 80, 76, 72, 67, 64, 62,
  60, 37, 24,
];

/** The hour the console is pretending it is right now. */
export const currentHour = 16;

export const energyToday = loadToday.reduce((sum, kw) => sum + kw, 0);
export const peakDemand = Math.max(...loadToday);
export const onPeakKwh = loadToday
  .slice(tariff.peakFrom, tariff.peakTo)
  .reduce((sum, kw) => sum + kw, 0);
export const offPeakKwh = energyToday - onPeakKwh;
export const energyCostToday = onPeakKwh * tariff.peakRate + offPeakKwh * tariff.offPeakRate;
export const demandChargeMonth = peakDemand * tariff.demandRate;

/**
 * Projected monthly bill, in the order it appears on a real MEA/PEA invoice.
 *
 * The energy and demand charges are only two of five lines. Ft moves quarterly
 * and lands on every kWh, the service charge is fixed by voltage class, and VAT
 * applies to the whole lot. A factory owner reads this bill every month, so an
 * energy module that stops at the energy charge is one they will not believe.
 */
const BILLING_DAYS = 30;

export const monthlyBill = (() => {
  const kwh = energyToday * BILLING_DAYS;
  const energy = energyCostToday * BILLING_DAYS;
  const ft = kwh * tariff.ft;
  const beforeVat = energy + demandChargeMonth + ft + tariff.serviceCharge;
  const vat = beforeVat * tariff.vat;
  return {
    days: BILLING_DAYS,
    kwh,
    lines: [
      { label: "Energy charge", note: `${thousands(kwh)} kWh at TOU rates`, value: energy },
      { label: "Demand charge", note: `${peakDemand} kW peak-period max`, value: demandChargeMonth },
      { label: "Ft", note: `${tariff.ft.toFixed(4)} ฿/kWh, revised quarterly`, value: ft },
      { label: "Service charge", note: "fixed, by voltage class", value: tariff.serviceCharge },
      { label: `VAT ${(tariff.vat * 100).toFixed(0)}%`, note: "", value: vat },
    ],
    beforeVat,
    vat,
    total: beforeVat + vat,
  };
})();

/** Baht per unit produced — the number that survives a change in output. */
export const energyCostPerUnit = energyCostToday / inspectedTotal;

export type LoadProfile = {
  key: string;
  label: string;
  unit: string;
  series: readonly number[];
  ticks: readonly { at: number; label: string }[];
  caption: string;
};

export const loadProfiles: readonly LoadProfile[] = [
  {
    key: "today",
    label: "Today",
    unit: "kW",
    series: loadToday,
    ticks: [
      { at: 0, label: "00" },
      { at: 6, label: "06" },
      { at: 12, label: "12" },
      { at: 18, label: "18" },
      { at: 23, label: "23" },
    ],
    caption: "Hourly average load · shaded band is the on-peak tariff window",
  },
  {
    key: "week",
    label: "7 days",
    unit: "kWh",
    series: [1188, 1242, 1265, 1301, 1276, 812, 1250],
    ticks: [
      { at: 0, label: "-6d" },
      { at: 3, label: "-3d" },
      { at: 6, label: "today" },
    ],
    caption: "Daily consumption · the dip is a single-shift day",
  },
  {
    key: "month",
    label: "30 days",
    unit: "kWh",
    series: [
      1205, 1244, 1188, 1301, 1262, 798, 742, 1230, 1288, 1315, 1272, 1246, 826, 760,
      1258, 1294, 1332, 1281, 1250, 844, 788, 1268, 1302, 1276, 1338, 1290, 852, 796,
      1284, 1250,
    ],
    ticks: [
      { at: 0, label: "-29d" },
      { at: 14, label: "-15d" },
      { at: 29, label: "today" },
    ],
    caption: "Daily consumption · weekly rhythm of a five-day plant",
  },
];

export type EnergyArea = { label: string; kwh: number; delta: string; bad?: boolean };

/** Sums to the day's total; Line 2 matches the 320 kWh on its digital twin. */
export const energyByArea: readonly EnergyArea[] = [
  { label: "Line 1", kwh: 385, delta: "↓ 2.1%" },
  { label: "Line 2", kwh: 320, delta: "↓ 3.4%" },
  { label: "Line 3", kwh: 148, delta: "↓ 41.0%" },
  { label: "Compressed air", kwh: 176, delta: "↑ 8.2%", bad: true },
  { label: "HVAC / chillers", kwh: 132, delta: "↓ 6.3%" },
  { label: "Lighting", kwh: 54, delta: "↓ 0.4%" },
  { label: "Utilities & office", kwh: 35, delta: "↑ 1.1%", bad: true },
];

/**
 * The finding the module exists to produce: something is drawing power when
 * nothing is being made, and here is what it costs per month.
 */
export const standbyFinding = {
  title: "Compressed air leak · off-shift draw",
  detail:
    "The plant draws 4.1 kW between 22:00 and 06:00 with no production scheduled. The signature matches a leak downstream of the dryer, not a base load.",
  kw: 4.1,
  hours: 8,
} as const;

export const standbyKwhPerDay = standbyFinding.kw * standbyFinding.hours;
export const standbyCostPerMonth = standbyKwhPerDay * tariff.offPeakRate * 30;

/* ================= MAINTENANCE ================= */

export type AssetHealth = {
  key: string;
  name: string;
  location: string;
  /** 0..100. Below 65 the model treats the asset as at risk. */
  health: number;
  /** Predicted remaining useful life in days; 0 means it has already failed. */
  rul: number;
  risk: "high" | "medium" | "low";
  signal: string;
  action: string;
  /** Short imperative title used when this becomes a work order. */
  woTask: string;
  lastService: string;
  mtbf: string;
  /** Health history over the last 8 weeks, 0..100. */
  trend: readonly number[];
};

export const assetHealth: readonly AssetHealth[] = [
  {
    key: "camera",
    name: "Inspection Camera 02",
    location: "Line 1 · Inspection",
    health: 41,
    rul: 0,
    risk: "high",
    signal: "Vision system stopped responding at 09:42. Line 1 has run unverified since.",
    action: "Dispatch a technician now — every unit built since 09:42 needs re-inspection.",
    woTask: "Restore vision system and re-inspect output",
    lastService: "02 May",
    mtbf: "94 h",
    trend: [88, 86, 84, 80, 76, 68, 55, 41],
  },
  {
    key: "agv",
    name: "AGV-02",
    location: "Plant · Logistics",
    health: 54,
    rul: 9,
    risk: "high",
    signal: "Battery pack is holding 21% of rated capacity and charge cycles are shortening.",
    action: "WO-24948 is booked for battery service in 9 days. Do not extend it.",
    woTask: "AGV-02 battery pack service",
    lastService: "28 Mar",
    mtbf: "310 h",
    trend: [82, 79, 75, 72, 68, 63, 58, 54],
  },
  {
    key: "robot",
    name: "Robot Arm",
    location: "Line 2 · Pick & place",
    health: 62,
    rul: 12,
    risk: "high",
    signal:
      "Joint 2 vibration is 28% above its 14-day baseline and temperature has held above 66 °C for 24 min.",
    action: "WO-24921 replaces the Joint 2 bearing in 3 days — 9 days before predicted failure.",
    woTask: "Joint 2 bearing inspection",
    lastService: "17 May",
    mtbf: "182 h",
    trend: [91, 89, 86, 82, 78, 72, 67, 62],
  },
  {
    key: "pack",
    name: "Packaging Machine",
    location: "Line 1 · Packaging",
    health: 78,
    rul: 24,
    risk: "medium",
    signal: "Sealing-jaw temperature variance has widened from ±2 °C to ±7 °C over three weeks.",
    action: "Add a jaw calibration to WO-24935 rather than raising a second visit.",
    woTask: "Sealing jaw calibration",
    lastService: "11 Jun",
    mtbf: "420 h",
    trend: [93, 92, 90, 88, 85, 83, 80, 78],
  },
  {
    key: "conveyor",
    name: "Conveyor Belt",
    location: "Line 3 · Transfer",
    health: 84,
    rul: 41,
    risk: "low",
    signal: "Belt tension has settled after the last adjustment; drive current is flat.",
    action: "No action. Next check falls in the routine 500-hour PM.",
    woTask: "Belt tension and drive current check",
    lastService: "24 Jun",
    mtbf: "640 h",
    trend: [88, 87, 82, 86, 85, 84, 85, 84],
  },
  {
    key: "chiller",
    name: "Chiller 01",
    location: "Utilities",
    health: 88,
    rul: 52,
    risk: "low",
    signal: "Approach temperature is within 0.4 °C of commissioning. Efficiency is holding.",
    action: "No action. Condenser clean is scheduled with the quarterly PM.",
    woTask: "Condenser clean",
    lastService: "02 Jul",
    mtbf: "1,120 h",
    trend: [90, 90, 89, 91, 89, 88, 89, 88],
  },
];

export type MaintenanceKpi = { label: string; value: string; note: string; bad?: boolean };

/* `maintenanceKpis` is defined at the end of the work-order section, because
   the backlog figure is the crew's view of that board and has to move with it. */

/** Downtime minutes by cause today; adds up to the 45 min on the overview. */
export const downtimeCauses: readonly { label: string; minutes: number; line: string }[] = [
  { label: "Vision system fault", minutes: 16, line: "Line 1" },
  { label: "Material starvation", minutes: 11, line: "Line 2" },
  { label: "Changeover overrun", minutes: 8, line: "Line 2" },
  { label: "Jam / misfeed", minutes: 6, line: "Line 1" },
  { label: "Unmanned break coverage", minutes: 4, line: "Line 3" },
];

export const downtimeTotal = downtimeCauses.reduce((sum, c) => sum + c.minutes, 0);

/** Planned maintenance jobs per day for the next fortnight. */
export const pmSchedule: readonly { day: string; jobs: number; overdue?: number }[] = [
  { day: "Today", jobs: 2, overdue: 1 },
  { day: "+1", jobs: 0 },
  { day: "+2", jobs: 1 },
  { day: "+3", jobs: 3 },
  { day: "+4", jobs: 0 },
  { day: "+5", jobs: 0 },
  { day: "+6", jobs: 1 },
  { day: "+7", jobs: 2 },
  { day: "+8", jobs: 1 },
  { day: "+9", jobs: 0 },
  { day: "+10", jobs: 4 },
  { day: "+11", jobs: 0 },
  { day: "+12", jobs: 1 },
  { day: "+13", jobs: 2 },
];

/**
 * Two different problems live in this table and conflating them is how a
 * planner loses trust in a system: a part below its reorder point still lets
 * today's job go ahead, while a part at zero stops it. `required` is what the
 * booked job consumes, so the distinction is derived rather than asserted.
 */
export type SparePart = {
  part: string;
  code: string;
  onHand: number;
  required: number;
  reorderAt: number;
  leadTimeDays: number;
  neededBy?: string;
};

export const sparePartsAtRisk: readonly SparePart[] = [
  { part: "Deep groove bearing", code: "6205-2RS", onHand: 1, required: 1, reorderAt: 4, leadTimeDays: 12, neededBy: "WO-24921" },
  { part: "AGV battery pack", code: "BP-48V-30", onHand: 0, required: 1, reorderAt: 1, leadTimeDays: 21, neededBy: "WO-24948" },
  { part: "Sealing jaw kit", code: "PK-88", onHand: 3, required: 2, reorderAt: 5, leadTimeDays: 7, neededBy: "WO-24935" },
  { part: "Machine vision lens", code: "M12-16MM", onHand: 6, required: 1, reorderAt: 4, leadTimeDays: 5 },
];

export function partStatus(part: SparePart): { label: string; tone: "blocking" | "risk" | "ok" } {
  if (part.onHand < part.required) return { label: "Blocking", tone: "blocking" };
  if (part.onHand <= part.reorderAt) return { label: "Below reorder", tone: "risk" };
  return { label: "OK", tone: "ok" };
}

export const blockingParts = sparePartsAtRisk.filter(
  (part) => partStatus(part).tone === "blocking",
).length;

/* ================= WORK ORDERS ================= */

export type WoColumn = "requested" | "scheduled" | "progress" | "parts" | "done";

export const woColumns: readonly { key: WoColumn; label: string }[] = [
  { key: "requested", label: "Requested" },
  { key: "scheduled", label: "Scheduled" },
  { key: "progress", label: "In Progress" },
  { key: "parts", label: "Waiting Parts" },
  { key: "done", label: "Completed" },
];

export type WoCard = {
  id: string;
  asset: string;
  task: string;
  location: string;
  priority: "critical" | "high" | "normal";
  kind: "corrective" | "preventive";
  assignee: string;
  due: string;
  column: WoColumn;
  /** Planner's estimate in hours. Drives the crew backlog figure. */
  estHours: number;
  /** ISO 14224-style failure category. Corrective work only. */
  failureCode?: string;
  overdue?: boolean;
  /** Raised live from the console during this session. */
  fresh?: boolean;
};

/**
 * The board reuses the work order numbers the other modules already quote, so
 * the AI recommendation on the digital twin and the bearing job here are
 * visibly the same piece of work.
 */
export const woBoard: readonly WoCard[] = [
  { id: "WO-24966", estHours: 4, failureCode: "INST-VIS", asset: "Inspection Camera 02", task: "Vision system offline — restore", location: "Line 1", priority: "critical", kind: "corrective", assignee: "S. Chai", due: "Today 14:00", column: "requested", overdue: true },
  { id: "WO-24964", estHours: 3, failureCode: "QUAL-REJ", asset: "Reject Bin", task: "Investigate high reject rate", location: "Line 2", priority: "high", kind: "corrective", assignee: "Unassigned", due: "Today 18:00", column: "requested" },
  { id: "WO-24961", estHours: 1.5, asset: "Hopper filter", task: "Replace past service interval", location: "Line 3", priority: "normal", kind: "preventive", assignee: "Unassigned", due: "Tomorrow", column: "requested" },

  { id: "WO-24921", estHours: 6, asset: "Robot Arm", task: "Joint 2 bearing replacement", location: "Line 2", priority: "high", kind: "preventive", assignee: "P. Nawin", due: "In 3 days", column: "scheduled" },
  { id: "WO-24935", estHours: 8, asset: "Packaging Machine", task: "500 h PM + jaw calibration", location: "Line 1", priority: "normal", kind: "preventive", assignee: "P. Nawin", due: "In 6 days", column: "scheduled" },
  { id: "WO-24952", estHours: 5, asset: "Chiller 01", task: "Quarterly condenser clean", location: "Utilities", priority: "normal", kind: "preventive", assignee: "T. Rung", due: "In 11 days", column: "scheduled" },

  { id: "WO-24958", estHours: 1, failureCode: "PROC-TOOL", asset: "Processing Station", task: "Index tool — dimension drift", location: "Line 2", priority: "critical", kind: "corrective", assignee: "S. Chai", due: "Today 13:30", column: "progress" },
  { id: "WO-24955", estHours: 16, asset: "Line 3 (all assets)", task: "Scheduled maintenance window", location: "Line 3", priority: "normal", kind: "preventive", assignee: "T. Rung", due: "Today 14:00", column: "progress" },
  { id: "WO-24949", estHours: 2.5, failureCode: "MECH-ALN", asset: "Conveyor infeed guide", task: "Re-shim transfer guide", location: "Line 2", priority: "high", kind: "corrective", assignee: "A. Suda", due: "Today 16:00", column: "progress" },

  { id: "WO-24948", estHours: 3, asset: "AGV-02", task: "Battery pack service", location: "Logistics", priority: "high", kind: "preventive", assignee: "A. Suda", due: "In 9 days", column: "parts", overdue: false },
  { id: "WO-24943", estHours: 4, failureCode: "UTIL-GAS", asset: "Shielding gas line", task: "Fit buffer regulator", location: "Line 1", priority: "normal", kind: "corrective", assignee: "T. Rung", due: "Overdue 2 d", column: "parts", overdue: true },

  { id: "WO-24871", estHours: 1.5, asset: "Robot Arm", task: "Inspect bearing", location: "Line 2", priority: "normal", kind: "preventive", assignee: "P. Nawin", due: "Closed", column: "done" },
  { id: "WO-24802", estHours: 1, asset: "Inspection Camera", task: "Calibration", location: "Line 1", priority: "normal", kind: "preventive", assignee: "S. Chai", due: "Closed", column: "done" },
  { id: "WO-24711", estHours: 2, asset: "Conveyor Belt", task: "Belt tension", location: "Line 3", priority: "normal", kind: "preventive", assignee: "A. Suda", due: "Closed", column: "done" },
];

/** Numbering for work orders the visitor raises while clicking around. */
export const nextWorkOrderId = 24972;

/** Maintenance crew available to burn the backlog down. */
export const crew = { technicians: 3, hoursPerDay: 8 } as const;

export const openWorkHours = woBoard
  .filter((card) => card.column !== "done")
  .reduce((sum, card) => sum + card.estHours, 0);

/**
 * Backlog in crew-days rather than a typed number: the standard planning
 * question is "how long would the crew take to clear what is booked", and it
 * has to move when the board does.
 */
export const backlogDays = openWorkHours / (crew.technicians * crew.hoursPerDay);

export const maintenanceKpis: readonly MaintenanceKpi[] = [
  { label: "MTBF", value: "182 h", note: "30-day rolling · ↑ 14 h" },
  { label: "MTTR", value: "38 min", note: "30-day rolling · ↓ 6 min" },
  { label: "PM compliance", value: "92%", note: "23 of 25 on time" },
  { label: "Planned work", value: "78%", note: "target 80%", bad: true },
  { label: "Predicted saves", value: "4", note: "failures avoided this quarter" },
  {
    label: "Backlog",
    value: `${backlogDays.toFixed(1)} d`,
    note: `${openWorkHours} h open · ${crew.technicians} technicians`,
  },
];

export const woFilters: readonly { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "overdue", label: "Overdue" },
  { key: "preventive", label: "Preventive" },
];

export type CompletedWork = {
  id: string;
  asset: string;
  task: string;
  duration: string;
  cost: number;
  tech: string;
};

export const completedWork: readonly CompletedWork[] = [
  { id: "WO-24871", asset: "Robot Arm", task: "Inspect bearing", duration: "1h 10m", cost: 1850, tech: "P. Nawin" },
  { id: "WO-24802", asset: "Inspection Camera", task: "Calibration", duration: "45m", cost: 900, tech: "S. Chai" },
  { id: "WO-24711", asset: "Conveyor Belt", task: "Belt tension", duration: "2h 05m", cost: 3400, tech: "A. Suda" },
  { id: "WO-24688", asset: "Palletizer", task: "Gripper seal replacement", duration: "3h 20m", cost: 6100, tech: "T. Rung" },
  { id: "WO-24640", asset: "Chiller 01", task: "Refrigerant top-up", duration: "1h 35m", cost: 4250, tech: "T. Rung" },
];

export const woStats = {
  completedThisWeek: 31,
  avgCloseHours: "6.4 h",
  firstTimeFix: "88%",
} as const;

/* ---------------- chart geometry ----------------
 *
 * Every chart in the demo stores plain numbers and derives its SVG geometry
 * here. Hand-written path data would have to be redrawn by hand each time a
 * figure is retuned for a pitch, which is exactly when nobody has time to
 * redraw curves.
 *
 * The drawing space is a fixed 220x105 viewBox with a 0..100 value axis.
 * Charts whose numbers live in a real domain (millimetres, kW) call
 * `scaleSeries` first and keep their own units for the labels.
 */

export type ChartBox = {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/** The small trend cards along the bottom of a view. */
export const CHART: ChartBox = {
  width: 220,
  height: 105,
  left: 8,
  right: 212,
  top: 14,
  bottom: 92,
};

/** Full-width analysis charts. The wider left gutter carries axis labels. */
export const WIDE: ChartBox = {
  width: 640,
  height: 190,
  left: 52,
  right: 628,
  top: 16,
  bottom: 158,
};

/** Inline sparklines inside table rows. */
export const SPARK: ChartBox = {
  width: 100,
  height: 28,
  left: 1,
  right: 99,
  top: 3,
  bottom: 25,
};

/** x coordinate of point `i` in a series of `count` points. */
export function indexToX(i: number, count: number, box: ChartBox = CHART): number {
  const step = count > 1 ? (box.right - box.left) / (count - 1) : 0;
  return box.left + step * i;
}

/** y coordinate of a 0..100 value; out-of-range values clamp to the frame. */
export function valueToY(value: number, box: ChartBox = CHART): number {
  const clamped = Math.min(100, Math.max(0, value));
  return box.bottom - (clamped / 100) * (box.bottom - box.top);
}

/** Rescales real-world numbers onto the 0..100 axis the chart draws in. */
export function scaleValue(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

export function scaleSeries(
  series: readonly number[],
  min: number,
  max: number,
): number[] {
  return series.map((v) => scaleValue(v, min, max));
}

export function seriesToPoints(
  series: readonly number[],
  box: ChartBox = CHART,
): { x: number; y: number }[] {
  return series.map((v, i) => ({
    x: indexToX(i, series.length, box),
    y: valueToY(v, box),
  }));
}

/** Open polyline through a 0..100 series. */
export function seriesToPath(series: readonly number[], box: ChartBox = CHART): string {
  return seriesToPoints(series, box)
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/** The same polyline closed down to the baseline, for a filled area. */
export function seriesToArea(series: readonly number[], box: ChartBox = CHART): string {
  if (series.length === 0) return "";
  const points = seriesToPoints(series, box);
  const first = points[0];
  const last = points[points.length - 1];
  return `${seriesToPath(series, box)} L${last.x.toFixed(1)} ${box.bottom} L${first.x.toFixed(
    1,
  )} ${box.bottom} Z`;
}

/** Horizontal rule across the plot at a 0..100 value — targets, control limits. */
export function ruleAt(value: number, box: ChartBox = CHART): string {
  const y = valueToY(value, box).toFixed(1);
  return `M${box.left} ${y}H${box.right}`;
}

/** Shaded band between two 0..100 values, as x/y/width/height for a <rect>. */
export function bandBetween(from: number, to: number, box: ChartBox = CHART) {
  const yTop = valueToY(Math.max(from, to), box);
  const yBottom = valueToY(Math.min(from, to), box);
  return {
    x: box.left,
    y: yTop,
    width: box.right - box.left,
    height: Math.max(0, yBottom - yTop),
  };
}

/** Vertical shaded span covering points `from`..`to` of a `count`-point series. */
export function spanBetween(from: number, to: number, count: number, box: ChartBox = CHART) {
  const x1 = indexToX(from, count, box);
  const x2 = indexToX(to, count, box);
  return {
    x: Math.min(x1, x2),
    y: box.top,
    width: Math.abs(x2 - x1),
    height: box.bottom - box.top,
  };
}

/** Thai baht, rounded — every cost in this demo is a whole-baht figure. */
export function baht(value: number): string {
  return `฿${Math.round(value).toLocaleString("en-US")}`;
}

export function thousands(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
