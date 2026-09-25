/**
 * เนื้อหาของหน้า /ai-map — แผนที่คำศัพท์ AI Engineering ที่กดดูทีละหัวข้อได้
 *
 * เก็บไว้ที่เดียวทั้งหมด ทั้งตัวแผนที่ แผงรายละเอียด และส่วนอื่นของหน้า
 * อ่านจากตรงนี้ชุดเดียว เวลาแก้คำอธิบายจะได้ไม่ต้องไล่แก้หลายไฟล์
 *
 * ข้อความในเครื่องหมาย `...` จะแสดงเป็นโค้ด (ดู RichText ในคอมโพเนนต์)
 */

export const UPDATED = "ก.ย. 2026";

export const TOPIC_IDS = [
  "ai-gateway",
  "guardrails",
  "observability",
  "evaluation",
  "cost-optimization",
  "agentic-ai",
  "multi-agent",
  "graph-engineering",
  "loop-engineering",
  "harness",
  "context-engineering",
  "memory",
  "rag",
  "vector-db",
  "function-calling",
  "tool-use",
  "mcp",
  "stateless-mcp",
  "prompt-optimization",
  "fine-tuning",
  "synthetic-data",
  "distillation",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

const TOPIC_ID_SET: ReadonlySet<string> = new Set(TOPIC_IDS);

/** ค่าที่มาจาก URL หรือ localStorage เชื่อไม่ได้ — ต้องผ่านตัวนี้ก่อนใช้เป็น TopicId */
export function isTopicId(value: unknown): value is TopicId {
  return typeof value === "string" && TOPIC_ID_SET.has(value);
}

export type LayerId = "production" | "system" | "control" | "harness" | "model";

export type Layer = {
  id: LayerId;
  no: number;
  name: string;
  th: string;
  blurb: string;
  rows: { label?: string; topics: TopicId[] }[];
};

export type Topic = {
  id: TopicId;
  name: string;
  full?: string;
  layer: LayerId;
  /** บรรทัดสั้นใต้ชื่อบนแผนที่ */
  tagline: string;
  /** คำที่เพิ่งเกิดหรือเพิ่งเปลี่ยน — ติดป้ายให้เห็นว่าเป็นของใหม่ */
  badge?: string;
  what: string;
  use: string;
  extra?: { title: string; items: string[] };
  pros: string[];
  cons: string[];
  /** เทียบกับพนักงานใหม่ในบริษัท */
  analogy: string;
  note?: string;
  examples?: string;
  links: { to: TopicId; why: string }[];
};

/**
 * เรียงจากบนลงล่างแบบ stack — ชั้นล่างสุดคือโมเดล ชั้นบนสุดคือส่วนที่ขึ้นใช้งานจริง
 * ลำดับนี้คือลำดับบนหน้าจอ และคือลำดับของปุ่ม ก่อนหน้า / ถัดไป ด้วย
 */
export const LAYERS: Layer[] = [
  {
    id: "production",
    no: 5,
    name: "Production",
    th: "ขึ้นใช้งานจริง",
    blurb: "รั้ว ตา และกระเป๋าเงินของระบบ",
    rows: [
      {
        topics: ["ai-gateway", "guardrails", "observability", "evaluation", "cost-optimization"],
      },
    ],
  },
  {
    id: "system",
    no: 4,
    name: "System",
    th: "ระบบเอเจนต์",
    blurb: "เอา agent หลายตัวหรือหลายลูปมาประกอบเป็นระบบ",
    rows: [{ topics: ["agentic-ai", "multi-agent", "graph-engineering"] }],
  },
  {
    id: "control",
    no: 3,
    name: "Control",
    th: "วงจรควบคุม",
    blurb: "ทำ → ตรวจ → แก้ → หยุด โดยไม่ต้องมีคนพิมพ์สั่งทีละรอบ",
    rows: [{ topics: ["loop-engineering"] }],
  },
  {
    id: "harness",
    no: 2,
    name: "Harness",
    th: "ทุกอย่างรอบโมเดล",
    blurb: "ความรู้ ความจำ และมือของ AI",
    rows: [
      { topics: ["harness"] },
      { label: "ความรู้และความจำ", topics: ["context-engineering", "memory", "rag", "vector-db"] },
      { label: "มือของ AI", topics: ["function-calling", "tool-use", "mcp", "stateless-mcp"] },
    ],
  },
  {
    id: "model",
    no: 1,
    name: "Model",
    th: "สมองและการปรับแต่ง",
    blurb: "ตัวโมเดล และวิธีทำให้มันเก่งงานของเรา",
    rows: [
      { topics: ["prompt-optimization", "fine-tuning", "synthetic-data", "distillation"] },
    ],
  },
];

export const LAYER_BY_ID: Record<LayerId, Layer> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l])
) as Record<LayerId, Layer>;

/** ลำดับเดียวกับที่เห็นบนแผนที่ — ใช้กับปุ่ม ก่อนหน้า / ถัดไป */
export const TOPIC_ORDER: TopicId[] = LAYERS.flatMap((l) => l.rows.flatMap((r) => r.topics));

const TOPIC_LIST: Topic[] = [
  // ---------- ชั้น 5 · Production ----------
  {
    id: "ai-gateway",
    name: "AI Gateway",
    layer: "production",
    tagline: "ประตูกลางที่คุมการเรียกโมเดลทุกค่าย",
    what: "Proxy กลางระหว่างแอปกับผู้ให้บริการโมเดลทุกค่าย ใช้ API เดียวเรียกได้หลายค่าย และสลับไปค่ายสำรองอัตโนมัติเมื่อค่ายหนึ่งล่ม",
    use: "องค์กรที่ใช้หลายโมเดลหรือหลายทีม และระบบที่ต้องการ uptime สูง",
    extra: {
      title: "ทำอะไรได้บ้าง",
      items: [
        "เรียกหลายค่ายผ่าน API เดียว และสลับไปค่ายสำรองเมื่อล่ม (fallback)",
        "rate limit, เก็บ API key ไว้ที่เดียว และตั้งงบรายทีม",
        "cache และ log ทุก request",
        "ใส่ guardrails ไว้จุดเดียว ใช้ได้กับทุกแอป",
        "MCP gateway — คุมว่าใครใช้ MCP server ไหนได้",
      ],
    },
    pros: [
      "ไม่ผูกติดค่ายเดียว เปลี่ยนโมเดลได้โดยไม่ต้องแก้แอป",
      "ระบบทนขึ้น เพราะมีค่ายสำรอง",
      "คุมต้นทุนและความปลอดภัยได้จากจุดเดียว",
    ],
    cons: [
      "เพิ่ม latency อีกหนึ่งทอด และกลายเป็นจุดตายจุดเดียว",
      "API กลางอาจเข้าไม่ถึงฟีเจอร์เฉพาะค่าย เช่น prompt caching แบบละเอียด ระดับการคิด หรือ tools พิเศษ",
      "ถ้าใช้แบบ SaaS ข้อมูลต้องผ่านบุคคลที่สาม",
    ],
    analogy: "ประตูหน้าบริษัทที่คุมการใช้โมเดลทุกค่าย",
    examples: "LiteLLM, Portkey, OpenRouter, Cloudflare AI Gateway, Vercel AI Gateway",
    links: [
      { to: "guardrails", why: "วาง guardrails ไว้ที่ gateway จุดเดียว ครอบได้ทุกแอป" },
      { to: "cost-optimization", why: "ตั้งงบ ทำ cache และเลือกโมเดลตามราคาได้ที่นี่" },
      { to: "observability", why: "ทุก request ผ่าน gateway จึงเก็บ log ได้ครบ" },
      {
        to: "stateless-mcp",
        why: "header ใหม่ของ MCP (`Mcp-Method` / `Mcp-Name`) ทำมาให้ gateway route ได้โดยไม่ต้องแกะ JSON",
      },
    ],
  },
  {
    id: "guardrails",
    name: "Guardrails",
    layer: "production",
    tagline: "รั้วกันพลาด ทั้งขาเข้า ขาออก และการกระทำ",
    what: "รั้วรอบ AI ที่คอยตรวจและกั้น ทั้งสิ่งที่ผู้ใช้ส่งเข้ามา สิ่งที่ AI ตอบออกไป และสิ่งที่ AI กำลังจะลงมือทำ",
    use: "แชตบอตองค์กร ระบบที่ต้องผ่าน compliance เช่น PDPA และ agent ที่มีสิทธิ์ทำรายการจริง",
    extra: {
      title: "รั้ว 3 จุด",
      items: [
        "ขาเข้า — ตรวจ prompt injection และ jailbreak, กรองหัวข้อต้องห้าม, ปิดบังข้อมูลส่วนบุคคล",
        "ขาออก — ตรวจเนื้อหา ตรวจ schema ตรวจว่าอ้างอิงเอกสารจริง และกันข้อมูลลับหลุด",
        "การกระทำ — ให้สิทธิ์ tool เท่าที่จำเป็น ใช้ sandbox และให้คนอนุมัติก่อนทำสิ่งที่ย้อนไม่ได้ เช่น โอนเงิน ลบข้อมูล ส่งอีเมล",
      ],
    },
    pros: ["ปลอดภัย และผ่าน compliance", "ป้องกันความเสียหายทั้งด้านเงินและแบรนด์"],
    cons: [
      "บล็อกผิด (false positive) จนผู้ใช้หงุดหงิดได้",
      "เพิ่ม latency และค่าใช้จ่าย",
      "ไม่มีอะไรกัน prompt injection ได้ 100% จึงต้องวางหลายชั้น",
    ],
    analogy: "กฎระเบียบ ขั้นตอนอนุมัติ และรั้วกันตก",
    note: "กฎจำง่าย “Lethal Trifecta” — ถ้า agent (1) เข้าถึงข้อมูลลับ (2) อ่านเนื้อหาจากคนนอก และ (3) ส่งข้อมูลออกไปข้างนอกได้ ครบ 3 ข้อเมื่อไหร่ ความเสี่ยงข้อมูลรั่วจะสูงมาก ให้ตัดข้อใดข้อหนึ่งออก",
    examples: "NeMo Guardrails, Guardrails AI, Llama Guard, Bedrock Guardrails",
    links: [
      { to: "tool-use", why: "ยิ่ง tool ทำได้มาก ยิ่งต้องมีรั้วด้านการกระทำ" },
      { to: "mcp", why: "MCP server ที่ไม่น่าไว้ใจคือช่องโหว่ ต้องคุมสิทธิ์" },
      { to: "rag", why: "เอกสารที่ดึงมาอาจแฝง prompt injection" },
      { to: "memory", why: "กัน memory poisoning และข้อมูลส่วนบุคคลในความจำ" },
      { to: "ai-gateway", why: "วางไว้ที่ gateway เพื่อครอบทุกแอป" },
    ],
  },
  {
    id: "observability",
    name: "Observability",
    layer: "production",
    tagline: "กล้องวงจรปิด + บันทึกทุกขั้นของ AI",
    what: "เก็บ trace ทุกขั้นของ AI ได้แก่ prompt ที่ส่งจริง คำตอบ tool calls เอกสารที่ดึงมา token latency ค่าใช้จ่าย error และ feedback แล้วย้อนดูได้ทีละ step (มีมาตรฐาน OpenTelemetry GenAI)",
    use: "ตอบคำถามแบบ “ทำไมเมื่อวานมันตอบแบบนั้น” ดูต้นทุนราย feature หรือราย user และเก็บเคสจริงไปทำชุด eval",
    pros: [
      "debug ระบบที่ตอบไม่เหมือนเดิมทุกครั้งได้",
      "เจอปัญหาก่อนลูกค้าบ่น",
      "เป็นวัตถุดิบของ eval และการปรับปรุงรอบถัดไป",
    ],
    cons: [
      "log เต็มไปด้วยข้อมูลส่วนบุคคล ต้อง mask และกำหนดอายุการเก็บตาม PDPA",
      "trace ของ agent ยาวมาก ค่าเก็บบานเร็ว",
      "ถ้าไม่มี alert หรือ eval ต่อท้าย ข้อมูลก็กองอยู่เฉย ๆ",
    ],
    analogy: "กล้องวงจรปิด + บันทึกการทำงาน",
    examples: "Langfuse (open-source), LangSmith, Arize Phoenix, Helicone, Datadog",
    links: [
      { to: "evaluation", why: "trace จริงคือแหล่งเคสทดสอบที่ดีที่สุด" },
      { to: "cost-optimization", why: "เห็นว่าเงินหมดไปกับขั้นไหน ก่อนตัดสินใจลด" },
      { to: "loop-engineering", why: "ดูได้ว่าลูปวนกี่รอบ และติดตรงไหน" },
      { to: "ai-gateway", why: "gateway คือจุดเก็บ log ที่ครบที่สุด" },
    ],
  },
  {
    id: "evaluation",
    name: "Evaluation Frameworks",
    layer: "production",
    tagline: "ข้อสอบและ KPI ที่รันซ้ำได้",
    what: "ระบบวัดคุณภาพที่รันซ้ำได้ ประกอบด้วยชุดทดสอบ (golden dataset) กับตัวให้คะแนน แบ่งเป็น offline (ก่อน deploy) และ online (จากทราฟฟิกจริง)",
    use: "ตัดสินว่าจะเปลี่ยนโมเดลหรือ prompt ได้ไหม และจับ regression ก่อน deploy",
    extra: {
      title: "ตัวให้คะแนน และเรื่องของ agent",
      items: [
        "ใช้โค้ดตรวจ — exact match, unit test, ตรวจ schema",
        "LLM-as-a-Judge — ให้ LLM ให้คะแนนตาม rubric",
        "คนตรวจ — แม่นที่สุด แต่แพงและช้าที่สุด",
        "agent ต้องวัดทั้งผลลัพธ์และเส้นทาง (ใช้ tool ถูกไหม กี่ขั้น เสียเงินเท่าไหร่) และรันหลายรอบ — pass@k คือสำเร็จอย่างน้อย 1 ใน k ครั้ง ส่วน pass^k คือสำเร็จครบทุกครั้ง",
      ],
    },
    pros: [
      "รู้จริงว่าเปลี่ยนแล้วดีขึ้นหรือแย่ลง",
      "เป็นฐานของ prompt optimization, fine-tuning และตัวตรวจใน loop",
    ],
    cons: [
      "ชุดทดสอบดี ๆ สร้างยาก",
      "LLM judge มี bias — ชอบคำตอบยาว ชอบตัวเลือกแรก ชอบโมเดลตัวเอง",
      "benchmark สาธารณะอิ่มตัว หรือรั่วเข้าข้อมูล train",
      "คะแนนดีไม่ได้แปลว่าผู้ใช้พอใจ",
    ],
    analogy: "การสอบและ KPI",
    note: "คำว่า “eval harness” (เช่น lm-evaluation-harness) คือโครงสำหรับรันชุดทดสอบ — คนละความหมายกับ agent harness",
    examples: "promptfoo, DeepEval, Ragas, Inspect, LangSmith, Braintrust, Langfuse",
    links: [
      { to: "loop-engineering", why: "ตัวตรวจในลูปก็คือ eval ขนาดย่อม" },
      { to: "prompt-optimization", why: "ไม่มี eval ก็ optimize ไม่ได้ ได้แต่รู้สึกว่าดีขึ้น" },
      { to: "fine-tuning", why: "ใช้วัดว่าโมเดลที่ train แล้วดีขึ้นจริงไหม" },
      { to: "synthetic-data", why: "สร้างเคสทดสอบและ edge case เพิ่มได้" },
      { to: "observability", why: "ดึงเคสจริงจาก trace มาเป็นชุดทดสอบ" },
    ],
  },
  {
    id: "cost-optimization",
    name: "Cost Optimization",
    layer: "production",
    tagline: "คุมงบ โดยไม่ให้คุณภาพตก",
    what: "การลดต้นทุน ซึ่งคิดคร่าว ๆ ได้ว่า token (input + output) × ราคาโมเดล × จำนวนรอบ",
    use: "ระบบที่มีคนใช้เยอะ agent ที่วนหลายรอบ และงานประมวลผลเอกสารจำนวนมาก",
    extra: {
      title: "7 วิธี เรียงจากได้ฟรีไปจนถึงต้องแลก",
      items: [
        "Prompt caching — ส่วนต้นที่ซ้ำทุกครั้ง (system prompt, รายการ tools, เอกสารยาว) อ่านจาก cache ถูกลงราว 90% เช่นของ Claude อ่าน cache ≈ 0.1× ราคา input และเขียน cache ≈ 1.25×",
        "Batch API — งานไม่ด่วนส่งเป็นชุด ถูกลงราว 50%",
        "ลด context — ตัดของไม่จำเป็น ใช้ compaction และให้ tool คืนผลกระชับ",
        "คุมลูป — จำกัดจำนวนรอบและงบ token ของ agent",
        "ปรับระดับการคิด (effort) ตามความยากของงาน",
        "Model routing — งานง่ายใช้โมเดลเล็ก งานยากใช้โมเดลใหญ่ (วัดก่อน บางครั้งโมเดลเก่งที่ effort ต่ำคุ้มกว่า และ cache ใช้ข้ามโมเดลไม่ได้)",
        "Semantic cache, distill หรือ self-host เมื่อปริมาณงานสูงมาก",
      ],
    },
    pros: ["บิลลดได้หลายเท่า", "หลายเทคนิคทำให้เร็วขึ้นด้วย"],
    cons: [
      "ลดผิดจุดคุณภาพจะตก ต้องวัดด้วย eval ทุกครั้ง",
      "cache พังเงียบ ๆ ถ้าส่วนต้นของ prompt เปลี่ยน เช่น ใส่เวลาปัจจุบันไว้บนสุด",
      "semantic cache อาจตอบคำถามที่แค่คล้าย แต่ไม่ใช่คำถามเดียวกัน",
    ],
    analogy: "การคุมงบ",
    note: "หลักคิด: วัดต้นทุนต่องานที่สำเร็จ ไม่ใช่ต่อ request — request ที่ถูกแต่ต้องลองซ้ำหลายรอบ ไม่ได้ถูกจริง",
    links: [
      { to: "context-engineering", why: "context ที่สั้นและนิ่ง คือต้นทุนต่ำและ cache ได้" },
      { to: "loop-engineering", why: "งบรอบและงบ token คือเงื่อนไขหยุดที่สำคัญ" },
      { to: "distillation", why: "ย่อลงโมเดลเล็กเมื่อปริมาณงานสูงมาก" },
      { to: "ai-gateway", why: "ตั้งงบรายทีมและเลือกโมเดลได้ที่ gateway" },
      { to: "evaluation", why: "ยืนยันว่าลดแล้วคุณภาพไม่ตก" },
    ],
  },

  // ---------- ชั้น 4 · System ----------
  {
    id: "agentic-ai",
    name: "Agentic AI",
    layer: "system",
    tagline: "AI ที่รับเป้าหมายแล้วคิดและลงมือเอง",
    what: "AI ที่รับ “เป้าหมาย” แล้ววางแผน ใช้เครื่องมือ ดูผล และตัดสินใจขั้นต่อไปเอง ต่างจาก chatbot ที่ตอบครั้งเดียวจบ",
    use: "coding agent, research agent, งาน IT/DevOps, ประมวลผลเอกสาร และงาน support ที่ต้องทำรายการจริง",
    extra: {
      title: "2 แบบที่ควรแยกให้ออก",
      items: [
        "Workflow — เรากำหนดลำดับขั้นตายตัว ให้ AI ทำทีละขั้น",
        "Agent — โมเดลเลือกเส้นทางเอง",
        "หลักสำคัญ: เริ่มจากแบบที่ง่ายที่สุดก่อน (เรียกครั้งเดียว → workflow → agent)",
      ],
    },
    pros: ["ทำงานหลายขั้นที่คาดล่วงหน้าไม่ได้", "ประหยัดแรงคน"],
    cons: [
      "แพงและช้ากว่า",
      "คาดเดายาก",
      "error ทบต้น — ถ้าแต่ละขั้นถูก 95% ทำ 20 ขั้นจะถูกครบทุกขั้นแค่ราว 36%",
    ],
    analogy: "พนักงานที่รับเป้าหมายแล้วคิดและลงมือเองได้",
    links: [
      { to: "harness", why: "Agent = Model + Harness" },
      { to: "loop-engineering", why: "error ทบต้นคือเหตุผลที่ลูปต้องมีตัวตรวจ" },
      { to: "tool-use", why: "agent ลงมือทำงานผ่าน tools" },
      { to: "multi-agent", why: "เมื่อ agent ตัวเดียวไม่พอ" },
      { to: "guardrails", why: "ยิ่งอิสระมาก ยิ่งต้องมีรั้ว" },
    ],
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Systems",
    layer: "system",
    tagline: "ทีม agent ที่มีหัวหน้าแจกงาน",
    what: "หลาย agent ทำงานร่วมกัน และมีโปรโตคอล A2A ให้ agent ต่างระบบคุยกันได้ — MCP ใช้ระหว่าง agent กับ tool ส่วน A2A ใช้ระหว่าง agent กับ agent",
    use: "ค้นคว้าหลายแหล่งพร้อมกัน งานที่แบ่งส่วนได้ชัด และการแยกคนทำกับคนตรวจ",
    extra: {
      title: "รูปแบบที่พบบ่อย",
      items: [
        "Orchestrator–workers — หัวหน้าแจกงานให้ลูกทีมทำขนาน",
        "Handoff — ส่งงานต่อเป็นทอด ๆ",
        "Writer–reviewer — ให้ agent ตรวจงานกันเอง",
      ],
    },
    pros: [
      "ทำขนานได้จึงเร็ว",
      "แต่ละ agent มี context สะอาดของตัวเอง",
      "ใช้โมเดลราคาถูกเป็นลูกทีมได้",
    ],
    cons: [
      "กิน token หลายเท่า — Anthropic รายงานว่าระบบ research แบบ multi-agent ใช้ token ราว 15 เท่าของแชตปกติ",
      "agent ตัดสินใจขัดกัน เพราะเห็นข้อมูลไม่เท่ากัน",
      "debug ยาก — งานที่ต้องแชร์บริบทแน่น ๆ อย่างแก้โค้ดชิ้นเดียวกัน ใช้ agent เดียวมักดีกว่า",
    ],
    analogy: "ทีมที่มีหัวหน้าแจกงานให้ลูกทีม",
    links: [
      { to: "graph-engineering", why: "multi-agent คือกราฟแบบหนึ่ง ออกแบบด้วย graph engineering" },
      { to: "agentic-ai", why: "ทำ agent ตัวเดียวให้ดีก่อน" },
      { to: "context-engineering", why: "แยก sub-agent เพื่อให้แต่ละตัวมี context สะอาด" },
      { to: "cost-optimization", why: "ต้นทุน token คูณตามจำนวน agent" },
      { to: "mcp", why: "MCP ใช้กับ tool ส่วน A2A ใช้กับ agent" },
    ],
  },
  {
    id: "graph-engineering",
    name: "Graph Engineering",
    layer: "system",
    tagline: "หลายลูปต่อกันเป็นผังงาน",
    badge: "ใหม่ 2026",
    what: "เมื่อลูปเดียวไม่พอ ก็ต่อหลาย node เป็นกราฟ — node เป็นได้ทั้งโค้ดธรรมดา, LLM call, tool หรือ agent ทั้งตัว ส่วน edge คือเส้นส่งงานต่อ (มีเงื่อนไขได้) และมี state กลางที่ checkpoint แล้ว resume ได้",
    use: "workflow ธุรกิจที่มีหลายขั้นหลายบทบาท ต้องมีคนอนุมัติกลางทาง หรือต้องทำงานต่อได้หลังระบบล่ม",
    pros: [
      "คาดเดาได้มากกว่า agent อิสระ",
      "debug ทีละ node ได้",
      "ผสมโค้ดปกติกับ AI ได้พอดี",
    ],
    cons: [
      "over-engineer ได้ง่าย",
      "กราฟที่แข็งเกินไปทำให้เสียความยืดหยุ่นของ agent",
      "จัดการ state ยาก",
    ],
    analogy: "ผังงาน — ใครส่งงานต่อให้ใคร ภายใต้เงื่อนไขไหน",
    note: "อย่าสับสน: graph engineering คือกราฟของ “การทำงาน” ส่วน Knowledge Graph / GraphRAG คือกราฟของ “ข้อมูล” ซึ่งอยู่ในหมวด RAG",
    examples: "LangGraph และ workflow engine อื่น ๆ",
    links: [
      { to: "loop-engineering", why: "กราฟประกอบด้วยหลายลูป" },
      { to: "multi-agent", why: "ระบบหลาย agent คือกราฟแบบหนึ่ง" },
      { to: "agentic-ai", why: "แลกความอิสระของ agent กับความคาดเดาได้" },
      { to: "rag", why: "GraphRAG คือกราฟของข้อมูล คนละเรื่องกัน" },
    ],
  },

  // ---------- ชั้น 3 · Control ----------
  {
    id: "loop-engineering",
    name: "Loop Engineering",
    layer: "control",
    tagline: "วงจร ทำ → ตรวจ → แก้ → หยุด",
    badge: "ใหม่ 2026",
    what: "การออกแบบวงจรควบคุมที่สั่งงาน agent → ตรวจผล → แก้หรือลองใหม่ → ตัดสินใจหยุด แทนการให้คนนั่งพิมพ์สั่งทีละรอบ หัวใจคือ Loop = Task + Check เพราะงานที่ไม่มีตัวตรวจก็เป็นแค่ความหวัง",
    use: "ให้ agent แก้โค้ดวนจนเทสต์ผ่าน, “Ralph loop” (รัน agent ซ้ำด้วย prompt เดิมจนงานเสร็จ) และ agent ที่ตั้งเวลาให้ทำงานทุกคืน",
    extra: {
      title: "ส่วนประกอบของลูปที่ดี",
      items: [
        "เป้าหมายที่ตรวจได้",
        "ตัวตรวจ — test, type-check, LLM judge หรือ rubric",
        "เงื่อนไขหยุด และงบ (จำนวนรอบ token และเวลา)",
        "ไฟล์บันทึกความคืบหน้า ให้รอบถัดไปทำต่อได้",
        "จุดให้คนอนุมัติ",
      ],
    },
    pros: ["งานยาวเสร็จได้โดยไม่ต้องเฝ้า", "คุณภาพสม่ำเสมอ เพราะมีตัวตรวจ"],
    cons: [
      "ลูปอาจวนไม่จบจนเผาเงิน",
      "ถ้าตัวตรวจอ่อน agent จะ “โกง” ให้ผ่าน เช่น แก้เทสต์แทนแก้โค้ด",
      "error สะสมข้ามรอบได้",
    ],
    analogy: "ระบบ PDCA — ทำ → ตรวจ → แก้ → จบเมื่อผ่านเกณฑ์",
    links: [
      { to: "evaluation", why: "ตัวตรวจของลูปมาจาก eval" },
      { to: "harness", why: "ลูปสั่งงาน agent ที่ทำงานอยู่ใน harness" },
      { to: "graph-engineering", why: "หลายลูปต่อกันกลายเป็นกราฟ" },
      { to: "cost-optimization", why: "ต้องมีงบ ไม่งั้นวนจนเผาเงิน" },
      { to: "agentic-ai", why: "ลูปคือสิ่งที่ทำให้ agent ทำงานยาว ๆ ได้จริง" },
    ],
  },

  // ---------- ชั้น 2 · Harness ----------
  {
    id: "harness",
    name: "Harness",
    layer: "harness",
    tagline: "ทุกอย่างรอบโมเดล ที่ทำให้มันกลายเป็น agent",
    what: "ทุกอย่าง “ยกเว้นตัวโมเดล” ที่ทำให้โมเดลกลายเป็น agent — สูตรคือ Agent = Model + Harness ตัวอย่างเช่น Claude Code, Codex CLI และ Cursor",
    use: "สร้าง agent ของตัวเอง เช่น ด้วย Claude Agent SDK หรือ OpenAI Agents SDK",
    extra: {
      title: "ใน harness มีอะไรบ้าง",
      items: [
        "agent loop และ tools",
        "การจัด context และ memory",
        "sandbox, permissions และ hooks",
        "sub-agents และการกู้คืนเมื่อพัง",
        "หลักของ harness engineering: เมื่อ agent พลาด อย่าแค่หวังว่ารอบหน้าจะดีขึ้น ให้แก้สภาพแวดล้อมจนพลาดแบบเดิมได้ยาก เช่น เพิ่ม test, linter, hook หรือกฎใน `AGENTS.md` / `CLAUDE.md`",
      ],
    },
    pros: [
      "โมเดลระดับกลางที่มี harness ดี มักชนะโมเดลเก่งที่ harness แย่",
      "ปรับได้เองโดยไม่ต้อง train โมเดล",
    ],
    cons: [
      "ซับซ้อน และต้องปรับตามรุ่นโมเดล — ของที่เคยช่วยอาจกลายเป็นส่วนเกิน",
      "ตั้ง permission หรือ sandbox ผิด คือช่องโหว่",
    ],
    analogy: "ออฟฟิศ อุปกรณ์ สิทธิ์เข้าถึง และกฎการทำงาน",
    note: "“eval harness” เป็นอีกความหมายหนึ่ง คือโครงสำหรับรันชุดทดสอบ",
    links: [
      { to: "context-engineering", why: "harness เป็นคนประกอบ context ให้โมเดลทุกรอบ" },
      { to: "tool-use", why: "harness เป็นคนรัน tool ที่โมเดลขอ" },
      { to: "memory", why: "harness เป็นคนเขียนและอ่านความจำ" },
      { to: "loop-engineering", why: "ลูปคือตัวสั่งงาน agent ที่อยู่ใน harness" },
      { to: "guardrails", why: "permissions และ sandbox คือรั้วชั้นในของ harness" },
    ],
  },
  {
    id: "context-engineering",
    name: "Context Engineering",
    layer: "harness",
    tagline: "จัดเอกสารบนโต๊ะให้พอดี (โต๊ะมีที่จำกัด)",
    what: "prompt engineering คือการเขียนคำสั่งให้ดี ส่วน context engineering คือการจัด “ทุกอย่าง” ที่โมเดลเห็นในแต่ละรอบ ได้แก่ system prompt ประวัติแชต ผลจาก tool เอกสารที่ดึงมา ความจำ และรายการ tools ให้ “น้อยที่สุดแต่ครบ”",
    use: "ทำให้แชตบอตตอบแม่น และให้ agent ทำงานยาว ๆ ได้โดยไม่หลงทาง",
    extra: {
      title: "เทคนิคหลัก",
      items: [
        "ดึงเฉพาะส่วนที่เกี่ยว",
        "สรุปย่อเมื่อยาว (compaction)",
        "ลบผล tool เก่าทิ้ง",
        "แยกงานย่อยให้ sub-agent ที่มี context สะอาด",
        "จดโน้ตเก็บไว้นอก context",
      ],
    },
    pros: ["ถูกและเร็วกว่า fine-tune มาก", "เห็นผลทันที"],
    cons: [
      "ยิ่งยัดเยอะยิ่งแย่ — “context rot” คือโมเดลโฟกัสได้แย่ลงเมื่อ context ยาว",
      "ข้อมูลผิดที่หลุดเข้าไปจะพาทั้งงานผิดตาม (context poisoning)",
    ],
    analogy: "ใบสั่งงาน + เอกสารที่วางบนโต๊ะ (โต๊ะมีที่จำกัด)",
    links: [
      { to: "rag", why: "RAG ดึงเอกสารเข้ามาเติม context" },
      { to: "memory", why: "memory เก็บของไว้นอก context แล้วเลือกดึงกลับ" },
      { to: "harness", why: "harness เป็นคนประกอบ context ทุกรอบ" },
      { to: "cost-optimization", why: "context สั้นและนิ่ง = ถูกและ cache ได้" },
      { to: "prompt-optimization", why: "prompt คือชิ้นหนึ่งของ context" },
    ],
  },
  {
    id: "memory",
    name: "Memory Layers",
    layer: "harness",
    tagline: "สมุดโน้ตและแฟ้มงานเก่าของ agent",
    what: "ชั้นความจำของ agent ที่แบ่งคล้ายความจำของคน ทำให้จำข้ามบทสนทนาและข้ามวันได้",
    use: "ผู้ช่วยที่จำความชอบของผู้ใช้ agent ที่ทำงานต่อจากเมื่อวานได้ และการเรียนรู้จากความผิดพลาดเดิม",
    extra: {
      title: "4 ชั้นความจำ",
      items: [
        "Short-term — context ปัจจุบัน",
        "Episodic — เหตุการณ์และบทสนทนาที่ผ่านมา",
        "Semantic — ข้อเท็จจริง เช่น ลูกค้าชอบอะไร",
        "Procedural — วิธีทำงาน เช่น skills หรือไฟล์ `CLAUDE.md`",
      ],
    },
    pros: [
      "ปรับให้เข้ากับผู้ใช้แต่ละคนได้ (personalization)",
      "ไม่ต้องเล่าใหม่ทุกครั้ง",
      "ประหยัด context",
    ],
    cons: [
      "อาจจำผิด หรือจำของที่ล้าสมัยไปแล้ว",
      "memory poisoning — มีคนฝังความจำเท็จ",
      "ความเป็นส่วนตัวและ PDPA — ผู้ใช้ต้องดูและลบได้",
      "ตัดสินใจยากว่าควรจำหรือลืมอะไร",
    ],
    analogy: "สมุดโน้ตและแฟ้มงานเก่า",
    note: "Memory คือ “เขียน” ข้อมูลออกไปเก็บ RAG คือ “ดึง” กลับมา และ Context engineering คือ “เลือก” ว่ารอบนี้จะใส่อะไร ทั้งสามเป็นวงจรเดียวกัน (ในงานวิจัยสถาปัตยกรรมโมเดล “memory layers” ยังหมายถึงเลเยอร์ key-value ภายในตัวโมเดล ซึ่งเป็นคนละเรื่อง)",
    examples: "Mem0, Letta (MemGPT), Zep, LangMem และ memory tool ของผู้ให้บริการโมเดล",
    links: [
      { to: "context-engineering", why: "เลือกว่าความจำไหนควรเข้า context รอบนี้" },
      { to: "rag", why: "ดึงความจำกลับมาด้วยวิธีเดียวกับ RAG" },
      { to: "vector-db", why: "มักเก็บความจำเป็น embedding" },
      { to: "guardrails", why: "ต้องกัน memory poisoning และข้อมูลส่วนบุคคล" },
    ],
  },
  {
    id: "rag",
    name: "RAG 2.0",
    full: "Retrieval-Augmented Generation",
    layer: "harness",
    tagline: "ห้องสมุด + บรรณารักษ์ที่หาเอกสารตรงเรื่อง",
    what: "RAG แบบพื้นฐานคือตัดเอกสารเป็นชิ้น → แปลงเป็น embedding → เก็บใน vector DB → ตอนถามก็ดึงชิ้นที่ “คล้าย” มาใส่ prompt แล้วตอบ ปัญหาคือดึงผิดชิ้น ชิ้นขาดบริบท และตอบคำถามที่ต้องเชื่อมหลายจุดไม่ได้ — RAG 2.0 คือชุดอัปเกรดที่แก้ปัญหาเหล่านี้",
    use: "แชตบอตถามตอบเอกสารบริษัท คู่มือ กฎระเบียบ และงาน support",
    extra: {
      title: "RAG 2.0 อัปเกรดอะไรบ้าง",
      items: [
        "Hybrid search (keyword + vector) และ reranking",
        "เติมบริบทให้แต่ละชิ้นก่อน embed (contextual retrieval)",
        "แตกคำถามซับซ้อนเป็นหลายคำค้น",
        "Agentic RAG — agent ตัดสินใจเองว่าจะค้นอะไร ค้นซ้ำไหม และใช้ grep, SQL, web หรือ vector",
        "GraphRAG — ใช้ knowledge graph ตอบคำถามภาพรวม",
        "Multimodal — ค้นจากรูป ตาราง หรือหน้า PDF",
      ],
    },
    pros: [
      "อัปเดตข้อมูลได้ทันทีโดยไม่ต้อง train",
      "อ้างอิงแหล่งที่มาได้ และลด hallucination",
      "คุมสิทธิ์เอกสารรายผู้ใช้ได้",
    ],
    cons: ["pipeline ซับซ้อน", "ดึงผิดก็ตอบผิดอย่างมั่นใจ", "latency เพิ่ม"],
    analogy: "ห้องสมุด + บรรณารักษ์ที่หาเอกสารตรงเรื่องมาให้",
    note: "ทุกวันนี้ context window ใหญ่ถึง 1M token งานเล็กบางงานจึงใส่ทั้งเอกสารได้เลย แต่ข้อมูลที่ใหญ่ เปลี่ยนบ่อย หรือต้องคุมสิทธิ์ ยังต้องใช้ RAG — ปี 2024 Contextual AI เคยใช้คำว่า RAG 2.0 หมายถึงการ train ตัวค้นกับตัวตอบไปพร้อมกัน แต่ตอนนี้นิยมใช้ในความหมายชุดอัปเกรดข้างบนมากกว่า",
    links: [
      { to: "vector-db", why: "หลังบ้านของการค้นแบบ vector" },
      { to: "context-engineering", why: "ผลที่ดึงมาต้องถูกคัดก่อนเข้า context" },
      { to: "fine-tuning", why: "ความรู้ที่เปลี่ยนบ่อยใช้ RAG ไม่ใช่ fine-tune" },
      { to: "evaluation", why: "ต้องวัดทั้งการดึงและการตอบ เช่นด้วย Ragas" },
      { to: "graph-engineering", why: "GraphRAG คือกราฟของข้อมูล ไม่ใช่กราฟของงาน" },
    ],
  },
  {
    id: "vector-db",
    name: "Vector DBs",
    layer: "harness",
    tagline: "ฐานข้อมูลที่ค้นด้วย “ความหมาย”",
    what: "ฐานข้อมูลที่เก็บ embedding (เวกเตอร์ตัวเลขที่แทนความหมาย) แล้วหาตัวที่ใกล้ที่สุดได้เร็ว",
    use: "semantic search, หลังบ้านของ RAG, memory ของ agent, ระบบแนะนำ และ semantic cache",
    pros: [
      "ค้นด้วยความหมายได้ เช่น พิมพ์ “รถสตาร์ทไม่ติด” แล้วเจอ “แบตเตอรี่เสื่อม”",
      "เร็วแม้ข้อมูลหลักล้าน",
    ],
    cons: [
      "ค้นคำตรงตัวอย่างรหัสสินค้าไม่เก่ง จึงต้องใช้ hybrid search ร่วมด้วย",
      "ผลที่ “คล้าย” ไม่ได้แปลว่า “ถูก”",
      "เปลี่ยนโมเดล embedding ต้อง embed ใหม่ทั้งหมด",
    ],
    analogy: "ชั้นหนังสือที่จัดตามความหมาย ไม่ใช่ตามตัวอักษร",
    note: "ถ้าข้อมูลไม่มหาศาล Postgres + pgvector ก็พอ ส่วน coding agent อย่าง Claude Code เลือกค้นแบบ agentic (grep และอ่านไฟล์เอง) แทน vector index ด้วยซ้ำ",
    examples: "pgvector (ใช้ใน Supabase / Postgres ได้เลย), Pinecone, Qdrant, Weaviate, Milvus, Chroma",
    links: [
      { to: "rag", why: "vector DB คือหลังบ้านของ RAG" },
      { to: "memory", why: "ใช้เก็บความจำระยะยาวของ agent" },
      { to: "cost-optimization", why: "ใช้ทำ semantic cache" },
    ],
  },
  {
    id: "function-calling",
    name: "Function Calling",
    layer: "harness",
    tagline: "แบบฟอร์มขอใช้เครื่องมือ",
    what: "กลไกระดับ API — เราบอกโมเดลว่ามีฟังก์ชันอะไรบ้าง (ชื่อ + คำอธิบาย + JSON Schema) โมเดลตอบกลับเป็น JSON เช่น `get_order(id=\"1234\")` จากนั้นโค้ดของเราเป็นคนรันจริงและส่งผลกลับ โมเดลไม่ได้รันเอง",
    use: "ให้แชตบอตดึงข้อมูลจริงจากระบบ หรือแปลงข้อความเป็นข้อมูลโครงสร้าง เช่น อ่านใบเสร็จแล้วได้ JSON",
    pros: ["ได้ข้อมูลเป็นโครงสร้าง ต่อกับระบบเดิมง่าย", "โหมด strict บังคับให้ตรง schema ได้"],
    cons: [
      "โมเดลอาจเลือก tool หรือใส่ argument ผิด",
      "ยิ่ง tool เยอะยิ่งแม่นน้อยลงและกิน token มากขึ้น เพราะนิยาม tool อยู่ใน context ทุกรอบ",
    ],
    analogy: "แบบฟอร์มขอใช้เครื่องมือ",
    links: [
      { to: "tool-use", why: "function calling คือ “ภาษาที่ใช้ขอ” ส่วน tool use คือ “การใช้งานจริงในลูป”" },
      { to: "mcp", why: "MCP ห่อฟังก์ชันให้ทุก client เรียกได้" },
      { to: "context-engineering", why: "นิยาม tool ทุกตัวกินพื้นที่ context" },
    ],
  },
  {
    id: "tool-use",
    name: "Tool Use",
    layer: "harness",
    tagline: "หยิบเครื่องมือมาทำงานจริง",
    what: "ความสามารถในการใช้เครื่องมือต่อเนื่องหลายครั้งจนงานเสร็จ — function calling คือ “ภาษาที่ใช้ขอ” ส่วน tool use คือ “การใช้งานจริงในลูป”",
    use: "ค้นเว็บ รันโค้ด query ฐานข้อมูล คุมเบราว์เซอร์หรือคอมพิวเตอร์",
    extra: {
      title: "เทรนด์ใหม่",
      items: [
        "Tool search — โหลดนิยาม tool เฉพาะตัวที่ต้องใช้",
        "Programmatic tool calling — ให้โมเดลเขียนโค้ดเรียกหลาย tool ในครั้งเดียว เพื่อประหยัด token",
        "Agent Skills — แพ็กคำสั่งและสคริปต์ที่ agent โหลดเฉพาะตอนต้องใช้",
      ],
    },
    pros: ["AI ลงมือทำได้จริง ไม่ใช่แค่ตอบ", "ได้ข้อมูลสด"],
    cons: [
      "ความเสี่ยงพุ่งทันทีที่ tool เขียน ลบ จ่ายเงิน หรือส่งข้อความได้",
      "prompt injection ที่ซ่อนมากับผลลัพธ์ของ tool เช่น หน้าเว็บที่แอบใส่คำสั่ง",
      "คุณภาพขึ้นกับการออกแบบ tool — ชื่อ คำอธิบาย และผลลัพธ์ต้องชัดและกระชับ",
    ],
    analogy: "การหยิบเครื่องมือมาทำงานจริง",
    links: [
      { to: "function-calling", why: "กลไกที่ใช้ขอเรียก tool" },
      { to: "mcp", why: "มาตรฐานสำหรับเสียบ tool จากที่ไหนก็ได้" },
      { to: "guardrails", why: "tool ที่ทำได้มาก ต้องมีรั้วด้านการกระทำ" },
      { to: "agentic-ai", why: "tools คือมือของ agent" },
    ],
  },
  {
    id: "mcp",
    name: "MCP",
    full: "Model Context Protocol",
    layer: "harness",
    tagline: "ปลั๊ก USB-C ของ AI",
    what: "มาตรฐานเปิดสำหรับห่อ tools และข้อมูลเป็น server ให้ AI client ตัวไหนก็เสียบใช้ได้ (Claude, ChatGPT, Gemini, Cursor, VS Code ฯลฯ) — Anthropic เปิดตัวปลายปี 2024 และมอบให้ Agentic AI Foundation ภายใต้ Linux Foundation เมื่อ ธ.ค. 2025",
    use: "ให้ AI เข้าถึง GitHub, Slack, ฐานข้อมูล หรือระบบภายในบริษัท โดยเขียน integration ครั้งเดียว — แก้ปัญหา N×M: เดิม N แอป × M ระบบ ต้องเขียน N×M ชิ้น ตอนนี้เหลือแค่ N+M",
    extra: {
      title: "server เสนอของได้ 3 แบบ",
      items: ["Tools — สั่งให้ทำ", "Resources — ข้อมูลให้อ่าน", "Prompts — template สำเร็จรูป"],
    },
    pros: ["เขียนครั้งเดียวใช้ได้กับทุก client", "ecosystem ใหญ่มาก"],
    cons: [
      "server ที่ไม่น่าไว้ใจคือช่องโหว่ (tool poisoning, สิทธิ์เกินจำเป็น)",
      "ต่อหลาย server แล้วนิยาม tool จะกิน context",
      "คุณภาพ server ในตลาดไม่เท่ากัน",
    ],
    analogy: "ปลั๊กมาตรฐาน (USB-C) เสียบเครื่องมือไหนก็ได้",
    links: [
      { to: "stateless-mcp", why: "spec 2026-07-28 ทำให้ MCP scale ง่ายขึ้นมาก" },
      { to: "tool-use", why: "MCP คือวิธีมาตรฐานในการส่ง tools ให้ AI" },
      { to: "function-calling", why: "สุดท้ายโมเดลก็เรียก tool ของ MCP ผ่าน function calling" },
      { to: "guardrails", why: "ต้องคุมว่า server ไหนน่าไว้ใจ และให้สิทธิ์แค่ไหน" },
      { to: "multi-agent", why: "MCP ใช้ระหว่าง agent กับ tool ส่วน A2A ใช้ระหว่าง agent กับ agent" },
    ],
  },
  {
    id: "stateless-mcp",
    name: "Stateless MCP",
    layer: "harness",
    tagline: "MCP ที่ไม่ต้องจำ session จึง scale ได้ง่าย",
    badge: "ใหม่ ก.ค. 2026",
    what: "เดิม MCP แบบ remote ต้อง “จับมือ” (`initialize`) และมี session ID ผูก client ไว้กับ server เครื่องเดิม จึง scale ยาก spec 2026-07-28 ตัดทั้งสองอย่างออก ทุก request พกข้อมูลครบในตัว (เวอร์ชัน ข้อมูล client และ capabilities อยู่ใน `_meta`) จึงส่งไปลงเครื่องไหนก็ได้",
    use: "รัน MCP server ใน production ขนาดใหญ่ หรือบน serverless (Vercel, Cloudflare Workers, Lambda)",
    extra: {
      title: "ของใหม่ที่มาด้วย",
      items: [
        "header `Mcp-Method` / `Mcp-Name` ให้ gateway route และคิดเงินได้โดยไม่ต้องแกะ JSON",
        "cache รายการ tools ได้ (`ttlMs`)",
        "ถ้าต้องจำ state ให้ tool คืน “handle” (เช่น `cart_id`) แล้วโมเดลส่งกลับมาเป็น argument",
        "ถามผู้ใช้กลางทางแบบใหม่ — server ตอบว่าขอข้อมูลเพิ่ม แล้ว client ยิง request เดิมซ้ำพร้อมคำตอบ",
        "Sampling, Roots และ Logging ถูก deprecate",
      ],
    },
    pros: [
      "ใช้ load balancer ธรรมดาได้ ไม่ต้องมี sticky session",
      "เครื่องหนึ่งล่มก็ไม่กระทบระบบ",
      "เข้ากับ serverless พอดี",
    ],
    cons: [
      "server เดิมที่พึ่ง session ต้องย้ายระบบ",
      "state ต้องไปเก็บเอง (DB / Redis) หรือส่ง handle ไปมา",
      "ฟีเจอร์ที่ server เป็นฝ่ายเริ่มคุยถูกลดลง — มีเสียงวิจารณ์ว่า “แบบนี้ก็กลายเป็น REST API ธรรมดาหรือเปล่า”",
    ],
    analogy: "เคาน์เตอร์ที่ไม่ต้องจำหน้าลูกค้า ยื่นเอกสารครบทุกครั้ง ไปช่องไหนก็ได้",
    links: [
      { to: "mcp", why: "เวอร์ชันใหม่ของโปรโตคอลเดียวกัน" },
      { to: "ai-gateway", why: "header ใหม่ทำมาเพื่อ gateway โดยตรง" },
      { to: "tool-use", why: "tool ต้องคืน handle ให้โมเดลส่งกลับมาในรอบถัดไป" },
    ],
  },

  // ---------- ชั้น 1 · Model ----------
  {
    id: "prompt-optimization",
    name: "Prompt Optimization",
    layer: "model",
    tagline: "ปรับวิธีสั่งงานด้วยตัวเลข ไม่ใช่ความรู้สึก",
    what: "ปรับ prompt อย่างเป็นระบบโดยวัดผลด้วย eval แทนการเดา ทำได้ทั้งด้วยมือและแบบอัตโนมัติ เช่น DSPy (optimizer อย่าง MIPROv2 และ GEPA) หรือให้ LLM ช่วยวิจารณ์แล้วเขียนใหม่",
    use: "เพิ่มความแม่นของงานเดิมโดยไม่ต้อง train และปรับ prompt ตอนย้ายไปใช้โมเดลรุ่นใหม่",
    pros: ["เป็นวิธีเพิ่มคุณภาพที่ถูกและเร็วที่สุด", "ย้อนกลับง่าย"],
    cons: [
      "อาจ overfit กับชุดทดสอบ",
      "prompt ที่จูนไว้กับโมเดลหนึ่งอาจแย่ลงในรุ่นใหม่ — prompt เก่าที่สั่งละเอียดเกินมักทำให้โมเดลใหม่ทำงานแย่ลง",
      "ถ้าไม่มี eval ก็แค่ “รู้สึก” ว่าดีขึ้น",
    ],
    analogy: "ปรับวิธีสั่งงานจนได้ผลดีที่สุด",
    links: [
      { to: "evaluation", why: "ต้องมี eval ก่อน ถึงจะ optimize ได้" },
      { to: "context-engineering", why: "prompt คือชิ้นหนึ่งของ context" },
      { to: "fine-tuning", why: "ปรับ prompt ให้สุดก่อน ค่อยคิดเรื่อง fine-tune" },
    ],
  },
  {
    id: "fine-tuning",
    name: "Fine-tuning",
    layer: "model",
    tagline: "ส่งโมเดลไปอบรมเฉพาะทาง",
    what: "train โมเดลต่อด้วยข้อมูลของเรา เพื่อให้เก่งงานเฉพาะ หรือทำตามรูปแบบที่ต้องการได้สม่ำเสมอ",
    use: "งานที่ต้องการรูปแบบ สไตล์ หรือภาษาเฉพาะที่สม่ำเสมอ งานแคบที่ทำซ้ำปริมาณมาก (จัดหมวด ดึงข้อมูล) และการใช้โมเดลเล็กแทนโมเดลใหญ่ — ไม่ควรใช้เพื่อใส่ความรู้ที่เปลี่ยนบ่อย ให้ใช้ RAG แทน",
    extra: {
      title: "แบบที่พบบ่อย",
      items: [
        "SFT — สอนด้วยตัวอย่างถาม-ตอบ",
        "Preference tuning — DPO หรือ RLHF",
        "RL fine-tuning — ให้รางวัลเมื่อทำถูก",
        "LoRA / QLoRA — train แค่ส่วนเล็ก ๆ ประหยัด GPU",
      ],
    },
    pros: ["แม่นขึ้นในงานเฉพาะ", "prompt สั้นลง จึงถูกและเร็วขึ้น"],
    cons: [
      "ต้องมีข้อมูลดีพอ",
      "มีทั้งค่า train และค่าดูแล",
      "อาจลืมความสามารถเดิม",
      "โมเดลฐานออกรุ่นใหม่ต้อง train ใหม่ และโมเดลชั้นนำหลายตัวเปิดให้ fine-tune แบบจำกัด",
    ],
    analogy: "ส่งไปอบรมเฉพาะทาง",
    note: "ลำดับที่แนะนำ: Prompt → Context / RAG → Fine-tune ขยับไปขั้นถัดไปเมื่อขั้นก่อนหน้าไม่พอจริง ๆ",
    links: [
      { to: "synthetic-data", why: "ข้อมูลสำหรับ train มักเสริมด้วย synthetic data" },
      { to: "distillation", why: "distillation คือ fine-tune โมเดลเล็กด้วยคำตอบของโมเดลใหญ่" },
      { to: "rag", why: "ความรู้ที่เปลี่ยนบ่อยใช้ RAG แทน" },
      { to: "evaluation", why: "วัดว่า train แล้วดีขึ้นจริงไหม" },
      { to: "prompt-optimization", why: "ลองปรับ prompt ให้สุดก่อน" },
    ],
  },
  {
    id: "synthetic-data",
    name: "Synthetic Data",
    layer: "model",
    tagline: "แบบฝึกหัดและข้อสอบที่ AI สร้างให้",
    what: "ข้อมูลที่ให้ AI หรือ simulator สร้างขึ้น แทนการเก็บจากคนจริงทั้งหมด",
    use: "ชุดข้อมูลสำหรับ fine-tune ชุด eval ที่รวม edge case หายาก จำลองผู้ใช้เพื่อทดสอบ agent ข้อมูลทดแทนข้อมูลส่วนบุคคล และ prompt สำหรับ red-team",
    pros: ["ถูก เร็ว ขยายได้ไม่จำกัด", "ไม่ต้องใช้ข้อมูลลูกค้าจริง"],
    cons: [
      "ถ้าไม่กรองจะได้ข้อมูลผิดหรือซ้ำซาก ทุกอย่างมี “สำเนียง AI”",
      "train ด้วยข้อมูลสังเคราะห์วนซ้ำ โมเดลจะเสื่อม (model collapse)",
      "bias ของโมเดลต้นทางติดมาด้วย",
      "บางค่ายห้ามนำ output ไป train โมเดลคู่แข่ง",
    ],
    analogy: "แบบฝึกหัดและข้อสอบจำลอง",
    links: [
      { to: "distillation", why: "distillation ≈ synthetic data จาก teacher + fine-tune" },
      { to: "fine-tuning", why: "เป็นวัตถุดิบของการ train" },
      { to: "evaluation", why: "เติมเคสทดสอบที่หายากในของจริง" },
    ],
  },
  {
    id: "distillation",
    name: "Distillation",
    layer: "model",
    tagline: "รุ่นพี่เก่งสอนรุ่นน้องที่ค่าจ้างถูกกว่า",
    what: "ให้โมเดลใหญ่ (teacher) สอนโมเดลเล็ก (student) — ในทางปฏิบัติคือให้ teacher สร้างคำตอบและวิธีคิดจำนวนมาก แล้วนำไป fine-tune student สรุปเป็นสูตรได้ว่า Distillation ≈ Synthetic Data (จาก teacher) + Fine-tuning (student)",
    use: "ย่อความสามารถเฉพาะงานลงโมเดลเล็กที่รันเองหรือรันบนอุปกรณ์ได้ ตัวอย่างดังคือ DeepSeek-R1 ที่กลั่นความสามารถด้านการให้เหตุผลลงโมเดล Qwen และ Llama ขนาดเล็ก",
    pros: ["ได้โมเดลเล็ก เร็ว ถูก ที่เก่งใกล้ teacher ในงานนั้น"],
    cons: [
      "student ไม่เก่งเกิน teacher และมักเก่งเฉพาะงานที่สอน",
      "ต้องมี pipeline ข้อมูลและ eval",
      "ติดเงื่อนไขการใช้งานของ teacher",
    ],
    analogy: "รุ่นพี่เก่งสอนรุ่นน้องที่ค่าจ้างถูกกว่าให้ทำงานแทน",
    links: [
      { to: "synthetic-data", why: "teacher เป็นคนสร้างข้อมูลให้" },
      { to: "fine-tuning", why: "student เรียนผ่านการ fine-tune" },
      { to: "cost-optimization", why: "ลดต้นทุนเมื่อปริมาณงานสูงมาก" },
      { to: "evaluation", why: "วัดว่า student ใกล้ teacher แค่ไหน" },
    ],
  },
];

export const TOPICS: Record<TopicId, Topic> = Object.fromEntries(
  TOPIC_LIST.map((t) => [t.id, t])
) as Record<TopicId, Topic>;

/** 5 คำ Engineering ที่ฮิตต่อกันมา — เรียงจากชั้นนอกสุดเข้าไปชั้นในสุด */
export const ZOOM: { name: string; topic?: TopicId; era: string; says: string }[] = [
  { name: "Graph", topic: "graph-engineering", era: "กลางปี 2026", says: "หลายลูปต่อกันเป็นระบบ" },
  { name: "Loop", topic: "loop-engineering", era: "กลางปี 2026", says: "ทำ → ตรวจ → แก้ → หยุด" },
  { name: "Harness", topic: "harness", era: "ปลายปี 2025 – ต้นปี 2026", says: "สภาพแวดล้อมรอบโมเดล" },
  { name: "Context", topic: "context-engineering", era: "2025", says: "ทุกอย่างที่โมเดลเห็นในรอบนั้น" },
  { name: "Prompt", era: "2022–24", says: "คำสั่งหนึ่งข้อความ" },
];

export const FLOW: {
  question: string;
  steps: { text: string; topics: TopicId[] }[];
  outro: string;
} = {
  question: "ออเดอร์ #1234 ถึงไหนแล้ว ถ้าช้าขอยกเลิก",
  steps: [
    { text: "AI Gateway รับ request เลือกโมเดล และเช็กงบกับสิทธิ์", topics: ["ai-gateway"] },
    {
      text: "Guardrails ขาเข้าตรวจ prompt injection และปิดบังเบอร์โทรกับที่อยู่",
      topics: ["guardrails"],
    },
    {
      text: "Harness เริ่มทำงาน แล้วประกอบ context จาก system prompt (อยู่ใน cache) ความจำว่าลูกค้าคนนี้เคยบ่นเรื่องส่งช้า และนโยบายการยกเลิกที่ RAG ดึงมาจาก Vector DB",
      topics: ["harness", "context-engineering", "memory", "rag", "vector-db"],
    },
    {
      text: "โมเดลใช้ function calling ขอเรียก `get_order_status(\"1234\")` ซึ่งเป็น tool บน MCP server ของระบบหลังบ้าน (stateless รันบน serverless)",
      topics: ["function-calling", "tool-use", "mcp", "stateless-mcp"],
    },
    {
      text: "พบว่าส่งช้าเกินกำหนด โมเดลจะเรียก `cancel_order` แต่ guardrail ด้านการกระทำบังคับให้ลูกค้ากดยืนยันก่อน",
      topics: ["guardrails", "tool-use"],
    },
    {
      text: "ลูปตรวจว่ายกเลิกสำเร็จจริงก่อนตอบ ถ้า API error ให้ลองใหม่ไม่เกิน 2 ครั้ง แล้วส่งต่อให้คน",
      topics: ["loop-engineering"],
    },
    {
      text: "ถ้าเป็นระบบใหญ่ กราฟจะส่งงานต่อจาก support agent → refund agent → notify agent",
      topics: ["graph-engineering", "multi-agent", "agentic-ai"],
    },
    { text: "Guardrails ขาออกตรวจคำตอบก่อนส่งให้ลูกค้า", topics: ["guardrails"] },
    {
      text: "Observability เก็บ trace และต้นทุน → eval รันทุกคืน → เจอเคสที่ตอบนโยบายผิด → แก้ prompt หรือสร้าง synthetic data ของเคสนั้น → ถ้าปริมาณงานสูงมากก็ distill โมเดลเล็กเฉพาะงาน → ต้นทุนลดลง",
      topics: [
        "observability",
        "evaluation",
        "prompt-optimization",
        "synthetic-data",
        "distillation",
        "cost-optimization",
      ],
    },
  ],
  outro: "ขั้นสุดท้ายเรียกว่า data flywheel — ยิ่งมีคนใช้ ก็ยิ่งมีข้อมูลมาปรับปรุงระบบ",
};

export const ROADMAP: { title: string; desc: string; topics: TopicId[] }[] = [
  {
    title: "Function calling + Tool use",
    desc: "เขียน agent loop เล็ก ๆ เองสักตัว จะเข้าใจ harness จากข้างใน",
    topics: ["function-calling", "tool-use", "harness", "agentic-ai"],
  },
  {
    title: "Context engineering + RAG",
    desc: "ทำระบบถามตอบจากเอกสารของตัวเอง เช่น ใช้ pgvector ใน Supabase",
    topics: ["context-engineering", "rag", "vector-db", "memory"],
  },
  {
    title: "Evals + Observability",
    desc: "ทำตั้งแต่วันแรก อย่าข้าม — ไม่มีตัวเลขก็ไม่รู้ว่าที่แก้ไปดีขึ้นจริงไหม",
    topics: ["evaluation", "observability", "prompt-optimization"],
  },
  {
    title: "MCP server แบบ stateless",
    desc: "ห่อ API ของระบบตัวเองให้ AI ใช้ แล้ว deploy บน serverless ได้เลย",
    topics: ["mcp", "stateless-mcp"],
  },
  {
    title: "Guardrails + AI Gateway + Cost",
    desc: "ปิดบังข้อมูลส่วนบุคคลใน prompt และ log (PDPA) แล้วใช้ caching กับ batch",
    topics: ["guardrails", "ai-gateway", "cost-optimization"],
  },
  {
    title: "Loop → Graph → Multi-agent",
    desc: "เมื่องานต้องการจริงเท่านั้น",
    topics: ["loop-engineering", "graph-engineering", "multi-agent"],
  },
  {
    title: "Synthetic data → Fine-tuning / Distillation",
    desc: "เก็บไว้ท้ายสุด เมื่อมีข้อมูลและปริมาณงานมากพอ",
    topics: ["synthetic-data", "fine-tuning", "distillation"],
  },
];

export const MORE: { name: string; desc: string }[] = [
  {
    name: "Agent Skills",
    desc: "โฟลเดอร์ `SKILL.md` + สคริปต์ ที่ agent โหลดเฉพาะตอนต้องใช้ — มาตรฐานเปิดตั้งแต่ ธ.ค. 2025 ใช้ได้กับ Claude, Codex, Gemini CLI, Copilot, Cursor",
  },
  {
    name: "AGENTS.md / CLAUDE.md",
    desc: "คู่มือโปรเจกต์ให้ coding agent อ่าน — procedural memory แบบง่ายที่สุด",
  },
  { name: "A2A", desc: "โปรโตคอลให้ agent ต่างระบบคุยกัน (MCP ใช้กับ tool ส่วน A2A ใช้กับ agent)" },
  { name: "Structured Outputs", desc: "บังคับคำตอบให้ตรง JSON Schema" },
  { name: "Hybrid Search · Reranking · Chunking", desc: "ชิ้นส่วนย่อยของ RAG 2.0" },
  { name: "Knowledge Graph · GraphRAG", desc: "กราฟข้อมูลสำหรับการค้นคืน" },
  {
    name: "Prompt Injection · Red Teaming",
    desc: "ภัยอันดับหนึ่งของ agent และการทดสอบเจาะระบบ AI",
  },
  { name: "Sandboxing · Human-in-the-Loop", desc: "รันในพื้นที่ปิด และให้คนอนุมัติในจุดสำคัญ" },
  { name: "Computer Use · Browser Agents", desc: "AI คุมหน้าจอและเบราว์เซอร์เอง" },
  {
    name: "Reasoning Models · Effort",
    desc: "ให้โมเดลคิดนานขึ้น แลกกับเวลาและเงิน (test-time compute)",
  },
  {
    name: "Quantization · LoRA · vLLM",
    desc: "ย่อขนาดโมเดล fine-tune แบบประหยัด และเสิร์ฟโมเดลเองให้เร็ว",
  },
  { name: "Durable Execution", desc: "ทำให้ workflow ยาว ๆ ทำต่อได้หลังระบบล่ม เช่น Temporal" },
  { name: "Spec-Driven Development", desc: "เขียน spec ให้ชัดก่อนให้ agent ลงมือ" },
];

export const SOURCES: { label: string; href: string }[] = [
  {
    label: "The 2026-07-28 MCP Specification — MCP Blog",
    href: "https://blog.modelcontextprotocol.io/posts/2026-07-28/",
  },
  {
    label: "MCP Goes Stateless — InfoQ",
    href: "https://www.infoq.com/news/2026/08/mcp-stateless-gateway/",
  },
  {
    label: "MCP joins the Agentic AI Foundation — MCP Blog",
    href: "https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation/",
  },
  {
    label: "Loop Engineering Emerges as Developers Put AI Coding Agents on Repeat — ADTmag",
    href: "https://adtmag.com/articles/2026/07/01/loop-engineering-emerges-as-developers-put-ai-coding-agents-on-repeat.aspx",
  },
  {
    label: "3 Years of Graph Engineering with LangGraph — LangChain",
    href: "https://www.langchain.com/blog/3-years-of-graph-engineering-with-langgraph",
  },
  {
    label: "Harness engineering for coding agent users — Martin Fowler",
    href: "https://martinfowler.com/articles/harness-engineering.html",
  },
  {
    label: "Loop, Harness, Context Engineering: The Terms Explained — codecentric",
    href: "https://www.codecentric.de/en/knowledge-hub/blog/loop-harness-context-engineering-explained",
  },
  { label: "Agent Skills — agentskills.io", href: "https://agentskills.io/home" },
];
