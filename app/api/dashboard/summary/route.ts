import { NextRequest } from "next/server";
import { API_ERRORS, successResponse, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";
import { buildDashboardSummary, getRedisClient } from "@/lib/redis-store";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const userId =
    req.nextUrl?.searchParams.get("userId") ||
    new URLSearchParams(req.url.split("?")[1] ?? "").get("userId") ||
    env.AGENT_MEMORY_DEFAULT_USER_ID;
  const redis = await getRedisClient(env.REDIS_URL).catch(() => {
    throw API_ERRORS.INTERNAL_SERVER_ERROR("Redis unavailable. Start Redis before opening the memory dashboard.");
  });

  try {
    const summary = await buildDashboardSummary(redis, userId);
    return successResponse(summary);
  } finally {
    await redis.quit();
  }
});
