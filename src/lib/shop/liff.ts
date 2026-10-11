/**
 * ชื่อจากไลน์ — เมื่อเปิด /shop จากปุ่มในไลน์ร้าน (ลิงก์ https://liff.line.me/<LIFF ID>)
 * ไลน์ล็อกอินให้เองในแอป ไม่มีหน้าขออนุญาตเพิ่ม เราอ่านแค่ชื่อที่แสดงในไลน์ไปเติมช่องชื่อเล่น
 *
 * ไม่ตั้ง NEXT_PUBLIC_SHOP_LIFF_ID หรือเปิดจากเบราว์เซอร์ทั่วไป = คืน null (ลูกค้าพิมพ์ชื่อเอง)
 * LIFF ID ไม่ใช่ความลับ — อยู่ในลิงก์ที่ลูกค้ากดอยู่แล้ว
 */
type Liff = {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  getProfile(): Promise<{ displayName: string }>;
};

const SDK = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadSdk(): Promise<Liff> {
  const w = window as unknown as { liff?: Liff };
  if (w.liff) return Promise.resolve(w.liff);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK;
    s.async = true;
    s.onload = () => (w.liff ? resolve(w.liff) : reject(new Error("liff")));
    s.onerror = () => reject(new Error("liff"));
    document.head.appendChild(s);
  });
}

export async function lineDisplayName(): Promise<string | null> {
  const liffId = process.env.NEXT_PUBLIC_SHOP_LIFF_ID?.trim();
  if (!liffId) return null;
  try {
    const liff = await loadSdk();
    await liff.init({ liffId });
    // นอกแอปไลน์จะยังไม่ล็อกอิน — ไม่บังคับล็อกอิน ให้พิมพ์ชื่อเองแทน
    if (!liff.isLoggedIn()) return null;
    const { displayName } = await liff.getProfile();
    return displayName.trim().slice(0, 30) || null;
  } catch {
    return null;
  }
}
