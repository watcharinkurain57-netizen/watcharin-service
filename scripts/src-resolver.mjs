/**
 * ตัวช่วยให้สคริปต์ใน scripts/ โหลดไฟล์ใน src/ ได้ตรง ๆ ด้วย node
 *
 * โค้ดใน src/ เขียนแบบที่ Next อ่าน: `@/lib/...` และ import ไฟล์ข้าง ๆ โดยไม่ใส่นามสกุล
 * ส่วน node --experimental-strip-types ต้องการ path จริงพร้อม .ts
 * hook นี้แปลให้สองอย่าง:  `@/x` → src/x   และ   ./x → ./x.ts (ถ้าไฟล์นั้นมีอยู่)
 *
 * ใช้ผ่าน module.register() จากตัวสคริปต์ — ดูตัวอย่างหัวไฟล์ scripts/audit-agents.ts
 * รองรับแค่ไฟล์ที่ไม่พึ่งของเฉพาะ Next (เช่น "server-only", next/headers)
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  let target = specifier;

  if (target.startsWith("@/")) {
    target = new URL(target.slice(2), SRC).href;
  } else if ((target.startsWith("./") || target.startsWith("../")) && context.parentURL) {
    target = new URL(target, context.parentURL).href;
  }

  if (target.startsWith("file:") && !/\.[cm]?[jt]sx?$/.test(target)) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      const candidate = `${target}${ext}`;
      if (existsSync(fileURLToPath(candidate))) return asModule(await nextResolve(candidate, context));
    }
  }

  return asModule(
    await nextResolve(target.startsWith("file:") ? pathToFileURL(fileURLToPath(target)).href : target, context)
  );
}

/**
 * ไฟล์ .ts ใน src/ เป็น ES module ทั้งหมด — บอก node ตรง ๆ ไม่ต้องให้มันเดา
 * (ไม่บอก = node ลองอ่านเป็น CommonJS ก่อน แล้วขึ้นคำเตือน MODULE_TYPELESS_PACKAGE_JSON ทุกไฟล์)
 */
function asModule(result) {
  return result.url.startsWith(SRC.href) && /\.ts$/.test(result.url) ? { ...result, format: "module-typescript" } : result;
}
