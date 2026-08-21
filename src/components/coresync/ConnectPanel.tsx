"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LIMITS, type Reading } from "@/lib/demo/contract";
import { saveSession, saveTags } from "@/lib/demo/session-store";
import { DEFAULT_TAGS, SIM_EVERY_MS, useDemoSimulator } from "@/lib/demo/simulate";
import { useDemoChannel, useSecondsSince } from "@/lib/demo/useDemoChannel";

type Session = { token: string; sessionId: string; expiresAt: string };

function fmt(value: Reading["value"]) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return value.toLocaleString("th-TH");
  return value;
}

function timeOf(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleTimeString("th-TH", { hour12: false });
}

export function ConnectPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [tagText, setTagText] = useState(DEFAULT_TAGS.join("\n"));
  const [simOn, setSimOn] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const live = useDemoChannel(session?.sessionId ?? null);
  const since = useSecondsSince(live.lastAt);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/demo/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "ขอโทเคนไม่สำเร็จ");
      setSession(data as Session);
      // ฝากไว้ให้หน้าแดชบอร์ดหยิบไปใช้ ผู้ใช้จะได้ไม่ต้องคัดลอกรหัสไปวางเอง
      saveSession(data as Session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ขอโทเคนไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }, []);

  const tags = tagText
    .split(/[\n,]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, LIMITS.distinctTags);

  useDemoSimulator({
    token: session?.token ?? null,
    tags,
    enabled: simOn,
    onError: (message) => {
      setSimError(message);
      setSimOn(false);
    },
  });

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const curl = session
    ? `curl -X POST ${typeof window === "undefined" ? "" : window.location.origin}/api/demo/ingest \\
  -H "Content-Type: application/json" \\
  -d '{"token":"${session.token}","readings":[{"tag":"KK1_LEVEL","value":68.4,"unit":"%","ts":"${new Date().toISOString()}"}]}'`
    : "";

  const connectorCmd = session
    ? `.\\coresync-connector.ps1 \`
  -Token "${session.token}" \`
  -Path "C:\\export\\tags.csv" \`
  -Endpoint "${typeof window === "undefined" ? "" : window.location.origin}/api/demo/ingest"`
    : "";

  return (
    <div className="space-y-6">
      {/* ───────── สถานะสด — ส่วนที่สำคัญที่สุดของหน้านี้ ───────── */}
      <section className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">สถานะการเชื่อมต่อ</h2>
          {session ? (
            <span className="text-xs text-ink-faint">
              หมดอายุ {new Date(session.expiresAt).toLocaleTimeString("th-TH", { hour12: false })} น.
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <span
            aria-hidden
            className={`inline-block h-3 w-3 shrink-0 rounded-full ${
              live.status === "listening" && live.lastAt
                ? "animate-pulse bg-brand-400"
                : live.status === "error"
                  ? "bg-red-500"
                  : session
                    ? "bg-amber-400"
                    : "bg-ink-faint/40"
            }`}
          />
          <p className="text-sm">
            {!session ? (
              <span className="text-ink-muted">ยังไม่ได้เริ่ม — กดปุ่มด้านล่างเพื่อสร้างช่องรับข้อมูล</span>
            ) : live.status === "error" ? (
              <span className="text-red-400">{live.error}</span>
            ) : live.lastAt === null ? (
              <span className="text-ink-muted">
                เปิดช่องรับข้อมูลแล้ว <span className="text-ink">กำลังรอข้อมูลชุดแรก…</span>
              </span>
            ) : (
              <span>
                <span className="font-semibold text-brand-400">ได้รับข้อมูลแล้ว</span>{" "}
                <span className="text-ink-muted">
                  ล่าสุดเมื่อ {since === 0 ? "ไม่กี่วินาที" : `${since} วินาที`}ที่แล้ว ·{" "}
                  {live.tags.length} tag · {live.totalReadings.toLocaleString("th-TH")} ค่า ·{" "}
                  {live.batches} ชุด
                </span>
              </span>
            )}
          </p>
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? "กำลังสร้าง…" : session ? "สร้างช่องใหม่" : "เริ่มโหมดทดลอง"}
          </button>
          {session ? (
            <button
              type="button"
              onClick={() => {
                // พกชื่อ tag ไปด้วย แดชบอร์ดจะได้จำลองต่อด้วยชื่อเดิมเมื่อผู้ใช้ย้ายหน้า
                if (!simOn) saveTags(tags);
                setSimOn((on) => !on);
              }}
              className="rounded-xl border border-line-strong px-4 py-2 text-sm font-semibold transition hover:border-brand-500"
            >
              {simOn ? "หยุดข้อมูลจำลอง" : "ใช้ข้อมูลจำลองแทน"}
            </button>
          ) : null}
        </div>
        {simError ? <p className="mt-3 text-sm text-red-400">{simError}</p> : null}
      </section>

      {session ? (
        <>
          {/* ───────── ระดับ 0 — พิมพ์ชื่อ tag ตัวเองแล้วเห็นบนจอทันที ───────── */}
          <section className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
            <h2 className="text-lg font-semibold">ลองด้วยชื่อ tag ของคุณเอง</h2>
            <p className="mt-1 text-sm text-ink-muted">
              พิมพ์ชื่อ tag จริงจากระบบของคุณลงไป บรรทัดละหนึ่งชื่อ แล้วกด{" "}
              <span className="text-ink">ใช้ข้อมูลจำลองแทน</span> — ระบบจะสร้างค่าสมมติให้ tag เหล่านั้น
              เพื่อให้เห็นว่าหน้าจอจะหน้าตาแบบไหนเมื่อต่อข้อมูลจริง
            </p>
            <textarea
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              rows={5}
              spellCheck={false}
              className="mt-3 w-full rounded-xl border border-line bg-surface p-3 font-mono text-sm outline-none focus:border-brand-500"
            />
            <p className="mt-2 text-xs text-ink-faint">
              {tags.length} tag · สูงสุด {LIMITS.distinctTags} tag · ส่งทุก {SIM_EVERY_MS / 1000} วินาที
            </p>
          </section>

          {/* ───────── ระดับ 1 — ต่อจากเครื่องของลูกค้าเอง ───────── */}
          <section className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">ส่งข้อมูลจากเครื่องของคุณ</h2>
              <button
                type="button"
                onClick={() => copy("curl", curl)}
                className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-semibold transition hover:border-brand-500"
              >
                {copied === "curl" ? "คัดลอกแล้ว" : "คัดลอกคำสั่ง"}
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              วางคำสั่งนี้ในเทอร์มินัลได้เลยเพื่อทดสอบว่าเครือข่ายของคุณส่งออกมาถึงเราได้
              ใช้ HTTPS พอร์ต 443 ซึ่งผ่าน firewall โรงงานได้เกือบทุกที่
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed">
              <code>{curl}</code>
            </pre>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-faint">
              <span>ครั้งละไม่เกิน {LIMITS.readingsPerBatch} ค่า</span>
              <span>ก้อนละไม่เกิน {Math.round(LIMITS.bodyBytes / 1024)} KB</span>
              <span>โทเคนอายุ {LIMITS.sessionMinutes / 60} ชั่วโมง</span>
            </div>
          </section>

          {/* ───────── ระดับ 1 — อ่านไฟล์ที่ระบบเดิมของเขาส่งออกอยู่แล้ว ───────── */}
          <section className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">อ่านจากไฟล์ที่ระบบของคุณส่งออกอยู่แล้ว</h2>
              <button
                type="button"
                onClick={() => copy("ps", connectorCmd)}
                className="rounded-lg border border-line-strong px-3 py-1.5 text-xs font-semibold transition hover:border-brand-500"
              >
                {copied === "ps" ? "คัดลอกแล้ว" : "คัดลอกคำสั่ง"}
              </button>
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              ถ้าระบบเดิมของคุณส่งออกไฟล์ CSV อยู่แล้ว ชี้ตัวเชื่อมต่อไปที่ไฟล์นั้นได้เลย
              ไม่ต้องแตะระบบจริง ตัวเชื่อมต่ออ่านไฟล์แล้วส่งออกทางเดียว
            </p>
            <ol className="mt-3 space-y-1.5 text-sm text-ink-muted">
              <li>
                1.{" "}
                <a
                  href="/coresync-connector.ps1"
                  download
                  className="text-brand-400 underline underline-offset-4"
                >
                  ดาวน์โหลด coresync-connector.ps1
                </a>{" "}
                — เป็นสคริปต์ข้อความ เปิดอ่านได้ทุกบรรทัดก่อนรัน
              </li>
              <li>2. เปิด PowerShell ในโฟลเดอร์ที่วางไฟล์ไว้</li>
              <li>3. วางคำสั่งด้านล่าง แก้เส้นทางไฟล์ให้ตรงกับของคุณ</li>
            </ol>
            <pre className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface p-3 text-xs leading-relaxed">
              <code>{connectorCmd}</code>
            </pre>
            <p className="mt-3 text-xs text-ink-faint">
              รองรับ CSV สองแบบโดยตรวจให้เอง — แบบที่คอลัมน์คือชื่อ tag
              และแบบที่หนึ่งแถวคือหนึ่งค่า (<span className="font-mono">tag,value,timestamp</span>) ·
              ใส่ <span className="font-mono">-Once</span> เพื่อส่งครั้งเดียวตอนทดสอบว่าเครือข่ายส่งออกได้
            </p>
            <p className="mt-2 text-xs text-ink-faint">
              ถ้า Windows ไม่ยอมรันสคริปต์ที่ดาวน์โหลดมา ให้เปิดด้วย{" "}
              <span className="font-mono">powershell -ExecutionPolicy Bypass -File .\coresync-connector.ps1 …</span>
            </p>
          </section>

          {/* ───────── ให้เห็นว่าเราตีความข้อมูลเขาถูก ───────── */}
          <section className="rounded-2xl border border-line bg-surface-raised p-5 sm:p-6">
            <h2 className="text-lg font-semibold">ข้อมูลที่รับเข้ามาล่าสุด</h2>
            {live.recent.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                ยังไม่มีข้อมูล — เมื่อส่งเข้ามาแล้วจะขึ้นที่นี่ภายในไม่กี่วินาที
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-ink-faint">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Tag</th>
                      <th className="pb-2 pr-4 font-medium">ค่า</th>
                      <th className="pb-2 font-medium">เวลาที่วัดได้</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {live.recent.map((r, i) => (
                      <tr key={`${r.tag}-${r.ts}-${i}`} className="border-t border-line/60">
                        <td className="py-1.5 pr-4">{r.tag}</td>
                        <td className="py-1.5 pr-4">
                          {fmt(r.value)}
                          {r.unit ? <span className="text-ink-faint"> {r.unit}</span> : null}
                        </td>
                        <td className="py-1.5 text-ink-muted">{timeOf(r.ts)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {live.tags.length > 0 ? (
              <p className="mt-4 text-xs text-ink-faint">
                เวลาที่แสดงคือเวลาที่ประทับมาจากต้นทาง ไม่ใช่เวลาที่เราได้รับ —
                ถ้าเครือข่ายหน้างานหลุดแล้วส่งย้อนหลัง ลำดับเวลาจะยังถูกต้อง
              </p>
            ) : null}
          </section>

          <p className="text-center text-sm">
            <Link href="/coresync" className="text-brand-400 underline underline-offset-4">
              เปิดหน้าจอ Factory OS แล้วดูที่เมนู Your Data →
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
