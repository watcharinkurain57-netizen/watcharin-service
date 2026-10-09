"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/** Supabase สำหรับฝั่งเบราว์เซอร์ — ใช้ตอน login และตอนอัปโหลดไฟล์ */
export function createSupabaseBrowserClient() {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient(url, publishableKey);
}
