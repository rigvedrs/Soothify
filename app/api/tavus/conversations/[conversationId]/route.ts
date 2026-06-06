import { NextRequest } from "next/server";
import { API_ERRORS, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const GET = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) => {
    if (!env.TAVUS_API_KEY) {
      throw API_ERRORS.INTERNAL_SERVER_ERROR("Missing TAVUS_API_KEY");
    }

    const { conversationId } = await params;
    if (!conversationId) {
      throw API_ERRORS.BAD_REQUEST("Missing conversation ID");
    }

    const tavusResponse = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}`, {
      headers: {
        "x-api-key": env.TAVUS_API_KEY,
      },
    });
    const data = await tavusResponse.json().catch(() => ({}));

    if (!tavusResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "Unable to load Tavus conversation", data }), {
        status: tavusResponse.status,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "content-type": "application/json" },
    });
  }
);
