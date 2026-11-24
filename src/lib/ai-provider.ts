import "server-only";
import { type z } from "zod";

export interface OpenAiCompatibleProviderConfig {
  name: "ChainOpera" | "Groq";
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * Resolves the primary OpenAI-compatible AI provider.
 * Priority 1: ChainOpera Unified Model API (when CHAINOPERA_API_KEY is configured).
 * Priority 2: Groq API (current free-tier production baseline).
 */
export function resolveOpenAiCompatibleProvider(): OpenAiCompatibleProviderConfig | null {
  const chainOperaKey = process.env.CHAINOPERA_API_KEY?.trim();
  if (chainOperaKey && chainOperaKey !== "your_chainopera_api_key_here") {
    const baseUrl = (
      process.env.CHAINOPERA_API_BASE_URL?.trim() ||
      "https://api.chainopera.ai/v1"
    ).replace(/\/+$/, "");

    return {
      name: "ChainOpera",
      apiKey: chainOperaKey,
      baseUrl,
      model: process.env.CHAINOPERA_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey && groqKey !== "your_groq_api_key_here") {
    return {
      name: "Groq",
      apiKey: groqKey,
      baseUrl: "https://api.groq.com/openai/v1",
      model: process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b",
    };
  }

  return null;
}

export function stripMarkdownJsonFences(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

export function parseAndValidateAiJson<T>(
  rawText: string,
  schema: z.ZodType<T>,
  errorPrefix: string
): T {
  const cleaned = stripMarkdownJsonFences(rawText);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch (parseErr) {
    const errMsg = `[${errorPrefix}] Model returned invalid JSON: ${rawText}`;
    console.error(errMsg, parseErr);
    throw new Error(errMsg);
  }

  const validated = schema.safeParse(parsedJson);
  if (!validated.success) {
    const errMsg = `[${errorPrefix}] Output failed Zod schema validation: ${JSON.stringify(
      validated.error.flatten()
    )}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return validated.data;
}

export async function callOpenAiCompatibleJson<T>(options: {
  provider: OpenAiCompatibleProviderConfig;
  systemInstruction: string;
  userPrompt: string;
  temperature: number;
  responseFormat: Record<string, unknown>;
  schema: z.ZodType<T>;
  label: string;
}): Promise<T> {
  const {
    provider,
    systemInstruction,
    userPrompt,
    temperature,
    responseFormat,
    schema,
    label,
  } = options;

  const errorPrefix = `${provider.name} ${label}`;
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${provider.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: provider.model,
      temperature,
      response_format: responseFormat,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    const errMsg = `[${errorPrefix} HTTP ${res.status}] ${
      bodyText || res.statusText
    }`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const rawText = data.choices?.[0]?.message?.content;

  if (!rawText) {
    const errMsg = `[${errorPrefix} Error] Empty completion response: ${JSON.stringify(
      data
    )}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  return parseAndValidateAiJson(rawText, schema, `${errorPrefix} Error`);
}
