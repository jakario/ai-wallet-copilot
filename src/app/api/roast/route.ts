import { NextResponse } from "next/server";
import {
  RoastRequestSchema,
  RoastApiResponseSchema,
} from "@/lib/schemas";
import { fetchWalletActivity30d } from "@/lib/moralis";
import { generateWalletRoast } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    const parsedReq = RoastRequestSchema.safeParse(body);
    if (!parsedReq.success) {
      const validationMsg =
        parsedReq.error.issues[0]?.message ||
        "Please enter a valid 0x... BNB Smart Chain address.";
      console.error("[API /api/roast] Validation Error:", validationMsg);
      return NextResponse.json({ error: validationMsg }, { status: 400 });
    }

    const { address, lang } = parsedReq.data;

    // 1. 100% Real On-Chain Data Fetch from Alchemy BNB Chain RPC (No mock/fallback)
    const summary = await fetchWalletActivity30d(address);

    // 2. 100% Real AI Roast Generation in selected language ("th" default, or "en")
    const result = await generateWalletRoast(summary, lang);

    const payload = {
      summary,
      result,
      lang,
      generatedAt: new Date().toISOString(),
    };

    const validatedPayload = RoastApiResponseSchema.parse(payload);

    return NextResponse.json(validatedPayload, { status: 200 });
  } catch (err: unknown) {
    const exactMessage =
      err instanceof Error ? err.message : String(err);

    // Always log the exact full error to the server terminal for debugging
    console.error("[API /api/roast] Execution failed:", err);

    return NextResponse.json(
      { error: exactMessage },
      { status: 500 }
    );
  }
}
