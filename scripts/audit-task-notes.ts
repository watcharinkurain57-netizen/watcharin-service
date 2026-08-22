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

console.log(
  failures === 0
    ? `รายละเอียดงาน: ผ่าน ${checks} ข้อ`
    : `รายละเอียดงาน: ไม่ผ่าน ${failures} จาก ${checks} ข้อ`,
);
process.exit(failures === 0 ? 0 : 1);
