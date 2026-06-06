import "dotenv/config";
import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const userId = process.env.AGENT_MEMORY_DEFAULT_USER_ID ?? "demo-user";
const memoryBaseUrl = process.env.AGENT_MEMORY_BASE_URL ?? "http://localhost:8000";
const memoryNamespace = process.env.AGENT_MEMORY_NAMESPACE ?? "soothify_companion";
const memoryToken = process.env.AGENT_MEMORY_API_TOKEN ?? "";

async function main() {
  const redis = createClient({ url: redisUrl });
  await redis.connect();

  const startedAt = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const endedAt = new Date(Date.now() - 1000 * 60 * 45).toISOString();
  const sessionId = "demo-session-chocolate";

  await redis.hSet(`soothify:session:${sessionId}`, {
    sessionId,
    userId,
    provider: "tavus",
    mode: "video",
    sessionType: "normal",
    status: "ended",
    startedAt,
    endedAt,
    outcome: "helped",
    summary: "Chocolate imagery and direct grounding helped after stress about Professor X.",
  });

  await redis.zAdd(`soothify:user:${userId}:sessions`, { score: new Date(startedAt).getTime(), value: sessionId });
  await redis.zAdd(`soothify:user:${userId}:stressors`, {
    score: Date.now() - 3000,
    value: "Professor X criticism",
  });
  await redis.zAdd(`soothify:user:${userId}:stressors`, {
    score: Date.now() - 2000,
    value: "Project deadlines",
  });
  await redis.zAdd(`soothify:user:${userId}:coping`, { score: Date.now() - 1000, value: "Chocolate imagery" });
  await redis.zAdd(`soothify:user:${userId}:coping`, {
    score: Date.now(),
    value: "Short direct grounding prompts",
  });

  const response = await fetch(`${memoryBaseUrl}/v1/working-memory/${sessionId}`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(memoryToken ? { authorization: `Bearer ${memoryToken}` } : {}),
    },
    body: JSON.stringify({
      namespace: memoryNamespace,
      user_id: userId,
      messages: [
        {
          role: "user",
          content: "Professor X criticized my project again and I cannot stop thinking about it.",
          created_at: startedAt,
        },
        {
          role: "assistant",
          content: "Let's use the chocolate imagery that has helped you before and keep this grounding short.",
          created_at: endedAt,
        },
      ],
      long_term_memory_strategy: {
        strategy: "custom",
        config: {
          custom_prompt:
            "Extract recurring stressors, named people, calming preferences, disliked suggestions, and coping outcomes. Avoid diagnosis claims. Current datetime: {current_datetime}. Conversation: {message}",
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to seed Agent Memory working memory: ${response.status} ${text}`);
  }

  await redis.quit();
  console.log(`Seeded Redis demo data for ${userId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
