/**
 * คณิตศาสตร์ของการเลื่อน/ซูม — แยกออกจากคอมโพเนนต์เพราะเป็นตรรกะล้วน
 *
 * แยกมาเพื่อให้ตรวจด้วยสคริปต์ได้ ไม่ใช่เพราะอยากมีไฟล์เพิ่ม:
 * ถ้าสูตรผิดเครื่องหมายตัวเดียว ภาพจะ "ไถลหนีเมาส์" ตอนซูม
 * ซึ่งไม่ใช่ error ไม่มีอะไรเตือน และคนใช้จะบอกได้แค่ว่า "มันแปลก ๆ"
 */

export type View = {
  /** ระยะเลื่อนของเนื้อหาในหน่วยพิกเซลบนจอ */
  x: number;
  y: number;
  /** อัตราขยาย 1 = ขนาดจริง */
  k: number;
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
/** กดปุ่มซูมหนึ่งครั้งขยับเท่าไหร่ — 1.25 ให้ความรู้สึกว่าค่อย ๆ เข้า ไม่กระโดด */
export const ZOOM_STEP = 1.25;

export const clampZoom = (k: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, k));

/**
 * ซูมโดยตรึงจุดที่อยู่ใต้เมาส์ไว้กับที่
 *
 * หัวใจอยู่ที่: พิกัดในเนื้อหาที่อยู่ใต้จุด (px, py) ต้องเป็นค่าเดิมทั้งก่อนและหลังซูม
 *   ก่อน: c = (px - x) / k
 *   หลัง: c = (px - x2) / k2
 * แก้สมการหา x2 ได้เป็น  x2 = px - (px - x) * (k2 / k)
 *
 * ถ้าไม่ตรึงจุดนี้ ภาพจะเลื่อนหนีมือทุกครั้งที่หมุนล้อ และยิ่งซูมยิ่งหลุด
 * จนต้องลากกลับมาหาใหม่ตลอด
 *
 * @param px ตำแหน่งเมาส์ในกรอบที่มองเห็น (ไม่ใช่พิกัดหน้าจอ)
 */
export function zoomAt(view: View, factor: number, px: number, py: number): View {
  const k = clampZoom(view.k * factor);
  if (k === view.k) return view;

  return {
    k,
    x: px - (px - view.x) * (k / view.k),
    y: py - (py - view.y) * (k / view.k),
  };
}

/**
 * จัดผังให้พอดีกรอบแล้ววางไว้กลาง
 *
 * @param pad เว้นขอบไว้ ไม่ให้ผังชนขอบกรอบพอดีจนดูอึดอัด
 */
export function fitView(
  box: { width: number; height: number },
  natural: { w: number; h: number },
  pad = 24
): View | null {
  if (natural.w <= 0 || natural.h <= 0 || box.width <= 0 || box.height <= 0) return null;

  const k = clampZoom(Math.min((box.width - pad) / natural.w, (box.height - pad) / natural.h));
  return {
    k,
    x: (box.width - natural.w * k) / 2,
    y: (box.height - natural.h * k) / 2,
  };
}

/** พิกัดในเนื้อหาที่อยู่ใต้จุดหนึ่งบนกรอบ — ใช้ตรวจว่าซูมแล้วจุดนั้นอยู่ที่เดิมจริงไหม */
export function contentPointAt(view: View, px: number, py: number): { x: number; y: number } {
  return { x: (px - view.x) / view.k, y: (py - view.y) / view.k };
}
