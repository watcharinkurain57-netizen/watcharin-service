/**
 * อ่านค่า env ของ Supabase ที่เดียว จะได้พังตั้งแต่ตอน build ถ้าลืมตั้ง
 * ไม่ใช่ไปพังตอนผู้ใช้กดใช้งานจริงแล้วขึ้นหน้าขาว
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `ขาดตัวแปร ${name} — คัดลอก .env.example เป็น .env.local แล้วเติมค่าจาก Supabase dashboard`
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
