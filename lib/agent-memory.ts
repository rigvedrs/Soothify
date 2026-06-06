import { randomUUID } from "crypto";
import type { CompanionMessage } from "@/lib/companion/types";

export type AgentMemoryConfig = {
  baseUrl: string;
  namespace: string;
  sessionId: string;
  userId: string;
  apiToken?: string;
};

type SearchOptions = Omit<AgentMemoryConfig, "sessionId"> & {
  text: string;
  limit?: number;
};

type LongTermMemoryInput = {
  text: string;
  topics?: string[];
  entities?: string[];
  memoryType?: "semantic" | "episodic";
};

type MemorySearchResponse = {
  memories?: Array<{ text?: string; memory?: { text?: string } }>;
};

const customExtractionPrompt = `Extract mental health companion memories from this conversation.

Focus on:
- recurring stressors, including work, school, relationships, health, finances, and specific people
- named people or entities tied to stress or support
- user coping preferences and calming imagery
- suggestions or styles the user dislikes
- effective and ineffective interventions
- tone preferences
- session outcomes such as helped, neutral, made worse, or unfinished

Write standalone, grounded statements. Avoid diagnosis claims.
Current datetime: {current_datetime}
Conversation: {message}`;

async function requestMemory<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  apiToken?: string
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(apiToken ? { authorization: `Bearer ${apiToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error || data?.message || response.statusText;
    throw new Error(`Agent Memory request failed: ${response.status} ${message}`);
  }

  return data as T;
}

export async function createWorkingMemory(config: AgentMemoryConfig) {
  return requestMemory(
    config.baseUrl,
    `/v1/working-memory/${config.sessionId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        namespace: config.namespace,
        user_id: config.userId,
        messages: [],
        long_term_memory_strategy: {
          strategy: "custom",
          config: { custom_prompt: customExtractionPrompt },
        },
      }),
    },
    config.apiToken
  );
}

export async function appendWorkingMemoryMessages(
  config: AgentMemoryConfig & { messages: CompanionMessage[] }
) {
  const query = `user_id=${encodeURIComponent(config.userId)}&namespace=${encodeURIComponent(config.namespace)}`;
  const current = await requestMemory<{ messages?: CompanionMessage[] }>(
    config.baseUrl,
    `/v1/working-memory/${config.sessionId}?${query}`,
    { method: "GET" },
    config.apiToken
  );

  return requestMemory(
    config.baseUrl,
    `/v1/working-memory/${config.sessionId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        namespace: config.namespace,
        user_id: config.userId,
        messages: [...(current.messages ?? []), ...config.messages].map((message) => ({
          role: message.role,
          content: message.content,
          created_at: message.createdAt ?? new Date().toISOString(),
        })),
      }),
    },
    config.apiToken
  );
}

export async function searchLongTermMemory(options: SearchOptions): Promise<string[]> {
  const data = await requestMemory<MemorySearchResponse>(
    options.baseUrl,
    "/v1/long-term-memory/search",
    {
      method: "POST",
      body: JSON.stringify({
        text: options.text,
        user_id: { eq: options.userId },
        namespace: { eq: options.namespace },
        limit: options.limit ?? 8,
      }),
    },
    options.apiToken
  );

  return (data.memories ?? [])
    .map((memory) => memory.text ?? memory.memory?.text)
    .filter((text): text is string => Boolean(text));
}

export async function createLongTermMemories(
  config: AgentMemoryConfig & { memories: LongTermMemoryInput[] }
) {
  if (config.memories.length === 0) return null;

  const now = new Date().toISOString();
  return requestMemory(
    config.baseUrl,
    "/v1/long-term-memory/",
    {
      method: "POST",
      body: JSON.stringify({
        deduplicate: true,
        memories: config.memories.map((memory) => ({
          id: randomUUID(),
          text: memory.text,
          session_id: config.sessionId,
          user_id: config.userId,
          namespace: config.namespace,
          created_at: now,
          updated_at: now,
          last_accessed: now,
          topics: memory.topics,
          entities: memory.entities,
          memory_type: memory.memoryType ?? "semantic",
          discrete_memory_extracted: "t",
        })),
      }),
    },
    config.apiToken
  );
}
