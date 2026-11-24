import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

type FontOption = {
  name: string;
  data: ArrayBuffer;
  style: "normal";
  weight: 400 | 700;
};

let cachedFontsPromise: Promise<FontOption[]> | null = null;

async function loadOgFonts(): Promise<FontOption[]> {
  if (!cachedFontsPromise) {
    cachedFontsPromise = (async () => {
      const fontConfigs: { url: string; weight: 400 | 700 }[] = [
        {
          url: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@latest/thai-400-normal.ttf",
          weight: 400,
        },
        {
          url: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@latest/thai-700-normal.ttf",
          weight: 700,
        },
        {
          url: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@latest/latin-400-normal.ttf",
          weight: 400,
        },
        {
          url: "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@latest/latin-700-normal.ttf",
          weight: 700,
        },
      ];

      const results = await Promise.all(
        fontConfigs.map(async ({ url, weight }) => {
          try {
            const res = await fetch(url, { next: { revalidate: 86400 } });
            if (!res.ok) return null;
            const data = await res.arrayBuffer();
            return {
              name: "Noto Sans Thai",
              data,
              style: "normal" as const,
              weight,
            };
          } catch {
            return null;
          }
        })
      );

      return results.filter((f): f is FontOption => f !== null);
    })();
  }
  return cachedFontsPromise;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const lang = searchParams.get("lang") === "en" ? "en" : "th";
  const address = searchParams.get("address") || "0x0000...dEaD";
  const shortAddr =
    address.length > 14
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address;
  const score = Math.min(
    100,
    Math.max(0, Number(searchParams.get("score") ?? "69"))
  );

  const defaultArchetype =
    lang === "th" ? "เจ้าพ่อถวายค่าแก๊ส" : "Gas Fee Philanthropist";
  const defaultRoast =
    lang === "th"
      ? "แปะ Address ของคุณ แล้วให้ AI แฉนิสัยการเทรดบน BNB Chain แบบตรงไปตรงมา โดยไม่ต้องเชื่อมต่อกระเป๋า!"
      : "BNB Chain validators love this wallet because it donates gas fees around the clock while chasing green candles on PancakeSwap.";

  const archetype = (
    searchParams.get("archetype") || defaultArchetype
  ).slice(0, 64);
  const roast = (searchParams.get("roast") || defaultRoast).slice(0, 260);

  const scoreColor =
    score >= 75 ? "#f59e0b" : score >= 35 ? "#10b981" : "#38bdf8";

  const fonts = await loadOgFonts();

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#020617",
          backgroundImage:
            "radial-gradient(circle at 12% 18%, rgba(16, 185, 129, 0.22) 0%, transparent 45%), radial-gradient(circle at 88% 82%, rgba(245, 158, 11, 0.20) 0%, transparent 50%)",
          padding: "54px 64px",
          color: "#f8fafc",
          fontFamily:
            fonts.length > 0 ? '"Noto Sans Thai", sans-serif' : "sans-serif",
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981, #f59e0b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                color: "#020617",
              }}
            >
              AI
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "26px",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  color: "#ffffff",
                }}
              >
                AI WALLET COPILOT
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: "#10b981",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                POWERED BY $COAI • BNB SMART CHAIN
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 20px",
              borderRadius: "999px",
              backgroundColor: "rgba(15, 23, 42, 0.85)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontSize: "18px",
              color: "#cbd5e1",
            }}
          >
            {`Wallet: ${shortAddr}`}
          </div>
        </div>

        {/* Main Roast Card */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "40px",
            padding: "36px 44px",
            borderRadius: "28px",
            backgroundColor: "rgba(15, 23, 42, 0.78)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(245, 158, 11, 0.16)",
                  color: "#fbbf24",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                }}
              >
                {lang === "th" ? "ฉายานักเทรด" : "TRADER ARCHETYPE"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: "38px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.25,
              }}
            >
              {`“${archetype}”`}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: "20px",
                fontWeight: 400,
                color: "#cbd5e1",
                lineHeight: 1.5,
              }}
            >
              {roast}
            </div>
          </div>

          {/* Degen Score Badge */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "215px",
              height: "215px",
              borderRadius: "28px",
              backgroundColor: "rgba(2, 6, 23, 0.85)",
              border: `3px solid ${scoreColor}`,
              padding: "20px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                color: "#94a3b8",
              }}
            >
              {lang === "th" ? "คะแนนดีเจน" : "DEGEN SCORE"}
            </span>
            <span
              style={{
                fontSize: "76px",
                fontWeight: 700,
                color: scoreColor,
                lineHeight: 1.05,
                marginTop: "6px",
              }}
            >
              {`${score}`}
            </span>
            <span
              style={{
                fontSize: "16px",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              / 100
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "16px",
            color: "#94a3b8",
          }}
        >
          <span>
            {lang === "th"
              ? "แค่แปะ Address รู้นิสัยการเทรด ป้องกันกระเป๋า และลุยเชนใหม่ด้วย AI"
              : "Paste your address. Know your habits, secure your assets, and master new chains with AI."}
          </span>
          <span style={{ color: "#10b981", fontWeight: 700 }}>
            {lang === "th"
              ? "ไม่ต้องต่อกระเป๋า • ปลดล็อก Pro ด้วย $COAI"
              : "No Wallet Connect Needed • Unlock Pro with $COAI"}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
