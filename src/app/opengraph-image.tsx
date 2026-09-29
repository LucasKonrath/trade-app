import { ImageResponse } from "next/og";

export const alt = "Mulligan — Descarte o que não quer. Compre o que precisa.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
            "radial-gradient(circle at 30% 20%, #17305c 0%, #0a1e42 60%, #061530 100%)",
          fontFamily: "system-ui, sans-serif",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* Top-left monogram badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              width: 84,
              height: 84,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#e89419",
              color: "#0a1e42",
              fontSize: 60,
              fontWeight: 900,
              letterSpacing: -3,
              borderRadius: 18,
            }}
          >
            M
          </div>
          <div
            style={{
              fontSize: 44,
              fontWeight: 800,
              letterSpacing: -1,
              color: "#f5eddd",
            }}
          >
            Mulligan
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1.05,
              color: "#ffffff",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>Descarte o que não quer.</span>
            <span style={{ color: "#e89419" }}>Compre o que precisa.</span>
          </div>
          <div
            style={{
              fontSize: 30,
              color: "hsl(35, 30%, 82%)",
              maxWidth: 900,
              lineHeight: 1.3,
              display: "flex",
            }}
          >
            Anuncie suas cartas, ache quem tem o que você quer, negocie na hora. Direto da sua lojinha.
          </div>
        </div>

        {/* Bottom orange stripe */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 8,
            background: "#e89419",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
