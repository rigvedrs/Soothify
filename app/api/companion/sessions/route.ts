import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { createWorkingMemory, searchLongTermMemory } from "@/lib/agent-memory";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionSessionCreateSchema, type CompanionSession } from "@/lib/companion/types";
import { env } from "@/lib/env";
import { createSessionRecord, getRedisClient } from "@/lib/redis-store";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await validateRequest(req, CompanionSessionCreateSchema);
  const session: CompanionSession = {
    sessionId: randomUUID(),
    userId: body.userId ?? env.AGENT_MEMORY_DEFAULT_USER_ID,
    provider: body.provider,
    mode: body.mode,
    sessionType: "normal",
    status: "active",
    startedAt: new Date().toISOString(),
  };

  try {
    await createWorkingMemory({
      baseUrl: env.AGENT_MEMORY_BASE_URL,
      namespace: env.AGENT_MEMORY_NAMESPACE,
      sessionId: session.sessionId,
      userId: session.userId,
      apiToken: env.AGENT_MEMORY_API_TOKEN,
    });
  } catch {
    throw API_ERRORS.INTERNAL_SERVER_ERROR(
      "Memory service unavailable. Start Redis Agent Memory before starting a companion session."
    );
  }

  const recallContext = await searchLongTermMemory({
    baseUrl: env.AGENT_MEMORY_BASE_URL,
    namespace: env.AGENT_MEMORY_NAMESPACE,
    userId: session.userId,
    apiToken: env.AGENT_MEMORY_API_TOKEN,
    text: "What context helps calm and support this user during a mental health companion session?",
  }).catch(() => [] as string[]);

  const redis = await getRedisClient(env.REDIS_URL).catch(() => {
    throw API_ERRORS.INTERNAL_SERVER_ERROR(
      "Redis unavailable. Start Redis before starting a memory-backed companion session."
    );
  });
  try {
    await createSessionRecord(redis, session);
  } finally {
    await redis.quit();
  }

  if (!session.sessionId) throw API_ERRORS.INTERNAL_SERVER_ERROR("Session was not created");

  return successResponse({ session, recallContext });
});
