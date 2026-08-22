/**
 * ตรวจกฎของรายละเอียดงาน — ตัวแปลงข้อความและแป้นเครื่องมือ
 *
 *   pnpm audit:notes
 *
 * ตรรกะใน src/lib/task-notes.ts เป็นที่เดียวที่ตัดสินว่าอะไรคือโค้ดอะไรคือข้อความ
 * และเป็นตรรกะล้วน ๆ ที่ไม่ต้องพึ่ง DOM เลย จึงตรวจด้วยสคริปต์ได้ตรง ๆ
 * ไม่ต้องเปิดเบราว์เซอร์ไล่กดทีละเคส
 *
 * เคสที่ต้องมีตลอดไปคือพวกที่ "ผิดแล้วเงียบ": fence ที่ยังไม่ปิด,
 * ** ที่อยู่ในเครื่องหมาย backtick, และตำแหน่งเคอร์เซอร์หลังกดปุ่ม
 * ซึ่งไม่มีใครสังเกตจนกว่าจะพิมพ์อยู่แล้วรู้สึกว่ามันแปลก ๆ
 */
import { storageKey } from "../src/lib/project-files.ts";
import { bucketBy } from "../src/lib/grouping.ts";
import { MAX_ZOOM, MIN_ZOOM, contentPointAt, fitView, zoomAt } from "../src/lib/pan-zoom.ts";
import { groupProjectsByClient, type Client, type ClientProject } from "../src/lib/clients.ts";
import {
  bulletLines,
  fenceBlock,
  noteSummary,
  parseNote,
  parseSpans,
  wrapInline,
} from "../src/lib/task-notes.ts";

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

function same(a: unknown, b: unknown, message: string) {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) console.error(`      got ${JSON.stringify(a)}\n      want ${JSON.stringify(b)}`);
  check(ok, message);
}

function section(name: string) {
  if (process.env.VERBOSE) console.log(`\n-- ${name}`);
}

/* ---------------- ตัวแปลง ---------------- */

section("บล็อกโค้ด");

const fenced = parseNote("ก่อนหน้า\n```sql\nselect 1;\n```\nหลังจาก");
same(
  fenced,
  [
    { kind: "para", lines: [[{ kind: "text", text: "ก่อนหน้า" }]] },
    { kind: "code", lang: "sql", code: "select 1;" },
    { kind: "para", lines: [[{ kind: "text", text: "หลังจาก" }]] },
  ],
  "โค้ดคั่นกลางย่อหน้า แยกออกเป็นสามบล็อก",
);

// fence ที่ยังไม่ปิดต้องเป็นโค้ดจนจบ ไม่ใช่หายไปหรือกลายเป็นข้อความธรรมดา
// ระหว่างพิมพ์จะเจอสถานะนี้ตลอด ถ้าจัดการไม่ดีตัวอย่างจะกระพริบสลับไปมา
const unclosed = parseNote("```\nยังพิมพ์ไม่จบ");
same(unclosed, [{ kind: "code", lang: null, code: "ยังพิมพ์ไม่จบ" }], "fence ที่ยังไม่ปิดยังเป็นโค้ดจนจบข้อความ");

const noLang = parseNote("```\nls -la\n```");
check(noLang.length === 1 && noLang[0].kind === "code" && noLang[0].lang === null, "ไม่ระบุภาษา = lang เป็น null");

const junkLang = parseNote("```ภาษาไทย ที่มีช่องว่าง\nx\n```");
check(junkLang[0].kind === "code" && junkLang[0].lang === null, "ชื่อภาษาที่ไม่เข้าเกณฑ์ถือว่าไม่ได้ระบุ");

const emptyCode = parseNote("```\n```");
same(emptyCode, [{ kind: "code", lang: null, code: "" }], "บล็อกโค้ดเปล่ายังเป็นบล็อกโค้ด");

// บรรทัดว่างในโค้ดต้องอยู่ครบ ไม่โดนกินเหมือนบรรทัดว่างระหว่างย่อหน้า
const blankInCode = parseNote("```\na\n\nb\n```");
check(blankInCode[0].kind === "code" && blankInCode[0].code === "a\n\nb", "บรรทัดว่างในบล็อกโค้ดไม่ถูกกลืน");

section("ข้อความในบรรทัด");

same(
  parseSpans("ค่าอยู่ที่ `plant_tags` นะ"),
  [
    { kind: "text", text: "ค่าอยู่ที่ " },
    { kind: "code", text: "plant_tags" },
    { kind: "text", text: " นะ" },
  ],
  "โค้ดในบรรทัดถูกแยกออกจากข้อความรอบข้าง",
);

// ข้อสำคัญ: ** ที่อยู่ใน backtick ต้องออกมาเป็นตัวอักษรตามที่พิมพ์
same(
  parseSpans("`**ไม่ใช่ตัวหนา**`"),
  [{ kind: "code", text: "**ไม่ใช่ตัวหนา**" }],
  "ดาวคู่ที่อยู่ในโค้ดยังเป็นดาวคู่ ไม่กลายเป็นตัวหนา",
);

same(parseSpans("**เน้น**"), [{ kind: "bold", text: "เน้น" }], "ดาวคู่นอกโค้ดกลายเป็นตัวหนา");

// เครื่องหมายที่ไม่ครบคู่ต้องไม่กลืนข้อความหาย
same(parseSpans("ราคา 5 * 3 = 15"), [{ kind: "text", text: "ราคา 5 * 3 = 15" }], "ดาวเดี่ยวไม่ใช่เครื่องหมายจัดรูปแบบ");
same(parseSpans("เปิด ` ค้างไว้"), [{ kind: "text", text: "เปิด ` ค้างไว้" }], "backtick ที่ไม่ครบคู่ยังเป็นตัวอักษร");

section("รายการและย่อหน้า");

const bullets = parseNote("- หนึ่ง\n- สอง");
check(bullets.length === 1 && bullets[0].kind === "bullets" && bullets[0].items.length === 2, "จุดนำหน้าติดกันรวมเป็นรายการเดียว");

const para = parseNote("บรรทัดแรก\nบรรทัดสอง\n\nย่อหน้าใหม่");
check(para.length === 2, "บรรทัดว่างคั่นย่อหน้า");
check(para[0].kind === "para" && para[0].lines.length === 2, "การขึ้นบรรทัดใหม่ในย่อหน้าเดียวกันยังอยู่");

check(parseNote("").length === 0, "ข้อความว่างไม่มีบล็อกเลย");
check(parseNote("   \n  \n").length === 0, "มีแต่ช่องว่างก็ไม่มีบล็อก");

// \r\n จากคนที่ก๊อปมาจาก Notepad หรือไฟล์ของ Windows ต้องไม่ทำให้ fence เพี้ยน
const crlf = parseNote("ก\r\n```sql\r\nselect 1;\r\n```\r\n");
check(crlf.length === 2 && crlf[1].kind === "code" && crlf[1].code === "select 1;", "ขึ้นบรรทัดแบบ Windows อ่านได้เหมือนกัน");

section("ข้อความย่อในแถวรายการ");

check(
  noteSummary("อธิบายสั้น ๆ\n```sql\nselect * from a;\n```") === "อธิบายสั้น ๆ",
  "ข้อความย่อตัดเนื้อโค้ดออก",
);
check(noteSummary("ใช้ `tag` นี้") === "ใช้ tag นี้", "ข้อความย่อถอดเครื่องหมายออก");
check(noteSummary(null) === "", "ไม่มีรายละเอียด = ข้อความย่อว่าง");
check(noteSummary("ก".repeat(200), 20).length === 20, "ข้อความย่อยาวเกินถูกตัดตามความยาวที่สั่ง");

/* ---------------- แป้นเครื่องมือ ---------------- */

/** ลงมือแก้จริงเหมือนที่คอมโพเนนต์ทำ แล้วคืนข้อความใหม่กับช่วงที่เลือก */
function apply(value: string, edit: ReturnType<typeof wrapInline>) {
  const next = value.slice(0, edit.from) + edit.insert + value.slice(edit.to);
  return { next, selected: next.slice(edit.selStart, edit.selEnd) };
}

section("ครอบเครื่องหมาย");

{
  const v = "ใช้ตาราง plant_tags นะ";
  const r = apply(v, wrapInline(v, 9, 19, "`"));
  check(r.next === "ใช้ตาราง `plant_tags` นะ", "ครอบข้อความที่เลือกด้วย backtick");
  check(r.selected === "plant_tags", "หลังครอบแล้วยังเลือกเนื้อในไว้เหมือนเดิม");
}

{
  // กดซ้ำที่เดิม = ถอดออก ทั้งแบบเลือกเฉพาะเนื้อในและแบบเลือกคลุมเครื่องหมาย
  const v = "ใช้ `plant_tags` นะ";
  const inner = apply(v, wrapInline(v, 5, 15, "`"));
  check(inner.next === "ใช้ plant_tags นะ", "กดซ้ำตอนเลือกเนื้อใน = ถอดเครื่องหมายออก");

  const outer = apply(v, wrapInline(v, 4, 16, "`"));
  check(outer.next === "ใช้ plant_tags นะ", "กดซ้ำตอนเลือกคลุมเครื่องหมาย = ถอดออกเหมือนกัน");
}

{
  const v = "";
  const e = wrapInline(v, 0, 0, "**");
  const r = apply(v, e);
  check(r.next === "****", "ไม่ได้เลือกอะไร = ใส่เครื่องหมายเปล่า");
  check(e.selStart === 2 && e.selEnd === 2, "เคอร์เซอร์ไปรออยู่ตรงกลางเครื่องหมาย");
}

section("บล็อกโค้ด");

{
  const v = "select 1;";
  const e = fenceBlock(v, 0, 9, "sql");
  const r = apply(v, e);
  check(r.next === "```sql\nselect 1;\n```", "ครอบทั้งบรรทัดเป็นบล็อกโค้ดพร้อมชื่อภาษา");
  check(r.selected === "select 1;", "หลังครอบแล้วยังเลือกเนื้อโค้ดไว้");
  check(parseNote(r.next)[0].kind === "code", "ผลลัพธ์ถูกตัวแปลงอ่านว่าเป็นโค้ดจริง");
}

{
  // ลากไม่เต็มบรรทัดก็ต้องได้ทั้งบรรทัด ไม่งั้น ``` จะไปแทรกกลางบรรทัด
  // แล้วตัวแปลงจะไม่เห็นว่าเป็น fence — อาการคือ "กดปุ่มแล้วไม่ขึ้นเป็นโค้ด"
  const v = "คำสั่ง: ls -la";
  const r = apply(v, fenceBlock(v, 9, 11));
  check(r.next === "```\nคำสั่ง: ls -la\n```", "ลากกลางบรรทัดก็ครอบทั้งบรรทัดให้");
}

{
  const v = "ก่อน\nกลาง\nหลัง";
  const r = apply(v, fenceBlock(v, 5, 9));
  check(r.next === "ก่อน\n\n```\nกลาง\n```\n\nหลัง", "บล็อกที่แทรกกลางมีบรรทัดคั่นทั้งบนและล่าง");
  check(parseNote(r.next).map((b) => b.kind).join(",") === "para,code,para", "ของรอบ ๆ ยังเป็นย่อหน้าเหมือนเดิม");
}

section("รายการ");

{
  const v = "หนึ่ง\nสอง";
  const r = apply(v, bulletLines(v, 0, v.length));
  check(r.next === "- หนึ่ง\n- สอง", "ใส่จุดนำหน้าให้ทุกบรรทัดที่เลือก");

  const back = apply(r.next, bulletLines(r.next, 0, r.next.length));
  check(back.next === v, "กดซ้ำ = ถอดจุดนำหน้าออกกลับเป็นเดิม");
}

{
  // บรรทัดว่างต้องไม่ได้จุดนำหน้า ไม่งั้นจะได้รายการเปล่าโผล่มา
  const v = "หนึ่ง\n\nสอง";
  const r = apply(v, bulletLines(v, 0, v.length));
  check(r.next === "- หนึ่ง\n\n- สอง", "บรรทัดว่างไม่ได้จุดนำหน้า");
}

/* ---------------- path ของไฟล์แนบ ---------------- */

/**
 * ⚠️ ข้อที่ห้ามพังที่สุดในหมวดนี้: **โฟลเดอร์แรกต้องเป็น project_id เป๊ะ ๆ**
 *
 * policy ของ storage.objects ใน 0009 อ่านสิทธิ์จาก split_part(name, '/', 1)
 * ถ้าวันหนึ่งมีใครแก้ storageKey แล้วโฟลเดอร์แรกเพี้ยนไป
 * ผลไม่ใช่ "อัปไม่ได้" แต่เป็น **สิทธิ์ถูกอ่านผิด** ซึ่งร้ายแรงกว่ามาก
 */
section("path ของไฟล์แนบ");

const PID = "123e4567-e89b-12d3-a456-426614174000";

for (const name of ["คู่มือใช้งานหน้างาน.pdf", "screenshot 2026-08-22.PNG", "ไฟล์ไทยล้วน", "a.tar.gz"]) {
  const key = storageKey(PID, name, "UNIQ", "tasks");
  check(key.split("/")[0] === PID, `โฟลเดอร์แรกเป็น project_id — ${name}`);
  check(key.split("/")[1] === "tasks", `ชั้นที่สองเป็น tasks แยกจากไฟล์ส่งมอบ — ${name}`);
  check(/^[ -~]+$/.test(key), `key เป็น ascii ล้วน storage-api จึงไม่ปฏิเสธ — ${name}`);
}

// ชื่อไฟล์ที่พยายามไต่ออกจากโฟลเดอร์ตัวเองต้องกลายเป็นชื่อธรรมดา ไม่ใช่เส้นทางจริง
{
  const key = storageKey(PID, "../../etc/passwd", "UNIQ", "tasks");
  check(key === `${PID}/tasks/UNIQ-file.etc-passwd`, "ชื่อไฟล์ที่มี ../ ถูกยุบเป็นชื่อธรรมดา ไต่ออกนอกโฟลเดอร์ไม่ได้");
  check(key.split("/").length === 3, "ไม่มี slash เกินมาจากชื่อไฟล์");
}

// ของส่งมอบ (ไม่ส่ง group) ต้องได้ path ทรงเดิมเป๊ะ ๆ — ห้ามมี tasks/ โผล่มา
check(
  storageKey(PID, "doc.pdf", "UNIQ") === `${PID}/UNIQ-doc.pdf`,
  "ไฟล์ส่งมอบยังได้ path ทรงเดิม การเพิ่ม group ไม่ไปกวนของเดิม",
);

/* ---------------- จัดของลงหมวด ---------------- */

/**
 * ตรรกะนี้ใช้ร่วมกันระหว่างงาน (0014) กับไดอะแกรม (0021)
 * และมีกับดักที่พังแบบไม่ error: ของที่ชี้หมวดซึ่งหาไม่เจอ **หายจากทุกมุมมอง**
 * ต้องมีข้อตรวจไว้ตลอดไป เพราะไม่มีทางสังเกตเห็นเองจนกว่าจะมีคนทัก
 */
section("จัดของลงหมวด");

type G = { id: string; name: string; sort: number };
type I = { id: string; group_id: string | null };

const gs: G[] = [
  { id: "g2", name: "ข", sort: 2 },
  { id: "g1", name: "ก", sort: 1 },
];
const withGroup = (id: string, group_id: string | null): I => ({ id, group_id });

{
  const items = [withGroup("a", "g1"), withGroup("b", "g2"), withGroup("c", null)];
  const out = bucketBy(items, gs, (i) => i.group_id);

  same(out.map((b) => b.group?.id ?? "ไม่มีหมวด"), ["g1", "g2", "ไม่มีหมวด"], "เรียงตาม sort แล้วปิดท้ายด้วยถังไม่มีหมวด");
  same(out.map((b) => b.items.map((i) => i.id)), [["a"], ["b"], ["c"]], "ของเข้าถังถูกใบ");
}

{
  // ⚠️ ข้อสำคัญที่สุดของหมวดนี้
  const items = [withGroup("a", "g1"), withGroup("ผี", "หมวดที่ไม่มีจริง")];
  const out = bucketBy(items, gs, (i) => i.group_id);
  const seen = out.flatMap((b) => b.items.map((i) => i.id));

  check(seen.includes("ผี"), "ของที่ชี้หมวดแปลกปลอมยังโผล่ในถังท้าย ไม่หายเงียบ");
  check(seen.length === items.length, "ไม่มีของหายไประหว่างจัดถัง");
}

{
  const out = bucketBy([] as I[], gs, (i) => i.group_id);
  same(out.map((b) => b.group?.id), ["g1", "g2"], "หมวดที่ยังไม่มีของก็ยังถูกคืนมา ให้เห็นว่าตั้งไว้แล้ว");
  check(out.every((b) => b.items.length === 0), "หมวดว่างมี items เป็นรายการเปล่า");
}

{
  const items = [withGroup("a", "g1")];
  const out = bucketBy(items, gs, (i) => i.group_id);
  check(out.every((b) => b.group !== null), "ไม่มีของนอกหมวด = ไม่ต้องมีถังท้ายมาให้รก");
}

/* ---------------- เลื่อน/ซูมผัง ---------------- */

/**
 * ข้อที่ต้องจริงเสมอ: จุดที่อยู่ใต้เมาส์ต้องอยู่ที่เดิมหลังซูม
 * ถ้าผิด ภาพจะไถลหนีมือทุกครั้งที่หมุนล้อ ซึ่งไม่ error และคนใช้
 * จะอธิบายได้แค่ว่า "มันแปลก ๆ" — ต้องมีข้อตรวจกันไว้
 */
section("เลื่อน/ซูมผัง");

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

for (const [px, py] of [[0, 0], [120, 80], [640, 360]]) {
  for (const factor of [1.25, 1 / 1.25, 2, 0.5]) {
    const before = { x: -37, y: 21, k: 0.8 };
    const after = zoomAt(before, factor, px, py);
    const a = contentPointAt(before, px, py);
    const b = contentPointAt(after, px, py);
    check(near(a.x, b.x) && near(a.y, b.y), `ซูม ×${factor} ที่ (${px},${py}) แล้วจุดใต้เมาส์อยู่ที่เดิม`);
  }
}

{
  const v = zoomAt({ x: 0, y: 0, k: MAX_ZOOM }, 4, 50, 50);
  check(v.k === MAX_ZOOM, "ซูมเข้าเกินเพดานแล้วหยุดที่เพดาน");
  check(v.x === 0 && v.y === 0, "ซูมที่ไม่เปลี่ยนอัตราขยาย ต้องไม่ขยับภาพ");

  const out = zoomAt({ x: 0, y: 0, k: MIN_ZOOM }, 0.1, 50, 50);
  check(out.k === MIN_ZOOM, "ซูมออกเกินพื้นแล้วหยุดที่พื้น");
}

{
  // ผังใหญ่กว่ากรอบ → ต้องย่อลงและวางไว้กลาง
  // กรอบ 400x300 กับผัง 800x600: แนวนอนได้ 0.470 แนวตั้งได้ 0.460
  // ต้องเลือก 0.460 ไม่งั้นผังล้นออกนอกกรอบด้านบนล่าง
  const v = fitView({ width: 400, height: 300 }, { w: 800, h: 600 }, 24);
  check(v !== null, "คำนวณพอดีจอได้");
  if (v) {
    check(near(v.k, (300 - 24) / 600), "ย่อตามด้านที่คับที่สุด (รอบนี้คือแนวตั้ง)");
    check(near(v.x, (400 - 800 * v.k) / 2), "วางกลางแนวนอน");
    check(near(v.y, (300 - 600 * v.k) / 2), "วางกลางแนวตั้ง");
  }
}

{
  // สลับให้แนวนอนเป็นด้านที่คับ — กันเทสต์ข้างบนผ่านเพราะบังเอิญ
  const v = fitView({ width: 300, height: 900 }, { w: 800, h: 600 }, 24);
  if (v) check(near(v.k, (300 - 24) / 800), "ผังเตี้ยกว้าง ย่อตามแนวนอนแทน");

  // ผังเล็กกว่ากรอบมาก ๆ ก็ต้องไม่ถูกจับขยายจนเกินเพดาน
  const small = fitView({ width: 4000, height: 4000 }, { w: 10, h: 10 });
  if (small) check(small.k <= MAX_ZOOM, "ผังจิ๋วในกรอบใหญ่ ขยายได้ไม่เกินเพดาน");
}

check(fitView({ width: 400, height: 300 }, { w: 0, h: 0 }) === null, "ยังไม่รู้ขนาดผัง = ไม่คำนวณมั่ว");
check(fitView({ width: 0, height: 0 }, { w: 800, h: 600 }) === null, "กรอบยังไม่มีขนาด = ไม่คำนวณมั่ว");

/* ---------------- จัดโปรเจกต์เข้าลูกค้า ---------------- */

section("จัดโปรเจกต์เข้าลูกค้า");

{
  const mk = (id: string, name: string) => ({ id, name }) as Client;
  const pj = (id: string, name: string) => ({ id, slug: id, name, status: "building" }) as ClientProject;

  const cs = [mk("c2", "เคมีแมน"), mk("c1", "กรีนเทค")];
  const ps = [pj("p1", "WLOMS"), pj("p2", "CoreSync"), pj("p3", "ยังไม่จัด")];

  const out = groupProjectsByClient(ps, cs, { p1: "c2", p2: "c1" });

  same(out.map((b) => b.client?.name ?? "ยังไม่จัด"), ["กรีนเทค", "เคมีแมน", "ยังไม่จัด"], "เรียงชื่อลูกค้าแบบไทย แล้วปิดท้ายด้วยถังยังไม่จัด");
  same(out.map((b) => b.items.map((p) => p.id)), [["p2"], ["p1"], ["p3"]], "โปรเจกต์เข้าเจ้าถูกคน");
}

{
  // ⚠️ ถังยังไม่จัดต้องมีเสมอ ต่างจาก bucketBy ของงาน/ผัง
  // หน้านี้ต้องตอบได้ว่า "จัดครบแล้ว" ไม่ใช่แค่ไม่มีถังให้ดู
  const cs = [{ id: "c1", name: "ก" } as Client];
  const out = groupProjectsByClient([{ id: "p1", slug: "p1", name: "x", status: "shipped" } as ClientProject], cs, { p1: "c1" });
  check(out.at(-1)?.client === null, "ถังยังไม่จัดยังอยู่แม้จัดครบแล้ว");
  check(out.at(-1)?.items.length === 0, "และเป็นถังเปล่า");
}

{
  // โปรเจกต์ที่ชี้ลูกค้าซึ่งโหลดมาไม่เจอ ต้องไม่หายไปเฉย ๆ
  const cs = [{ id: "c1", name: "ก" } as Client];
  const ps = [{ id: "ผี", slug: "x", name: "x", status: "building" } as ClientProject];
  const out = groupProjectsByClient(ps, cs, { ผี: "ลูกค้าที่ไม่มีจริง" });
  check(out.flatMap((b) => b.items).some((p) => p.id === "ผี"), "โปรเจกต์ที่ชี้ลูกค้าแปลกปลอมตกลงถังท้าย ไม่หายเงียบ");
}

console.log(
  failures === 0
    ? `รายละเอียดงาน: ผ่าน ${checks} ข้อ`
    : `รายละเอียดงาน: ไม่ผ่าน ${failures} จาก ${checks} ข้อ`,
);
process.exit(failures === 0 ? 0 : 1);
