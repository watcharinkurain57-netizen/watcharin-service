/**
 * อ่านค่า env ของ Supabase ที่เดียว จะได้พังตั้งแต่ตอน build ถ้าลืมตั้ง
 * ไม่ใช่ไปพังตอนผู้ใช้กดใช้งานจริงแล้วขึ้นหน้าขาว
 */
function required(name: string, value: string | undefined): string {
  // ตัดช่องว่างและขึ้นบรรทัดใหม่ที่ติดมาตอนคัดลอกวาง
  // เจอจริงตอน deploy: คีย์ที่วางใน Vercel มี newline ท้ายค่า ทำให้ build ล้มด้วย
  //   TypeError: Headers.set: "..." is an invalid header value
  // เพราะ HTTP header ห้ามมี CR/LF — และ log ก็ปิดค่าไว้ ไล่หาสาเหตุยากมาก
  const clean = value?.trim();

  if (!clean) {
    throw new Error(
      `ขาดตัวแปร ${name} — คัดลอก .env.example เป็น .env.local แล้วเติมค่าจาก Supabase dashboard`
    );
  }

  // ถ้ายังมีอักขระที่ header รับไม่ได้หลงเหลืออยู่ ให้ฟ้องตรง ๆ ว่าตัวไหน
  // ดีกว่าปล่อยให้ไปตายที่ Headers.set ซึ่งไม่บอกว่าเป็นตัวแปรอะไร
  if (/[\r\n\t]/.test(clean)) {
    throw new Error(
      `ค่าของ ${name} มีอักขระขึ้นบรรทัดใหม่หรือแท็บอยู่ข้างใน — คัดลอกใหม่ให้เป็นบรรทัดเดียว`
    );
  }

  return clean;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
