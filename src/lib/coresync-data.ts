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
  /** Only these three views are fully built in the demo. */
  built?: boolean;
};

export const navItems: readonly NavItem[] = [
  { key: "overview", icon: "⌂", label: "Overview", built: true },
  { key: "digital", icon: "◇", label: "Digital Twin", built: true },
  { key: "ai", icon: "✦", label: "AI Insights", built: true },
  { key: "lines", icon: "▤", label: "Lines" },
  { key: "equipment", icon: "▧", label: "Equipment" },
  { key: "alerts", icon: "△", label: "Alerts", badge: 5 },
  { key: "maintenance", icon: "⚒", label: "Maintenance" },
  { key: "quality", icon: "⬡", label: "Quality" },
  { key: "energy", icon: "ϟ", label: "Energy" },
  { key: "reports", icon: "▣", label: "Reports" },
  { key: "workorders", icon: "▦", label: "Work Orders" },
  { key: "inventory", icon: "⬢", label: "Inventory" },
  { key: "settings", icon: "⚙", label: "Settings" },
];

export const viewTitles: Record<string, string> = {
  overview: "Factory Command Center",
  digital: "Digital Twin — Production Lines",
  ai: "AI Factory Assistant",
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

export const kpis: readonly Kpi[] = [
  { icon: "◎", label: "OEE", value: "82.6%", trend: "↑ 4.2% vs yesterday" },
  { icon: "▥", label: "Output / hr", value: "12,540", trend: "↑ 8.7% vs yesterday" },
  { icon: "◷", label: "Downtime", value: "45", unit: "min", trend: "↓ 12.1% vs yesterday" },
  { icon: "ϟ", label: "Energy Use", value: "1,250", unit: "kWh", trend: "↓ 6.3% vs yesterday" },
  { icon: "⬡", label: "Quality Rate", value: "98.2%", trend: "↑ 1.6% vs yesterday" },
  { icon: "◔", label: "Utilization", value: "88.1%", trend: "↑ 3.3% vs yesterday" },
];

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
    value: "12,540/hr",
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

export const productionSummary: readonly { label: string; value: string }[] = [
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

/**
 * Turns a 0..100 series into an SVG path for the 220x105 chart viewBox.
 * Charts store numbers rather than hand-written paths so the demo figures can
 * be edited without redrawing curves by hand.
 */
export function seriesToPath(series: readonly number[]): string {
  const left = 8;
  const right = 212;
  const top = 14;
  const bottom = 92;
  const step = series.length > 1 ? (right - left) / (series.length - 1) : 0;

  return series
    .map((v, i) => {
      const x = left + step * i;
      const y = bottom - (Math.min(100, Math.max(0, v)) / 100) * (bottom - top);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
