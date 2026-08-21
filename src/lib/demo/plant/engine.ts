import type {
  Job,
  Kiln,
  LogKind,
  MaterialRequest,
  PlantAction,
  PlantState,
  Silo,
  Vehicle,
} from "./types";

/**
 * เครื่องจำลองโรงงาน — ตรรกะล้วน ไม่มี React ไม่มี DOM
 *
 * แยกออกมาเพราะกฎในนี้คือสิ่งที่ต้องอธิบายให้คนดูเข้าใจ ถ้าปนอยู่ในโค้ดหน้าจอ
 * จะอ่านไม่ออกว่ากติกาจริงคืออะไร และแก้ทีหลังแล้วเผลอเปลี่ยนพฤติกรรม
 *
 * ทุกฟังก์ชันรับ state เดิมแล้วคืน state ใหม่ ไม่แก้ของเดิม
 */

/** ผ่อนผันหลังเตากลับมาเดิน ก่อนเปิดแจ้งเตือนอีกครั้ง
 *  ระบบจริงตั้งไว้ 10 นาที — ย่อเหลือ 10 วินาทีเพื่อให้คนดูเห็นผลทันในเดโม */
export const RESUME_GRACE_MS = 10_000;
/** สิทธิ์การรับงานหมดอายุถ้าไม่ถึงเซิร์ฟเวอร์ภายในเวลานี้ */
export const CLAIM_TTL_MS = 30_000;
const LOG_KEPT = 60;

let logSeq = 0;
let idSeq = 0;

function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${String(idSeq).padStart(3, "0")}`;
}

function log(state: PlantState, kind: LogKind, text: string, detail?: string): PlantState {
  logSeq += 1;
  const entry = { id: logSeq, at: state.now, kind, text, ...(detail ? { detail } : {}) };
  return { ...state, log: [entry, ...state.log].slice(0, LOG_KEPT) };
}

// ── สภาพเริ่มต้นของโรงงานตัวอย่าง ────────────────────────────────
const SILO_SEED: ReadonlyArray<Omit<Silo, "quality" | "statusRaw">> = [
  { id: "SL1", levelPct: 78, channel: "SS", thresholdPct: 40, drainPerSec: 0.5, feedsKiln: "KLN-A" },
  { id: "SL2", levelPct: 46, channel: "GS", thresholdPct: 40, drainPerSec: 0.7, feedsKiln: "KLN-A" },
  { id: "SL3", levelPct: 63, channel: "GS", thresholdPct: 40, drainPerSec: 0.4, feedsKiln: "KLN-A" },
  { id: "SL4", levelPct: 52, channel: "SS", thresholdPct: 40, drainPerSec: 0.9, feedsKiln: "KLN-B" },
  { id: "SL5", levelPct: 71, channel: "GS", thresholdPct: 40, drainPerSec: 0.45, feedsKiln: "KLN-B" },
  { id: "SL6", levelPct: 88, channel: "GS", thresholdPct: 40, drainPerSec: 0.3, feedsKiln: "KLN-B" },
];

const VEHICLE_SEED: ReadonlyArray<Omit<Vehicle, "activeJobId">> = [
  { id: "LD-01", operator: "ผู้ขับ ก" },
  { id: "LD-02", operator: "ผู้ขับ ข" },
  { id: "LD-03", operator: "ผู้ขับ ค" },
];

/** ค่าที่ SCADA ส่งมาดิบ ๆ — ระบบไม่ตีความว่า "เต็ม" แปลว่าอะไร แค่เก็บและแสดง */
function statusFor(levelPct: number): string {
  return levelPct >= 85 ? "เต็ม" : "ปกติ";
}

export function initialState(at: number): PlantState {
  logSeq = 0;
  idSeq = 0;
  return {
    now: at,
    running: true,
    silos: SILO_SEED.map((s) => ({ ...s, quality: "good", statusRaw: statusFor(s.levelPct) })),
    kilns: [
      { id: "KLN-A", running: true, material: "หินปูน A", resumedAt: null },
      { id: "KLN-B", running: true, material: "หินปูน B", resumedAt: null },
    ],
    vehicles: VEHICLE_SEED.map((v) => ({ ...v, activeJobId: null })),
    jobs: [],
    requests: [],
    blinking: [],
    suppressed: [],
    log: [],
    seenMsgIds: {},
    counters: { scadaMessages: 0, rejected: 0, duplicates: 0 },
  };
}

// ── กฎการแจ้งเตือน ──────────────────────────────────────────────
/**
 * ไซโลถูกระงับการแจ้งเตือนเมื่อเตาที่มันป้อน "หยุดเดินจริง"
 *
 * เหตุผล: ระดับที่ลดลงตอนเตาหยุด ไม่ได้แปลว่าต้องรีบเติม การเตือนตอนนั้น
 * คือการเตือนผิด และถ้าเตือนผิดบ่อย ๆ คนขับจะเลิกเชื่อการเตือนทั้งระบบ
 *
 * ตอนเตากลับมาเดิน ต้องผ่อนผันอีกช่วงหนึ่งก่อน ไม่งั้นจะเตือนพรวดเดียว
 * ทั้งที่ระดับกำลังไต่กลับขึ้นอยู่แล้ว
 */
function suppressedSilos(state: PlantState): string[] {
  const out: string[] = [];
  for (const silo of state.silos) {
    const kiln = state.kilns.find((k) => k.id === silo.feedsKiln);
    if (!kiln) continue;
    if (!kiln.running) {
      out.push(silo.id);
      continue;
    }
    if (kiln.resumedAt !== null && state.now - kiln.resumedAt < RESUME_GRACE_MS) {
      out.push(silo.id);
    }
  }
  return out;
}

function recomputeAlerts(state: PlantState): PlantState {
  const suppressed = suppressedSilos(state);
  const fromThreshold = state.silos
    .filter((s) => s.levelPct < s.thresholdPct && !suppressed.includes(s.id))
    .map((s) => s.id);
  // คำขอวัตถุดิบที่ยังไม่มีใครรับ ก็ทำให้ไซโลนั้นกระพริบเช่นกัน
  const fromRequests = state.requests
    .filter((r) => r.actedBy === null && r.expiresAt > state.now)
    .map((r) => r.siloId);
  const blinking = Array.from(new Set([...fromThreshold, ...fromRequests]));
  return { ...state, suppressed, blinking };
}

// ── เดินเวลา ────────────────────────────────────────────────────
function tick(state: PlantState, at: number): PlantState {
  const dtSec = Math.min(2, Math.max(0, (at - state.now) / 1000));
  let next: PlantState = { ...state, now: at };
  if (!state.running || dtSec === 0) return recomputeAlerts(next);

  const silos = next.silos.map((silo) => {
    const kiln = next.kilns.find((k) => k.id === silo.feedsKiln);
    const draining = kiln?.running ?? false;
    // มีรถทำงานอยู่ที่ไซโลนี้ = กำลังเติม ระดับจึงไต่ขึ้น
    const beingFilled = next.jobs.some((j) => j.siloId === silo.id && j.endedAt === null);

    let level = silo.levelPct;
    if (beingFilled) level += 2.2 * dtSec;
    else if (draining) level -= silo.drainPerSec * dtSec;

    level = Math.max(0, Math.min(100, level));
    return { ...silo, levelPct: level, statusRaw: statusFor(level) };
  });

  next = { ...next, silos, counters: { ...next.counters, scadaMessages: next.counters.scadaMessages + silos.length } };

  // คำขอที่ไม่มีใครรับภายในเวลาที่กำหนด ถือว่าหมดอายุ
  const expired = next.requests.filter((r) => r.actedBy === null && r.expiresAt <= at);
  if (expired.length > 0) {
    next = {
      ...next,
      requests: next.requests.filter((r) => !expired.includes(r)),
    };
    for (const r of expired) {
      next = log(next, "alert", `คำขอวัตถุดิบที่ ${r.siloId} หมดอายุ`, "ไม่มีรถรับงานภายในเวลาที่กำหนด");
    }
  }

  return recomputeAlerts(next);
}

// ── คำสั่งจากผู้ใช้ ──────────────────────────────────────────────
function requestMaterial(state: PlantState, siloId: string, at: number): PlantState {
  const busy = state.jobs.some((j) => j.siloId === siloId && j.endedAt === null);
  if (busy) {
    const holder = state.jobs.find((j) => j.siloId === siloId && j.endedAt === null);
    return log(
      { ...state, now: at, counters: { ...state.counters, rejected: state.counters.rejected + 1 } },
      "reject",
      `ขอวัตถุดิบที่ ${siloId} ไม่ได้`,
      `409 — มีรถ ${holder?.vehicleId} ทำงานอยู่แล้ว`
    );
  }

  const request: MaterialRequest = {
    id: nextId("REQ"),
    siloId,
    createdAt: at,
    // ทุกเครื่องได้รับพร้อมกัน — บันทึกแยกว่าเครื่องไหน "แสดงแล้ว"
    displayedBy: state.vehicles.map((v) => v.id),
    actedBy: null,
    expiresAt: at + 45_000,
  };

  let next: PlantState = { ...state, now: at, requests: [...state.requests, request] };
  next = log(
    next,
    "request",
    `ส่งคำขอวัตถุดิบไปที่ ${siloId}`,
    `กระจายถึงเครื่อง ${request.displayedBy.join(", ")} — ปุ่มกระพริบ ไม่มีหน้าต่างเด้ง`
  );
  return recomputeAlerts(next);
}

type ClaimOutcome = { state: PlantState; ok: boolean; message: string };

/**
 * ขอรับงานที่ไซโลหนึ่ง
 *
 * กติกาที่ตั้งใจให้เห็นในเดโม
 *   1. ส่งรหัสข้อความเดิมซ้ำ ต้องได้งานเดิม ไม่ใช่งานใหม่
 *   2. สิทธิ์ที่ค้างในคิวนานเกินกำหนด ถือว่าหมดอายุ ต่อให้กดก่อนก็ตาม
 *   3. ใครถึงเซิร์ฟเวอร์ก่อนได้ก่อน — คนแพ้ต้องรู้ว่าใครได้ไป
 */
function claim(
  state: PlantState,
  vehicleId: string,
  siloId: string,
  msgId: string,
  at: number,
  claimedAt?: number
): ClaimOutcome {
  let next: PlantState = { ...state, now: at };

  // 1. เคยรับข้อความนี้แล้วหรือยัง
  const seen = next.seenMsgIds[msgId];
  if (seen) {
    next = {
      ...next,
      counters: { ...next.counters, duplicates: next.counters.duplicates + 1 },
    };
    const message = `200 — งานเดิม ${seen} ไม่สร้างงานใหม่`;
    next = log(next, "claim", `${vehicleId} ส่งรหัสข้อความซ้ำ`, message);
    return { state: next, ok: true, message };
  }

  // 2. สิทธิ์ค้างในคิวนานเกินกำหนด
  if (claimedAt !== undefined && at - claimedAt > CLAIM_TTL_MS) {
    const secs = Math.round((at - claimedAt) / 1000);
    const message = `410 — สิทธิ์หมดอายุ (ค้างในคิว ${secs} วินาที)`;
    next = {
      ...next,
      counters: { ...next.counters, rejected: next.counters.rejected + 1 },
      seenMsgIds: { ...next.seenMsgIds, [msgId]: "expired" },
    };
    next = log(next, "reject", `${vehicleId} ขอรับงานที่ ${siloId}`, message);
    return { state: next, ok: false, message };
  }

  // 3. ไซโลนี้มีคนถืออยู่แล้วไหม
  const holder = next.jobs.find((j) => j.siloId === siloId && j.endedAt === null);
  if (holder) {
    const message = `409 — งานนี้มีรถ ${holder.vehicleId} รับไปแล้ว`;
    next = {
      ...next,
      counters: { ...next.counters, rejected: next.counters.rejected + 1 },
      seenMsgIds: { ...next.seenMsgIds, [msgId]: holder.id },
    };
    next = log(next, "reject", `${vehicleId} ขอรับงานที่ ${siloId}`, message);
    return { state: next, ok: false, message };
  }

  // 4. รถคันนี้ถืองานอื่นอยู่ไหม — หนึ่งคันถือได้ทีละงานเดียว
  const vehicle = next.vehicles.find((v) => v.id === vehicleId);
  if (vehicle?.activeJobId) {
    const message = `409 — ${vehicleId} ถืองานอื่นอยู่ ต้องจบงานเดิมก่อน`;
    next = {
      ...next,
      counters: { ...next.counters, rejected: next.counters.rejected + 1 },
      seenMsgIds: { ...next.seenMsgIds, [msgId]: vehicle.activeJobId },
    };
    next = log(next, "reject", `${vehicleId} ขอรับงานที่ ${siloId}`, message);
    return { state: next, ok: false, message };
  }

  const job: Job = {
    id: nextId("JOB"),
    siloId,
    vehicleId,
    startedAt: at,
    endedAt: null,
    msgId,
  };

  next = {
    ...next,
    jobs: [...next.jobs, job],
    vehicles: next.vehicles.map((v) => (v.id === vehicleId ? { ...v, activeJobId: job.id } : v)),
    requests: next.requests.map((r) =>
      r.siloId === siloId && r.actedBy === null ? { ...r, actedBy: vehicleId } : r
    ),
    seenMsgIds: { ...next.seenMsgIds, [msgId]: job.id },
  };
  const message = `201 — ได้รับงาน ${job.id}`;
  next = log(next, "claim", `${vehicleId} รับงานที่ ${siloId}`, message);
  return { state: recomputeAlerts(next), ok: true, message };
}

/** ทุกคันกดพร้อมกัน — เรียงตามลำดับที่ถึงเซิร์ฟเวอร์ ไม่ใช่ตามเวลาที่กด */
function raceAll(state: PlantState, siloId: string, at: number): PlantState {
  let next: PlantState = log(
    { ...state, now: at },
    "system",
    `รถ ${state.vehicles.length} คันกดรับงานที่ ${siloId} พร้อมกัน`,
    "เรียงลำดับตามเวลาที่คำขอถึงเซิร์ฟเวอร์"
  );
  for (const vehicle of state.vehicles) {
    const result = claim(next, vehicle.id, siloId, nextId("MSG"), at);
    next = result.state;
  }
  return recomputeAlerts(next);
}

function stopJob(state: PlantState, vehicleId: string, at: number): PlantState {
  const vehicle = state.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle?.activeJobId) {
    return log({ ...state, now: at }, "reject", `${vehicleId} จบงาน`, "404 — ไม่มีงานที่ถืออยู่");
  }
  const job = state.jobs.find((j) => j.id === vehicle.activeJobId);
  let next: PlantState = {
    ...state,
    now: at,
    jobs: state.jobs.map((j) => (j.id === vehicle.activeJobId ? { ...j, endedAt: at } : j)),
    vehicles: state.vehicles.map((v) => (v.id === vehicleId ? { ...v, activeJobId: null } : v)),
  };
  const mins = job ? Math.max(1, Math.round((at - job.startedAt) / 1000)) : 0;
  next = log(next, "claim", `${vehicleId} จบงานที่ ${job?.siloId}`, `200 — ใช้เวลา ${mins} วินาที`);
  return recomputeAlerts(next);
}

function setKiln(state: PlantState, kilnId: string, running: boolean, at: number): PlantState {
  const kilns: Kiln[] = state.kilns.map((k) =>
    k.id === kilnId ? { ...k, running, resumedAt: running ? at : null } : k
  );
  let next: PlantState = { ...state, now: at, kilns };
  const fed = state.silos.filter((s) => s.feedsKiln === kilnId).map((s) => s.id);
  next = log(
    next,
    "alert",
    running ? `${kilnId} กลับมาเดิน` : `${kilnId} หยุดเดิน`,
    running
      ? `ผ่อนผัน ${RESUME_GRACE_MS / 1000} วินาทีก่อนเปิดแจ้งเตือน ${fed.join(", ")} อีกครั้ง`
      : `ระงับการแจ้งเตือนของ ${fed.join(", ")} — ระดับที่ลดตอนเตาหยุดไม่ใช่เหตุให้เติม`
  );
  return recomputeAlerts(next);
}

export function reduce(state: PlantState, action: PlantAction): PlantState {
  switch (action.type) {
    case "tick":
      return tick(state, action.at);

    case "toggleRun":
      return { ...state, running: !state.running };

    case "requestMaterial":
      return requestMaterial(state, action.siloId, action.at);

    case "claim":
      return claim(state, action.vehicleId, action.siloId, action.msgId, action.at).state;

    case "raceAll":
      return raceAll(state, action.siloId, action.at);

    case "duplicateClaim": {
      // ส่งคำขอเดิมซ้ำ 5 ครั้งด้วยรหัสข้อความเดียวกัน
      const target = state.silos.find(
        (s) => !state.jobs.some((j) => j.siloId === s.id && j.endedAt === null)
      );
      const vehicle = state.vehicles.find((v) => !v.activeJobId);
      if (!target || !vehicle) {
        return log({ ...state, now: action.at }, "system", "ทดสอบส่งซ้ำไม่ได้", "ไม่มีไซโลหรือรถที่ว่าง");
      }
      const msgId = nextId("MSG");
      let next: PlantState = log(
        { ...state, now: action.at },
        "system",
        `ส่งคำขอเดิมซ้ำ 5 ครั้งด้วยรหัส ${msgId}`,
        "ครั้งแรกสร้างงาน ที่เหลือต้องได้งานเดิม"
      );
      for (let i = 0; i < 5; i += 1) {
        next = claim(next, vehicle.id, target.id, msgId, action.at).state;
      }
      return next;
    }

    case "staleClaim": {
      // จำลองสิทธิ์ที่ค้างอยู่ในคิวตอนเน็ตหลุด แล้วเพิ่งส่งถึงตอนนี้
      const target = state.silos[0];
      const vehicle = state.vehicles[0];
      const claimedAt = action.at - (CLAIM_TTL_MS + 45_000);
      let next: PlantState = log(
        { ...state, now: action.at },
        "system",
        `${vehicle.id} กดรับงานตอนเน็ตหลุด แล้วส่งถึงเซิร์ฟเวอร์ทีหลัง`,
        `กดไว้เมื่อ ${Math.round((action.at - claimedAt) / 1000)} วินาทีก่อน`
      );
      next = claim(next, vehicle.id, target.id, nextId("MSG"), action.at, claimedAt).state;
      return next;
    }

    case "stopJob":
      return stopJob(state, action.vehicleId, action.at);

    case "setKiln":
      return setKiln(state, action.kilnId, action.running, action.at);

    case "reset":
      return initialState(action.at);

    default:
      return state;
  }
}
