/**
 * รายละเอียดของงาน — รูปแบบข้อความและตัวช่วยของแป้นเครื่องมือ
 *
 * ---------------------------------------------------------------------------
 * ทำไมไม่ใช้ rich text editor สำเร็จรูป
 *
 * งานในโปรเจกต์นี้พก endpoint, payload, คำสั่ง shell มาด้วยเกือบทุกงาน
 * สิ่งที่ต้องการจริง ๆ จึงมีแค่ "ตรงนี้เป็นโค้ด ห้ามจัดรูปแบบ" ไม่ใช่ตัวหนังสือสวย
 * และ editor สำเร็จรูปเก็บของเป็น HTML หรือ JSON ทรงเฉพาะตัว
 * ซึ่งแปลว่าวันที่อยากย้ายเจ้า หรือแค่อยาก grep หาใน DB ก็ทำไม่ได้แล้ว
 *
 * ที่นี่จึงเก็บเป็น **ข้อความดิบ** แล้วตีความด้วยกฎแคบ ๆ สามข้อ:
 *   ```โค้ด```   คั่นบรรทัด = บล็อกโค้ด (ใส่ชื่อภาษาต่อท้าย ``` ได้)
 *   `โค้ด`       ในบรรทัด
 *   **ตัวหนา**
 *
 * ⚠️ ตัวแปลงคืน "โครงสร้าง" ไม่ใช่ HTML — ฝั่งที่แสดงผลเอาไป render เป็น
 * element ของ React ตรง ๆ ไม่มี dangerouslySetInnerHTML สักที่ในทางเดินนี้
 * ผู้ใช้จะพิมพ์ <script> หรืออะไรลงไปก็ได้ มันเป็นได้แค่ตัวหนังสือเสมอ
 * (ตั้งใจไม่รองรับลิงก์แบบ [ชื่อ](url) ด้วยเหตุผลเดียวกัน — href คือช่องทางเดียว
 *  ที่ข้อความของผู้ใช้กลายเป็นสิ่งที่กดแล้วทำงานได้ ยังไม่มีใครขอ ก็ยังไม่เปิด)
 * ---------------------------------------------------------------------------
 */

/** ต้องตรงกับ CHECK project_tasks_description_len ใน migration 0019 */
export const MAX_NOTE_CHARS = 20000;

export type NoteSpan =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "bold"; text: string };

export type NoteBlock =
  /** บล็อกโค้ด — `lang` ไว้โชว์เป็นป้ายมุมขวา ไม่ได้เอาไปทำ syntax highlight */
  | { kind: "code"; lang: string | null; code: string }
  | { kind: "bullets"; items: NoteSpan[][] }
  /** ย่อหน้า — เก็บเป็นรายบรรทัด เพราะการขึ้นบรรทัดใหม่ในคำอธิบายงานมีความหมาย */
  | { kind: "para"; lines: NoteSpan[][] };

const FENCE = /^\s*```(.*)$/;
const BULLET = /^\s*[-*]\s+(.*)$/;

/**
 * ชื่อภาษาที่ยอมรับ — จำกัดชุดอักขระเพราะค่านี้ถูกเอาไปแสดงเป็นป้าย
 * ผู้ใช้พิมพ์อะไรต่อท้าย ``` ก็ได้ ถ้าไม่เข้าเกณฑ์ก็ถือว่าไม่ได้ระบุภาษา
 */
function cleanLang(raw: string): string | null {
  const s = raw.trim();
  return /^[A-Za-z0-9+#._-]{1,20}$/.test(s) ? s : null;
}

/**
 * ตัดข้อความหนึ่งบรรทัดเป็นช่วง ๆ ตามเครื่องหมาย
 *
 * โค้ดในบรรทัดมาก่อนตัวหนาโดยตั้งใจ — `**ไม่ใช่ตัวหนา**` ที่อยู่ในเครื่องหมาย
 * backtick ต้องออกมาเป็นตัวอักษรตามที่พิมพ์ ไม่ใช่ถูกจัดรูปแบบ
 * (regex ตัวเดียวเรียงสลับกันจึงพอ ตัวที่เจอก่อนในสายอักขระชนะเสมอ)
 */
export function parseSpans(line: string): NoteSpan[] {
  const out: NoteSpan[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;

  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) out.push({ kind: "text", text: line.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "code", text: m[1] });
    else out.push({ kind: "bold", text: m[2] });
    last = m.index + m[0].length;
  }

  if (last < line.length) out.push({ kind: "text", text: line.slice(last) });
  return out.length > 0 ? out : [{ kind: "text", text: line }];
}

/** แปลงข้อความดิบเป็นบล็อก — ตัวเดียวที่รู้กฎของรูปแบบนี้ */
export function parseNote(raw: string): NoteBlock[] {
  const lines = (raw ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: NoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const fence = FENCE.exec(lines[i]);

    if (fence) {
      const lang = cleanLang(fence[1]);
      const body: string[] = [];
      i += 1;

      // ปิดด้วย ``` หรือจบข้อความ — **ที่ยังไม่ปิดถือว่าเป็นโค้ดจนจบ**
      // ไม่ใช่โยนทิ้งหรือถอยกลับเป็นข้อความธรรมดา เพราะระหว่างพิมพ์
      // ผู้ใช้ยังไม่ทันปิด fence ทุกครั้ง แล้วตัวอย่างจะกระพริบสลับไปมา
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // ข้ามบรรทัดปิด (หรือเลย EOF ไปเฉย ๆ ซึ่งลูปนอกจบพอดี)

      blocks.push({ kind: "code", lang, code: body.join("\n") });
      continue;
    }

    const bullet = BULLET.exec(lines[i]);
    if (bullet) {
      const items: NoteSpan[][] = [];
      while (i < lines.length) {
        const b = BULLET.exec(lines[i]);
        if (!b) break;
        items.push(parseSpans(b[1]));
        i += 1;
      }
      blocks.push({ kind: "bullets", items });
      continue;
    }

    if (lines[i].trim() === "") {
      i += 1;
      continue;
    }

    const para: NoteSpan[][] = [];
    while (i < lines.length && lines[i].trim() !== "" && !FENCE.test(lines[i]) && !BULLET.test(lines[i])) {
      para.push(parseSpans(lines[i]));
      i += 1;
    }
    blocks.push({ kind: "para", lines: para });
  }

  return blocks;
}

/**
 * ข้อความสั้น ๆ ไว้แสดงในแถวรายการ — ตัดโค้ดออกทั้งบล็อก
 * บรรทัดแรกของโค้ดมักเป็น `import` หรือ `{` ซึ่งบอกอะไรไม่ได้เลยว่างานนี้เรื่องอะไร
 */
export function noteSummary(raw: string | null, max = 90): string {
  if (!raw) return "";

  const text = parseNote(raw)
    .flatMap((b) => {
      if (b.kind === "code") return [];
      const lines = b.kind === "para" ? b.lines : b.items;
      return lines.map((spans) => spans.map((s) => s.text).join(""));
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/* ============================================================
   แป้นเครื่องมือ — คิดว่าจะแทนที่ช่วงไหนด้วยอะไร แล้วเคอร์เซอร์ไปอยู่ตรงไหน
   แยกออกมาจากคอมโพเนนต์เพราะเป็นตรรกะล้วน ๆ ที่ไม่ต้องพึ่ง DOM
   ============================================================ */

export type NoteEdit = {
  /** ช่วงในข้อความเดิมที่จะถูกแทนที่ */
  from: number;
  to: number;
  insert: string;
  /** ตำแหน่งที่เลือกไว้หลังแก้เสร็จ — นับจากข้อความ **ใหม่** */
  selStart: number;
  selEnd: number;
};

/**
 * ครอบข้อความที่เลือกด้วยเครื่องหมาย — กดซ้ำที่เดิมคือถอดออก
 * ไม่ได้เลือกอะไรไว้ = ใส่เครื่องหมายเปล่าแล้ววางเคอร์เซอร์ไว้ตรงกลาง
 */
export function wrapInline(value: string, start: number, end: number, mark: string): NoteEdit {
  const len = mark.length;
  const selected = value.slice(start, end);

  if (selected.length === 0) {
    return { from: start, to: end, insert: mark + mark, selStart: start + len, selEnd: start + len };
  }

  // ครอบไว้อยู่แล้ว → ถอดออก ทั้งแบบที่เครื่องหมายอยู่นอกช่วงที่เลือก
  // (คนเลือกเฉพาะเนื้อใน) และแบบที่เลือกคลุมเครื่องหมายมาด้วย
  if (value.slice(start - len, start) === mark && value.slice(end, end + len) === mark) {
    return { from: start - len, to: end + len, insert: selected, selStart: start - len, selEnd: start - len + selected.length };
  }
  if (selected.startsWith(mark) && selected.endsWith(mark) && selected.length > len * 2) {
    const inner = selected.slice(len, -len);
    return { from: start, to: end, insert: inner, selStart: start, selEnd: start + inner.length };
  }

  return { from: start, to: end, insert: mark + selected + mark, selStart: start + len, selEnd: start + len + selected.length };
}

/** ขยายช่วงที่เลือกให้ครอบคลุมทั้งบรรทัดหัวและท้าย */
function lineRange(value: string, start: number, end: number): [number, number] {
  const from = value.lastIndexOf("\n", start - 1) + 1;
  const nl = value.indexOf("\n", end);
  return [from, nl === -1 ? value.length : nl];
}

/**
 * เปลี่ยนบรรทัดที่เลือกเป็นบล็อกโค้ด
 *
 * ทำงานทีละบรรทัดเต็ม ไม่ใช่ตามช่วงที่ลากพอดี เพราะ ``` ต้องอยู่บรรทัดของตัวเอง
 * ถ้าครอบกลางบรรทัด ตัวแปลงจะไม่เห็นว่าเป็น fence แล้วผู้ใช้จะงงว่าทำไมไม่ขึ้น
 */
export function fenceBlock(value: string, start: number, end: number, lang = ""): NoteEdit {
  const [from, to] = lineRange(value, start, end);
  const body = value.slice(from, to);

  const before = from > 0 ? "\n" : "";
  const after = to < value.length ? "\n" : "";
  const open = "```" + lang;
  const insert = `${before}${open}\n${body}\n\`\`\`${after}`;

  // ไม่ได้เลือกอะไร = เพิ่งสร้างบล็อกเปล่า ให้เคอร์เซอร์ไปรอในบล็อกเลย
  const bodyAt = from + before.length + open.length + 1;
  return {
    from,
    to,
    insert,
    selStart: bodyAt,
    selEnd: bodyAt + body.length,
  };
}

/** ใส่/ถอดจุดนำหน้าทุกบรรทัดที่เลือก */
export function bulletLines(value: string, start: number, end: number): NoteEdit {
  const [from, to] = lineRange(value, start, end);
  const lines = value.slice(from, to).split("\n");
  const allBulleted = lines.every((l) => l.trim() === "" || BULLET.test(l));

  const next = lines
    .map((l) => {
      if (l.trim() === "") return l;
      if (allBulleted) return l.replace(/^(\s*)[-*]\s+/, "$1");
      return `- ${l}`;
    })
    .join("\n");

  return { from, to, insert: next, selStart: from, selEnd: from + next.length };
}
