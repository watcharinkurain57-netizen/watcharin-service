import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Watcharin Service — System Design Studio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #ecfdf5 0%, #ffffff 50%, #ecfeff 100%)",
          fontFamily: "Inter, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(16,185,129,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#10b981",
            }}
          />
          <div
            style={{ fontSize: 32, fontWeight: 700, color: "#0f172a" }}
          >
            Watcharin{" "}
            <span style={{ color: "#10b981" }}>Service</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 20px",
              background: "#ffffff",
              border: "2px solid #a7f3d0",
              borderRadius: 999,
              color: "#047857",
              fontSize: 24,
              fontWeight: 500,
              width: "fit-content",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: "#10b981",
              }}
            />
            System Design Studio
          </div>
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            วางระบบธุรกิจ
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, #10b981 0%, #06b6d4 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              จากแนวคิด สู่ระบบจริง
            </span>
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#475569",
              fontWeight: 500,
            }}
          >
            Web · Mobile · AI Integration · Enterprise
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#64748b",
            fontSize: 24,
          }}
        >
          <div>watcharin-service.com</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#0f172a", fontWeight: 600 }}>
              Watcharin Kurain
            </span>
            <span>· Software Architect</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
