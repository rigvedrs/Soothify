import { NextRequest } from "next/server";
import { API_ERRORS, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";

export const runtime = "nodejs";

type EmbeddingsRequestBody = {
  model?: string;
  input?: unknown;
  encoding_format?: unknown;
  dimensions?: number;
  user?: string;
  provider?: unknown;
  input_type?: string;
};

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (!env.OPENROUTER_API_KEY) {
    throw API_ERRORS.INTERNAL_SERVER_ERROR("OPENROUTER_API_KEY is required for OpenRouter embeddings.");
  }

  const body = (await req.json()) as EmbeddingsRequestBody;
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      encoding_format: "float",
    }),
  });

  return new Response(await response.text(), {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
});
