const WORDS = ["พูดคุย", "แชท", "ปรึกษา", "วางโครงสร้าง", "ออกแบบระบบ", "ทำร่วมกัน", "ดูแลต่อ"];

/**
 * แถบคำวิ่ง — คั่นจังหวะระหว่างช่วงของหน้า
 *
 * ใช้ฟอนต์ไทยปกติ ไม่ใช่ monospace และไม่ยืดช่องไฟ
 * เพราะ mono ไม่มี glyph ไทย ส่วน letter-spacing ทำให้สระบนล่างลอยผิดที่
 */
export function Marquee() {
  // วนสองชุดเพื่อให้เลื่อนถึง -50% แล้ววนต่อได้แบบไม่มีรอยต่อ
  const loop = [...WORDS, ...WORDS];

  return (
    <div className="overflow-hidden bg-[#0f1f1a] py-3.5" aria-hidden="true">
      <div className="marquee-track flex w-max gap-10">
        {loop.map((w, i) => (
          <span key={`${w}-${i}`} className="whitespace-nowrap text-[1.02rem] font-bold text-brand-400">
            {w}
            <span className="ml-10 text-brand-400/40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
