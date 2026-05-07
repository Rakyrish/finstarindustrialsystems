import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Finstar Industrial Systems Ltd - Industrial Refrigeration, HVAC and Boiler Solutions in Kenya";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          height: "100%",
          width: "100%",
          background:
            "linear-gradient(135deg, rgba(14,27,61,1) 0%, rgba(20,64,132,1) 48%, rgba(234,88,12,1) 100%)",
          color: "white",
          padding: "56px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.14,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 96,
                height: 96,
                borderRadius: 22,
                background: "rgba(255,255,255,0.95)",
                color: "#0f172a",
                fontSize: 44,
                fontWeight: 800,
              }}
            >
              F
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 24, letterSpacing: 4, textTransform: "uppercase", color: "#fdba74" }}>
                Nairobi, Kenya
              </div>
              <div style={{ fontSize: 34, fontWeight: 700 }}>
                Finstar Industrial Systems Ltd
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 920 }}>
            <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 800 }}>
              Industrial Refrigeration, HVAC, Boiler & Cold Room Solutions
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: "#dbeafe" }}>
              Serving Nairobi, Kenya, Uganda, Tanzania, Rwanda, DRC Congo and the wider East & Central African market.
            </div>
          </div>

          <div style={{ display: "flex", gap: 22, fontSize: 24, color: "#e2e8f0" }}>
            <div>Industrial Refrigeration Kenya</div>
            <div>HVAC Systems Kenya</div>
            <div>Boilers & Cold Rooms</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
