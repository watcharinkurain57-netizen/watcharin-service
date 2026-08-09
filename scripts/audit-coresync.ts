/**
 * Numeric audit of the CoreSync Factory OS demo data.
 *
 *   npm run audit:coresync
 *
 * The demo is a sales asset shown to people who run factories, and the first
 * thing someone with a manufacturing background does with a dashboard is add
 * the lines up. A figure that contradicts another figure two screens away
 * costs more credibility than a missing feature does. This asserts the things
 * a visitor could catch by hand: that the totals tie, that the capability
 * indices match the plotted readings, that the tariff arithmetic is a real
 * Thai invoice, and that a job blocked by a missing part is filed as blocked.
 *
 * It is not a unit test of the components — it is a check that the story the
 * numbers tell is internally consistent.
 */
import {
  assetHealth,
  backlogDays,
  completedWork,
  crew,
  defectTotal,
  defectTypes,
  downtimeCauses,
  energyByArea,
  energyToday,
  firstPassYield,
  kpis,
  lineQuality,
  loadToday,
  maintenanceHistory,
  maintenanceKpis,
  maintenanceUpcoming,
  monthlyBill,
  offPeakKwh,
  onPeakKwh,
  openWorkHours,
  partStatus,
  plantCharts,
  productionLines,
  productionSummary,
  sparePartsAtRisk,
  spc,
  spcLcl,
  spcStats,
  spcUcl,
  tariff,
  woBoard,
} from "../src/lib/coresync-data.ts";

let failures = 0;
let checks = 0;

function check(condition: boolean, message: string) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${message}`);
  } else if (process.env.VERBOSE) {
    console.log(`ok    ${message}`);
  }
}

function section(name: string) {
  if (process.env.VERBOSE) console.log(`\n== ${name} ==`);
}

/** Pulls the number out of a display string like "4,320/hr" or "78.8%". */
const num = (text: string) => Number(text.replace(/[^0-9.]/g, ""));
const close = (a: number, b: number, tolerance = 0.01) => Math.abs(a - b) < tolerance;

section("plant totals");
const lineThroughput = productionLines.reduce((sum, l) => sum + num(l.throughput), 0);
const outputKpi = kpis.find((k) => k.label === "Output / hr");
const oeeKpi = kpis.find((k) => k.label === "OEE");
check(num(outputKpi?.value ?? "0") === lineThroughput, "Output / hr KPI equals the sum of the lines");
check(
  num(plantCharts.find((c) => c.title.startsWith("OUTPUT"))?.value ?? "0") === lineThroughput,
  "output trend card agrees with the Output / hr KPI",
);
// ISO 22400 excludes planned downtime, so the line in its maintenance window
// drops out of the plant OEE rather than dragging it toward zero.
const oeeLines = productionLines.filter((l) => l.status !== "maintenance");
const weightedOee =
  oeeLines.reduce((sum, l) => sum + l.oee * num(l.throughput), 0) /
  oeeLines.reduce((sum, l) => sum + num(l.throughput), 0);
check(close(num(oeeKpi?.value ?? "0"), weightedOee, 0.1), "plant OEE is the throughput-weighted OEE of the running lines");
check(Boolean(oeeKpi?.trend.includes("Line 3")), "plant OEE states which lines it covers");
check(
  productionSummary.some((row) => row.label === "Plant profile"),
  "a plant profile is stated, so the reader can judge whether the numbers are a sensible size",
);

section("quality");
const inspected = lineQuality.reduce((sum, l) => sum + l.inspected, 0);
check(inspected === num(productionSummary.find((r) => r.label === "Total Output")?.value ?? "0"), "inspected units equal total output");
check(lineQuality.reduce((sum, l) => sum + l.defects, 0) === defectTotal, "per-line defects equal the defect-type total");
check(defectTotal === num(productionSummary.find((r) => r.label === "Rejects")?.value ?? "0"), "defect total equals reported rejects");
check(close(firstPassYield, 98.2, 0.1), "first pass yield agrees with the overview quality rate");
check(
  defectTypes.every((d, i, all) => i === 0 || all[i - 1].count >= d.count),
  "defect types are sorted descending, which the Pareto and its cumulative curve rely on",
);

section("spc / process capability (AIAG)");
check(close(spcUcl, spc.target + 3 * spc.studySigma), "control limits are the centre ±3σ");
check(close(spcLcl, spc.target - 3 * spc.studySigma), "lower control limit matches");
check(
  spc.chartType.toLowerCase().includes("individuals"),
  "chart is declared as an individuals chart — ±3σ limits are wrong for a chart of subgroup means",
);
// Recomputed here independently of the module, so a change to either side shows up.
const values = [...spc.values];
const mean = values.reduce((a, b) => a + b, 0) / values.length;
const overall = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1));
const ranges = values.slice(1).map((v, i) => Math.abs(v - values[i]));
const within = ranges.reduce((a, b) => a + b, 0) / ranges.length / 1.128;
check(close(spcStats.mean, mean, 1e-9), "reported mean matches the plotted readings");
check(close(spcStats.cp, (spc.usl - spc.lsl) / (6 * within), 1e-9), "Cp uses within-process sigma from the moving range");
check(close(spcStats.ppk, Math.min(spc.usl - mean, mean - spc.lsl) / (3 * overall), 1e-9), "Ppk uses overall sigma");
check(spcStats.cpk > spcStats.ppk, "Cpk exceeds Ppk, which is what a drifting process looks like");
check(
  spcStats.beyondLimits === values.filter((v) => v > spcUcl || v < spcLcl).length,
  "the flagged points are exactly the ones outside the control limits",
);

section("energy / tariff");
check(loadToday.reduce((a, b) => a + b, 0) === energyToday, "load curve sums to the daily total");
check(energyByArea.reduce((sum, a) => sum + a.kwh, 0) === energyToday, "consumption by area sums to the daily total");
check(energyByArea.find((a) => a.label === "Line 2")?.kwh === 320, "Line 2 energy matches the figure on its digital twin");
check(onPeakKwh + offPeakKwh === energyToday, "the time-of-use split accounts for every kWh");
check(tariff.peakFrom === 9 && tariff.peakTo === 22, "on-peak window is the real 09:00–22:00 weekday definition");
const preVat = monthlyBill.lines.slice(0, -1).reduce((sum, l) => sum + l.value, 0);
check(close(preVat, monthlyBill.beforeVat), "invoice lines sum to the pre-VAT subtotal");
check(close(monthlyBill.vat, monthlyBill.beforeVat * tariff.vat), "VAT is applied to the whole subtotal");
check(close(monthlyBill.total, monthlyBill.beforeVat + monthlyBill.vat), "invoice total is subtotal plus VAT");
check(monthlyBill.lines.length === 5, "invoice carries all five lines a real bill has, not just the energy charge");

section("maintenance");
check(downtimeCauses.reduce((sum, c) => sum + c.minutes, 0) === 45, "downtime by cause sums to the reported downtime");
check(
  Boolean(maintenanceKpis.find((k) => k.label === "MTTR")?.note.includes("rolling")),
  "MTTR is labelled as a rolling figure rather than reading as today's",
);
check(close(backlogDays, openWorkHours / (crew.technicians * crew.hoursPerDay), 1e-9), "backlog is derived from open work and crew size");
check(assetHealth.every((a) => a.rul >= 0 && a.health >= 0 && a.health <= 100), "asset health and remaining life are in range");

section("work orders");
const ids = woBoard.map((c) => c.id);
check(new Set(ids).size === ids.length, "no duplicate work order numbers");
const doneIds = woBoard.filter((c) => c.column === "done").map((c) => c.id);
check(doneIds.every((id) => completedWork.some((w) => w.id === id)), "every completed card appears in the completed table");
check(
  [...maintenanceHistory, ...maintenanceUpcoming].every((w) => ids.includes(w.id)),
  "the jobs quoted on the digital twin all exist on the board",
);
check(sparePartsAtRisk.every((p) => !p.neededBy || ids.includes(p.neededBy)), "spare parts reference real work orders");
// Below the reorder point is a purchasing decision; short of what the job needs
// is a stopped job. Only the latter belongs in Waiting Parts.
const waiting = woBoard.filter((c) => c.column === "parts").map((c) => c.id);
check(
  sparePartsAtRisk
    .filter((p) => partStatus(p).tone === "blocking" && p.neededBy)
    .every((p) => waiting.includes(p.neededBy as string)),
  "a job short of a part it needs is filed under Waiting Parts",
);
check(woBoard.every((c) => typeof c.estHours === "number" && c.estHours > 0), "every work order carries a planner estimate");
check(woBoard.filter((c) => c.kind === "corrective").every((c) => Boolean(c.failureCode)), "corrective work carries a failure code");
check(woBoard.filter((c) => c.kind === "preventive").every((c) => !c.failureCode), "preventive work carries no failure code");

console.log(
  failures === 0
    ? `coresync demo data: ${checks} checks pass`
    : `coresync demo data: ${failures} of ${checks} checks FAILED`,
);
process.exit(failures === 0 ? 0 : 1);
