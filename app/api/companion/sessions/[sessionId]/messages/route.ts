import { NextRequest } from "next/server";
import { appendWorkingMemoryMessages } from "@/lib/agent-memory";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionMessageSchema } from "@/lib/companion/types";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await params;
    if (!sessionId) throw API_ERRORS.BAD_REQUEST("sessionId is required");

    const message = await validateRequest(req, CompanionMessageSchema);
    await appendWorkingMemoryMessages({
      baseUrl: env.AGENT_MEMORY_BASE_URL,
      namespace: env.AGENT_MEMORY_NAMESPACE,
      sessionId,
      userId: env.AGENT_MEMORY_DEFAULT_USER_ID,
      apiToken: env.AGENT_MEMORY_API_TOKEN,
      messages: [message],
    });

    return successResponse(null, "Message appended");
  }
);
