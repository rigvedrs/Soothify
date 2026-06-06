import { NextRequest } from "next/server";
import { appendWorkingMemoryMessages, createLongTermMemories } from "@/lib/agent-memory";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionSessionEndSchema, type CompanionMessage } from "@/lib/companion/types";
import { env } from "@/lib/env";
import { endSessionRecord, getRedisClient, recordSessionEvent } from "@/lib/redis-store";
import { extractNamedStressors, extractTavusTranscriptMessages } from "@/lib/tavus-transcript";

export const runtime = "nodejs";

export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await params;
    if (!sessionId) throw API_ERRORS.BAD_REQUEST("sessionId is required");

    const end = await validateRequest(req, CompanionSessionEndSchema);
    let transcriptMessages: CompanionMessage[] = [];

    if (end.tavusConversationId && env.TAVUS_API_KEY) {
      const tavusResponse = await fetch(
        `https://tavusapi.com/v2/conversations/${encodeURIComponent(end.tavusConversationId)}?verbose=true`,
        {
          headers: { "x-api-key": env.TAVUS_API_KEY },
        }
      );
      if (tavusResponse.ok) {
        transcriptMessages = extractTavusTranscriptMessages(await tavusResponse.json());
      }
    }

    if (transcriptMessages.length > 0) {
      await appendWorkingMemoryMessages({
        baseUrl: env.AGENT_MEMORY_BASE_URL,
        namespace: env.AGENT_MEMORY_NAMESPACE,
        sessionId,
        userId: env.AGENT_MEMORY_DEFAULT_USER_ID,
        apiToken: env.AGENT_MEMORY_API_TOKEN,
        messages: transcriptMessages,
      });
    }

    if (end.summary) {
      await appendWorkingMemoryMessages({
        baseUrl: env.AGENT_MEMORY_BASE_URL,
        namespace: env.AGENT_MEMORY_NAMESPACE,
        sessionId,
        userId: env.AGENT_MEMORY_DEFAULT_USER_ID,
        apiToken: env.AGENT_MEMORY_API_TOKEN,
        messages: [{ role: "system", content: `Session ended. Summary: ${end.summary}` }],
      });
    }

    const namedStressors = extractNamedStressors(transcriptMessages);
    if (namedStressors.length > 0) {
      await createLongTermMemories({
        baseUrl: env.AGENT_MEMORY_BASE_URL,
        namespace: env.AGENT_MEMORY_NAMESPACE,
        sessionId,
        userId: env.AGENT_MEMORY_DEFAULT_USER_ID,
        apiToken: env.AGENT_MEMORY_API_TOKEN,
        memories: namedStressors.map((stressor) => ({
          text: `${stressor} is a recurring stressor the user explicitly asked the companion to remember.`,
          topics: ["stressors", "people", "mental health"],
          entities: [stressor],
          memoryType: "semantic",
        })),
      });
    }

    const redis = await getRedisClient(env.REDIS_URL);
    try {
      for (const stressor of namedStressors) {
        await recordSessionEvent(redis, env.AGENT_MEMORY_DEFAULT_USER_ID, sessionId, {
          type: "stress_reason",
          value: stressor,
        });
      }
      await endSessionRecord(redis, sessionId, end);
    } finally {
      await redis.quit();
    }

    return successResponse(null, "Session ended");
  }
);
