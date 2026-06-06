import { NextRequest } from "next/server";
import { API_ERRORS, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = withErrorHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ conversationId: string }> }) => {
    if (!env.TAVUS_API_KEY) {
      throw API_ERRORS.INTERNAL_SERVER_ERROR("Missing TAVUS_API_KEY");
    }

    const { conversationId } = await params;
    if (!conversationId) {
      throw API_ERRORS.BAD_REQUEST("Missing conversation ID");
    }

    const tavusResponse = await fetch(`https://tavusapi.com/v2/conversations/${conversationId}/end`, {
      method: "POST",
      headers: {
        "x-api-key": env.TAVUS_API_KEY,
      },
    });

    if (tavusResponse.status === 204) {
      return new Response(null, { status: 204 });
    }

    const data = await tavusResponse.json().catch(() => ({}));
    if (!tavusResponse.ok) {
      return new Response(JSON.stringify({ success: false, error: "Unable to end Tavus conversation", data }), {
        status: tavusResponse.status,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "content-type": "application/json" },
    });
  }
);
