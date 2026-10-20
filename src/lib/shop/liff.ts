/**
 * ไลน์ของลูกค้า — เมื่อเปิดหน้าร้านจากปุ่มในไลน์ของสาขา (ลิงก์ https://liff.line.me/<LIFF ID>)
 * ไลน์ล็อกอินให้เองในแอป ไม่มีหน้าขออนุญาตเพิ่ม
 * ได้ชื่อที่แสดงในไลน์ (เติมช่องชื่อเล่น) และ access token ให้เซิร์ฟเวอร์เช็กกับไลน์ว่าเป็นใคร (จำบัตรลูกค้าด้วยบัญชีไลน์)
 *
 * LIFF ID มาจาก /api/shop/config (shop_branches.liff_id หรือ NEXT_PUBLIC_SHOP_LIFF_ID)
 * ไม่มี หรือเปิดจากเบราว์เซอร์ทั่วไป = คืน null (ลูกค้าพิมพ์ชื่อเอง)
 * LIFF ID ไม่ใช่ความลับ — อยู่ในลิงก์ที่ลูกค้ากดอยู่แล้ว
 */
type Liff = {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  getProfile(): Promise<{ displayName: string }>;
  getAccessToken(): string | null;
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

export type LineLogin = { name: string; token: string };

export async function lineLogin(liffId: string): Promise<LineLogin | null> {
  if (!liffId) return null;
  try {
    const liff = await loadSdk();
    await liff.init({ liffId });
    // นอกแอปไลน์จะยังไม่ล็อกอิน — ไม่บังคับล็อกอิน ให้พิมพ์ชื่อเองแทน
    if (!liff.isLoggedIn()) return null;
    const token = liff.getAccessToken() ?? "";
    const { displayName } = await liff.getProfile();
    return { name: displayName.trim().slice(0, 30), token };
  } catch {
    return null;
  }
}
