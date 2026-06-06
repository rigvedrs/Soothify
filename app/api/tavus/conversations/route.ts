import { NextRequest } from "next/server";
import { z } from "zod";
import { API_ERRORS, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";

export const runtime = "nodejs";

const TavusConversationRequestSchema = z.object({
  conversationName: z.string().trim().min(1).max(120).optional(),
  conversationalContext: z.string().trim().max(2000).optional(),
  customGreeting: z.string().trim().max(500).optional(),
  testMode: z.boolean().optional(),
});

type TavusErrorResponse = {
  error?: string;
  message?: string;
  detail?: string;
};

export const POST = withErrorHandler(async (req: NextRequest) => {
  if (!env.TAVUS_API_KEY) {
    throw API_ERRORS.INTERNAL_SERVER_ERROR("Missing TAVUS_API_KEY");
  }

  if (!env.TAVUS_REPLICA_ID && !env.TAVUS_PERSONA_ID) {
    throw API_ERRORS.INTERNAL_SERVER_ERROR("Missing TAVUS_REPLICA_ID or TAVUS_PERSONA_ID");
  }

  const body = TavusConversationRequestSchema.parse(await req.json().catch(() => ({})));

  const tavusResponse = await fetch("https://tavusapi.com/v2/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.TAVUS_API_KEY,
    },
    body: JSON.stringify({
      ...(env.TAVUS_REPLICA_ID ? { replica_id: env.TAVUS_REPLICA_ID } : {}),
      ...(env.TAVUS_PERSONA_ID ? { persona_id: env.TAVUS_PERSONA_ID } : {}),
      conversation_name: body.conversationName ?? "Soothify Video Companion",
      ...(body.conversationalContext ? { conversational_context: body.conversationalContext } : {}),
      ...(body.customGreeting ? { custom_greeting: body.customGreeting } : {}),
      ...(typeof body.testMode === "boolean" ? { test_mode: body.testMode } : {}),
    }),
  });

  const data = await tavusResponse.json().catch(() => ({}));

  if (!tavusResponse.ok) {
    const errorData = data as TavusErrorResponse;
    const message =
      errorData.error ||
      errorData.message ||
      errorData.detail ||
      `Tavus request failed with status ${tavusResponse.status}`;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: tavusResponse.status,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { "content-type": "application/json" },
  });
});
