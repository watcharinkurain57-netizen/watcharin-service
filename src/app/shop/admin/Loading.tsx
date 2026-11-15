"use client";

/** ระหว่างโหลด: "กำลังโหลด…" · โหลดไม่สำเร็จ: บอกเหตุผล + ปุ่มลองใหม่ (ไม่ค้างไว้เฉย ๆ) */
export function Loading({ err, onRetry }: { err: string; onRetry: () => void }) {
  if (!err) return <p className="shop-sub">กำลังโหลด…</p>;
  return (
    <div className="adm-retry" role="alert">
      <p className="shop-err">{err}</p>
      <button type="button" className="shop-btn is-ghost" onClick={onRetry}>ลองใหม่</button>
    </div>
  );
}
