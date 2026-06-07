import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10b981, #06b6d4)",
        }}
      >
        <svg width={124} height={124} viewBox="0 0 100 100" fill="none">
          <path
            d="M24 32 L38 70 L50 46 L62 70 L76 32"
            stroke="white"
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.9}
          />
          <circle cx={24} cy={32} r={8} fill="white" />
          <circle cx={38} cy={70} r={8} fill="white" />
          <circle cx={50} cy={46} r={8} fill="white" />
          <circle cx={62} cy={70} r={8} fill="white" />
          <circle cx={76} cy={32} r={8} fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
