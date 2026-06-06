import { NextRequest } from "next/server";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionEventSchema } from "@/lib/companion/types";
import { env } from "@/lib/env";
import { getRedisClient, recordSessionEvent } from "@/lib/redis-store";

export const runtime = "nodejs";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await params;
    if (!sessionId) throw API_ERRORS.BAD_REQUEST("sessionId is required");

    const event = await validateRequest(req, CompanionEventSchema);
    const redis = await getRedisClient(env.REDIS_URL);
    try {
      await recordSessionEvent(redis, env.AGENT_MEMORY_DEFAULT_USER_ID, sessionId, event);
    } finally {
      await redis.quit();
    }

    return successResponse(null, "Event recorded");
  }
);
