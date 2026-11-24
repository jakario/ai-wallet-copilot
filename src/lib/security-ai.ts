import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import {
  callOpenAiCompatibleJson,
  parseAndValidateAiJson,
  resolveOpenAiCompatibleProvider,
} from "./ai-provider";
import {
  AiSecurityAnalysisSchema,
  type AddressSecurityReport,
  type AiSecurityAnalysis,
  type ApprovalRiskItem,
  type PhishingSiteReport,
  type RoastLanguage,
  type TokenSecurityReport,
} from "./schemas";

interface AnalyzeSecurityParams {
  mode: "wallet" | "token" | "url";
  targetAddress: string;
  tokens: TokenSecurityReport[];
  approvals: ApprovalRiskItem[];
  addressSecurity?: AddressSecurityReport | null;
  riskySpenderReports?: AddressSecurityReport[];
  phishingReport?: PhishingSiteReport | null;
  lang: RoastLanguage;
}

function buildSecuritySystemInstruction(lang: RoastLanguage): string {
  if (lang === "th") {
    return `คุณคือ "AI Security Doctor" ผู้เชี่ยวชาญด้านความปลอดภัย Web3 บน BNB Smart Chain (BSC) ที่อธิบายความเสี่ยง Smart Contract, Token Approvals, ประวัติ Address ดูดเงิน/Drainer และลิงก์ Phishing ให้คนทั่วไปเข้าใจง่าย ชัดเจน
กฎเหล็ก:
- อ้างอิงเฉพาะข้อมูลจริงที่ส่งให้เท่านั้น ห้ามแต่งชื่อเหรียญ เว็บไซต์ สัญญา หรือความเสี่ยงที่ไม่มีในข้อมูล
- ตอบเนื้อหาทั้งหมด ("plainEnglishSummary", "flaggedTokens[].reasons", และ "proRemediationSteps") เป็น **ภาษาไทย** ที่ชัดเจน อ่านง่าย และนำไปปฏิบัติตามได้จริง
- ใช้ได้เฉพาะคำศัพท์มาตรฐาน (เช่น Honeypot, Tax, Unlimited Approval, Revoke, Phishing, Proxy, BscScan) ห้ามใส่ตัวอักษรภาษาจีนหรือข้อความหลอกลวง

ส่งคืนเฉพาะ JSON object ที่มี 5 key นี้เป๊ะๆ:
1. "safetyScore": integer 0-100
   - 90-100 = ปลอดภัยมาก (เช่น dApp ที่ผ่าน Audit และอยู่ใน Trust List หรือกระเป๋า/เหรียญที่ไม่พบความเสี่ยง)
   - 60-89 = ควรระวัง (เช่น เว็บ/dApp ที่ยังไม่ถูกรับรองในระบบ GoPlus, โดเมนคล้ายแบรนด์ดัง, สัญญา Proxy หรือมี Approval เล็กน้อย)
   - 0-59 = อันตราย (พบ Phishing Site, สัญญาอันตราย, Address มีประวัติ Drainer/Stealing/Phishing, Honeypot, ภาษีโหด หรือ Unlimited Approval ไปยัง Spender ที่ไม่น่าเชื่อถือ)
2. "riskLevel": "SAFE" | "CAUTION" | "DANGER" (ต้องสอดคล้องกับ safetyScore และความเสี่ยงจริง)
3. "plainEnglishSummary": string (ความยาว 2-4 ประโยค สรุปสถานะความปลอดภัยเป็นภาษาไทยที่เข้าใจง่าย อ้างอิงชื่อเหรียญ, โดเมนเว็บไซต์, สถานะ Audit, หรือประวัติ Drainer/Approval จริงที่ตรวจพบ)
4. "flaggedTokens": array ของ object { "symbol": string, "contractAddress": string, "severity": "CAUTION" | "DANGER", "reasons": string[] }
   - สำหรับโหมด wallet/token: ใส่เฉพาะเหรียญหรือ Approval/Spender ที่มีความเสี่ยง CAUTION หรือ DANGER จริง (ถ้าปลอดภัยทั้งหมดให้คืน [])
   - สำหรับโหมด url: สามารถคืน [] ได้หากไม่มี Smart Contract อันตรายเฉพาะเจาะจง หรือใส่โดเมน/ความเสี่ยงที่ตรวจพบได้
5. "proRemediationSteps": array ของ string (3-5 ข้อ) — ขั้นตอนปฏิบัติเป็นภาษาไทยเพื่อป้องกันกระเป๋า ยกเลิก Approval (Revoke) หรือตรวจสอบเว็บปลอมก่อนกด Sign ธุรกรรม`;
  }

  return `You are "AI Security Doctor", a Web3 security analyst on BNB Smart Chain (BSC) who explains smart-contract risks, token approvals, drainer/malicious address history, and phishing URLs in clear, non-jargon English.
Strict rules:
- Base your assessment strictly on the provided GoPlus scan JSON. NEVER invent tokens, domains, contracts, or risk flags not present in the input.
- Write strictly in clean English (standard ASCII/Latin characters only — NEVER include Chinese/CJK characters or scam URLs).

Return ONLY a strict JSON object with these exact 5 keys:
1. "safetyScore": integer 0-100
   - 90-100 = very safe (trusted audited dApp or clean wallet/token with no risk flags)
   - 60-89 = caution (unregistered/unaudited dApp, lookalike domain suspect, proxy contract, or minor flags)
   - 0-59 = danger (confirmed phishing site, malicious contract, drainer/stealing/phishing address history, honeypot, extreme taxes, or untrusted unlimited approvals)
2. "riskLevel": "SAFE" | "CAUTION" | "DANGER" (must align with safetyScore and actual scan findings).
3. "plainEnglishSummary": string (2-4 clear, jargon-free sentences summarizing the findings, referencing actual scanned token symbols, dApp project/audit status, domain lookalike risks, drainer history, or approval exposure).
4. "flaggedTokens": array of { "symbol": string, "contractAddress": string, "severity": "CAUTION" | "DANGER", "reasons": string[] } — include ONLY genuinely risky tokens/approvals from the scan (return [] in url mode if no specific malicious contract is listed, or if everything is SAFE).
5. "proRemediationSteps": array of 3-5 actionable strings detailing exact remediation, approval revocation, or pre-sign URL verification steps tailored to the findings.`;
}

function buildSecurityUserPayload(params: AnalyzeSecurityParams): string {
  const payload = {
    mode: params.mode,
    targetAddress: params.targetAddress,
    scannedTokenCount: params.tokens.length,
    activeApprovalCount: params.approvals.length,
    scannedTokens: params.tokens,
    approvals: params.approvals,
    addressSecurity: params.addressSecurity ?? null,
    riskySpenderReports: params.riskySpenderReports ?? [],
    phishingReport: params.phishingReport ?? null,
  };
  return JSON.stringify(payload, null, 2);
}

async function analyzeSecurityWithGemini(
  apiKey: string,
  params: AnalyzeSecurityParams
): Promise<AiSecurityAnalysis> {
  const isVertexKey = apiKey.startsWith("AQ.");
  const ai = new GoogleGenAI(
    isVertexKey ? { vertexai: true, apiKey } : { apiKey }
  );

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildSecurityUserPayload(params),
      config: {
        systemInstruction: buildSecuritySystemInstruction(params.lang),
        temperature: 0.25,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safetyScore: { type: Type.INTEGER },
            riskLevel: { type: Type.STRING },
            plainEnglishSummary: { type: Type.STRING },
            flaggedTokens: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  contractAddress: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  reasons: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["symbol", "contractAddress", "severity", "reasons"],
              },
            },
            proRemediationSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: [
            "safetyScore",
            "riskLevel",
            "plainEnglishSummary",
            "flaggedTokens",
            "proRemediationSteps",
          ],
        },
      },
    });

    const rawText = response.text;
    if (!rawText) {
      const errMsg =
        "[Gemini Security Error] Gemini returned an empty response text.";
      console.error(errMsg);
      throw new Error(errMsg);
    }

    return parseAndValidateAiJson(
      rawText,
      AiSecurityAnalysisSchema,
      "Gemini Security Error"
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error("[Gemini Security Error] generateContent failed:", err);
    throw new Error(`[Gemini Security Error] ${rawMsg}`);
  }
}

export async function analyzeSecurityRisks(
  params: AnalyzeSecurityParams
): Promise<AiSecurityAnalysis> {
  const provider = resolveOpenAiCompatibleProvider();
  if (provider) {
    const scanJson = buildSecurityUserPayload(params);
    const userPrompt =
      params.lang === "th"
        ? `ช่วยวิเคราะห์ความเสี่ยงจากผลสแกน GoPlus บน BNB Chain นี้และตอบเป็น JSON ภาษาไทยเท่านั้น:\n${scanJson}`
        : `Analyze this BNB Smart Chain GoPlus security scan and respond strictly in JSON:\n${scanJson}`;

    const responseFormat: Record<string, unknown> =
      provider.name === "Groq"
        ? {
            type: "json_schema",
            json_schema: {
              name: "security_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  safetyScore: { type: "integer" },
                  riskLevel: {
                    type: "string",
                    enum: ["SAFE", "CAUTION", "DANGER"],
                  },
                  plainEnglishSummary: { type: "string" },
                  flaggedTokens: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        symbol: { type: "string" },
                        contractAddress: { type: "string" },
                        severity: {
                          type: "string",
                          enum: ["CAUTION", "DANGER"],
                        },
                        reasons: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "symbol",
                        "contractAddress",
                        "severity",
                        "reasons",
                      ],
                      additionalProperties: false,
                    },
                  },
                  proRemediationSteps: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: [
                  "safetyScore",
                  "riskLevel",
                  "plainEnglishSummary",
                  "flaggedTokens",
                  "proRemediationSteps",
                ],
                additionalProperties: false,
              },
            },
          }
        : { type: "json_object" };

    return callOpenAiCompatibleJson({
      provider,
      systemInstruction: buildSecuritySystemInstruction(params.lang),
      userPrompt,
      temperature: 0.25,
      responseFormat,
      schema: AiSecurityAnalysisSchema,
      label: "Security",
    });
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && geminiKey !== "your_gemini_api_key_here") {
    return analyzeSecurityWithGemini(geminiKey, params);
  }

  const errMsg =
    "[AI Security Error] Missing CHAINOPERA_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY in environment variables (.env.local).";
  console.error(errMsg);
  throw new Error(errMsg);
}
