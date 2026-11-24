import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import {
  callOpenAiCompatibleJson,
  parseAndValidateAiJson,
  resolveOpenAiCompatibleProvider,
} from "./ai-provider";
import {
  GeminiRoastOutputSchema,
  type GeminiRoastOutput,
  type RoastLanguage,
  type WalletActivitySummary,
} from "./schemas";

function buildSystemInstruction(lang: RoastLanguage): string {
  if (lang === "th") {
    return `คุณคือ "AI Wallet Copilot" นักวิเคราะห์และนักแซวกระเป๋าคริปโตสาย BNB Smart Chain ที่กวนตีน แซ่บ ตรงจุด แต่แฝงด้วยข้อมูลเชิงลึกแบบเพื่อนสนิทในวงการคริปโตไทย
กฎเหล็กด้านภาษา:
- ตอบเนื้อหาทั้งหมด ("roast", "archetype", และ "proAdvice" ทั้ง 3 ข้อ) เป็น **ภาษาไทย** ที่อ่านลื่นเป็นธรรมชาติ ใช้ศัพท์สายคริปโตไทยได้เต็มที่ (เช่น ดอย, เม่าสายซิ่ง, ถวายค่าแก๊ส, ปั่นวอลุ่ม, มือลั่น, นั่งทับมือ, สภาพคล่องทางออก)
- อนุญาตให้ใช้ชื่อเหรียญหรือคำศัพท์เทคนิคภาษาอังกฤษมาตรฐานได้ เช่น BNB, USDT, DEX, Gas, $COAI, DeFi
- ห้ามใส่ตัวอักษรภาษาจีน (CJK), ตัวอักษรประหลาด หรือชื่อเหรียญสแกม/ลิงก์ฟิชชิ่งเด็ดขาด

วิเคราะห์ JSON ประวัติกระเป๋า 30 วันบน BNB Chain ที่ได้รับ แล้วส่งคืนเฉพาะ JSON object ที่มี 4 key นี้เป๊ะๆ:
1. "roast": string — คำแซวภาษาไทยสุดกวน แซ่บ แต่มีสาระ ความยาว 3-4 ประโยค โดยอ้างอิงตัวเลขจริงจากข้อมูลกระเป๋า (จำนวนธุรกรรม, ยอด BNB คงเหลือ, ค่าแก๊สที่จ่าย, ชื่อเหรียญที่เล่นบ่อย หรือพฤติกรรมเข้า-ออก) ถ้า "isEmptyOrNewWallet" เป็น true ให้แซวหนักๆ เรื่องเป็นสายซุ่มขี้กลัว สร้างกระเป๋ามานั่งจ้อง 0.0000 BNB ไม่กล้ากดเทรดสักไม้
2. "degenScore": integer ระหว่าง 0 ถึง 100 (0-15 สำหรับกระเป๋าว่าง/สายกลัวไม่กล้าเทรด, 40-70 สำหรับสายเทรดทั่วไป, 75-100 สำหรับสายซิ่งดีเจนผลาญค่าแก๊ส)
3. "archetype": string (ภาษาไทยสั้นๆ กระชับ 2-6 คำ ไม่เกิน 70 ตัวอักษร) — ฉายานักเทรดสุดฮา เช่น "เจ้าพ่อถวายค่าแก๊ส", "ตำนานซื้อดอยขายหมู", "นักท่องเที่ยวกระเป๋าว่าง 0 BNB", "สภาพคล่องทางออก VIP"
4. "proAdvice": array ของ string จำนวน 3 ข้อเป๊ะๆ — คำแนะนำการเทรดบน BNB Chain เป็นภาษาไทยที่นำไปใช้ได้จริง ช่วยแก้จุดอ่อนจากข้อมูลกระเป๋านี้โดยเฉพาะ`;
  }

  return `You are "AI Wallet Copilot", a savage, hilarious, street-smart Web3 & BNB Smart Chain trading roaster and DeFi analyst.
Write strictly in clean English (standard ASCII/Latin characters only — NEVER include Chinese/CJK characters, Unicode lookalike scam tickers, or phishing URLs).
Analyze the provided 30-day BNB Chain wallet JSON summary and return ONLY a strict JSON object with these exact 4 keys:
1. "roast": string — A witty, brutal, yet genuinely insightful 3-4 sentence roast referencing specific numbers from their activity (tx count, BNB balance, gas spent, top tokens, or their win/loss behavior). If "isEmptyOrNewWallet" is true, ruthlessly roast them for being a terrified sideliner who created a wallet just to stare at 0.0000 BNB and never placed a single trade.
2. "degenScore": integer between 0 and 100 (0-15 for empty/scared wallets, 40-70 for active traders, 75-100 for hyper-degen gas burners).
3. "archetype": string (3 to 60 characters) — A punchy, funny 2-5 word Trader Archetype title (e.g. "Gas Fee Philanthropist", "Buy High Sell Low Legend", "Terrified Zero-Balance Tourist", "PancakeSwap Exit Liquidity").
4. "proAdvice": array of EXACTLY 3 strings — Actionable, high-alpha BNB Chain trading coach bullet points tailored to fix their exact mistakes and optimize their portfolio.`;
}

async function generateRoastWithGemini(
  apiKey: string,
  summary: WalletActivitySummary,
  lang: RoastLanguage
): Promise<GeminiRoastOutput> {
  const isVertexKey = apiKey.startsWith("AQ.");
  const ai = new GoogleGenAI(
    isVertexKey ? { vertexai: true, apiKey } : { apiKey }
  );
  const systemInstruction = buildSystemInstruction(lang);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: JSON.stringify(summary, null, 2),
      config: {
        systemInstruction,
        temperature: 0.9,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            roast: {
              type: Type.STRING,
              description:
                "3-4 sentence witty, brutal, insightful roast of the wallet.",
            },
            degenScore: {
              type: Type.INTEGER,
              description: "Degen score between 0 and 100.",
            },
            archetype: {
              type: Type.STRING,
              description: "Funny Trader Archetype title.",
            },
            proAdvice: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Exactly 3 actionable trading advice bullet points.",
            },
          },
          required: ["roast", "degenScore", "archetype", "proAdvice"],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      const errMsg = "[Gemini API Error] Gemini returned an empty response text.";
      console.error(errMsg);
      throw new Error(errMsg);
    }

    return parseAndValidateAiJson(
      rawText,
      GeminiRoastOutputSchema,
      "Gemini API Error"
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("[Gemini API Error] generateContent failed:", err);
    throw new Error(`[Gemini API Error] ${rawMsg}`);
  }
}

export async function generateWalletRoast(
  summary: WalletActivitySummary,
  lang: RoastLanguage = "th"
): Promise<GeminiRoastOutput> {
  const provider = resolveOpenAiCompatibleProvider();
  if (provider) {
    const userPrompt =
      lang === "th"
        ? `ช่วยวิเคราะห์และแซวกระเป๋า BNB Smart Chain นี้จากข้อมูลจริงย้อนหลัง 30 วัน ตอบเป็นภาษาไทยในรูปแบบ JSON เท่านั้น:\n${JSON.stringify(
            summary,
            null,
            2
          )}`
        : `Roast this BNB Smart Chain wallet based on its 30-day on-chain data and respond strictly in JSON:\n${JSON.stringify(
            summary,
            null,
            2
          )}`;

    const responseFormat: Record<string, unknown> =
      provider.name === "Groq"
        ? {
            type: "json_schema",
            json_schema: {
              name: "wallet_roast",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  roast: { type: "string" },
                  degenScore: { type: "integer" },
                  archetype: { type: "string" },
                  proAdvice: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["roast", "degenScore", "archetype", "proAdvice"],
                additionalProperties: false,
              },
            },
          }
        : { type: "json_object" };

    return callOpenAiCompatibleJson({
      provider,
      systemInstruction: buildSystemInstruction(lang),
      userPrompt,
      temperature: 0.9,
      responseFormat,
      schema: GeminiRoastOutputSchema,
      label: "API",
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    return generateRoastWithGemini(geminiKey, summary, lang);
  }

  const errMsg =
    "[AI Engine Error] Missing CHAINOPERA_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in environment variables (.env.local).";
  console.error(errMsg);
  throw new Error(errMsg);
}
