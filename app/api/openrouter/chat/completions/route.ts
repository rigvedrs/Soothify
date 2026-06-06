import { NextRequest } from "next/server";
import { API_ERRORS, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (!env.OPENROUTER_API_KEY) {
    throw API_ERRORS.INTERNAL_SERVER_ERROR("OPENROUTER_API_KEY is required for OpenRouter chat completions.");
  }

  const body = await req.json();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
});
