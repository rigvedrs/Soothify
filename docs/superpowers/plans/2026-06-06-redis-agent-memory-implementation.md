# Redis Agent Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Redis-backed Soothify companion session layer, background Agent Memory integration, and first Redis-powered dashboard experience for `demo-user`.

**Architecture:** Next.js owns provider-neutral companion sessions and dashboard APIs. Server-side adapters talk to Redis Agent Memory REST and structured Redis through small library modules, while Tavus and ElevenLabs receive the same recall/session context. MongoDB remains legacy and is not used by the new dashboard path.

**Tech Stack:** Next.js 15 App Router, TypeScript, Jest, Zod, Redis Agent Memory Server REST API, Redis structured records, ElevenLabs React SDK, Tavus conversation API. Use `asdf` for frontend Node/npm commands. Use conda environment `tinkerers` for backend Agent Memory tooling; create it if missing.

---

## File Structure

- Create `lib/companion/types.ts`
  - Provider-neutral types, constants, zod schemas, and default `demo-user` identity.
- Create `lib/agent-memory.ts`
  - Server-only REST adapter for Redis Agent Memory working memory, long-term search, and append operations.
- Create `lib/redis-store.ts`
  - Server-only structured Redis store for sessions, events, outcomes, and dashboard summaries.
- Create `app/api/companion/sessions/route.ts`
  - Creates a session, initializes Agent Memory working memory, fetches recall context, and writes structured Redis session data.
- Create `app/api/companion/sessions/[sessionId]/messages/route.ts`
  - Appends user/assistant messages into working memory and session timeline.
- Create `app/api/companion/sessions/[sessionId]/events/route.ts`
  - Logs structured stress/coping/outcome events.
- Create `app/api/companion/sessions/[sessionId]/end/route.ts`
  - Finalizes session duration, status, outcome, and summary.
- Create `app/api/dashboard/summary/route.ts`
  - Returns Redis-backed dashboard data for `demo-user`.
- Modify `lib/env.ts`
  - Add Agent Memory and Redis configuration.
- Modify `app/api/tavus/conversations/route.ts`
  - Accept `sessionId` and memory context, then pass it into Tavus `conversational_context`.
- Verify `app/api/elevenlabs/token/route.ts`
  - Keep this route provider-only; audio session creation happens in the page before requesting the signed URL.
- Modify `app/companion/audio/page.tsx` and `app/companion/audio/Client.tsx`
  - Create a Soothify session before starting audio and send session events.
- Modify `app/companion/video/page.tsx`
  - Create a Soothify session before starting Tavus and send session context.
- Replace `app/dashboard/page.tsx`
  - Use `/api/dashboard/summary` instead of Mongo-backed `/api/user-data`.
- Create `scripts/seed-redis.ts`
  - Seeds structured Redis records and Agent Memory working memory for demo extraction.
- Modify `package.json`
  - Add Redis seed script and keep existing scripts.
- Create tests:
  - `lib/__tests__/agent-memory.test.ts`
  - `lib/__tests__/redis-store.test.ts`
  - `app/api/companion/sessions/__tests__/route.test.ts`
  - `app/api/dashboard/__tests__/summary.test.ts`

## Environment Notes

Frontend commands:

```bash
asdf exec npm test
asdf exec npm run lint
asdf exec npm run dev
```

Backend Agent Memory setup:

```bash
conda env list | rg '^tinkerers\\s'
conda create -n tinkerers python=3.12 -y
conda activate tinkerers
pip install agent-memory-server agent-memory-client redis
```

Run local backend services in separate terminals:

```bash
conda activate tinkerers
agent-memory api --host 0.0.0.0 --port 8000 --task-backend=asyncio
```

Production-like local mode should use Redis plus worker:

```bash
conda activate tinkerers
agent-memory api --host 0.0.0.0 --port 8000
agent-memory task-worker --concurrency 2
```

Required app env additions:

```bash
AGENT_MEMORY_BASE_URL=http://localhost:8000
AGENT_MEMORY_NAMESPACE=soothify_companion
AGENT_MEMORY_DEFAULT_USER_ID=demo-user
AGENT_MEMORY_API_TOKEN=
REDIS_URL=redis://localhost:6379
EXTRACTION_DEBOUNCE_SECONDS=15
DISABLE_AUTH=true
```

---

### Task 1: Shared Companion Types And Environment

**Files:**
- Create: `lib/companion/types.ts`
- Modify: `lib/env.ts`
- Test: `lib/__tests__/api-utils.test.ts`

- [ ] **Step 1: Add shared companion types**

Create `lib/companion/types.ts`:

```ts
import { z } from "zod";

export const DEFAULT_COMPANION_USER_ID = "demo-user";
export const DEFAULT_MEMORY_NAMESPACE = "soothify_companion";

export const CompanionProviderSchema = z.enum(["elevenlabs", "tavus"]);
export const CompanionModeSchema = z.enum(["audio", "video"]);
export const CompanionSessionTypeSchema = z.enum(["normal"]);
export const CompanionMessageRoleSchema = z.enum(["user", "assistant", "system"]);

export const CompanionSessionCreateSchema = z.object({
  provider: CompanionProviderSchema,
  mode: CompanionModeSchema,
  userId: z.string().trim().min(1).default(DEFAULT_COMPANION_USER_ID),
});

export const CompanionMessageSchema = z.object({
  role: CompanionMessageRoleSchema,
  content: z.string().trim().min(1),
  createdAt: z.string().datetime().optional(),
});

export const CompanionEventSchema = z.object({
  type: z.enum([
    "stress_detected",
    "stress_reason",
    "coping_suggested",
    "user_response",
    "session_outcome",
  ]),
  value: z.string().trim().min(1),
  score: z.number().min(0).max(10).optional(),
  createdAt: z.string().datetime().optional(),
});

export const CompanionSessionEndSchema = z.object({
  outcome: z.enum(["helped", "neutral", "not_helped", "unfinished"]).optional(),
  summary: z.string().trim().max(2000).optional(),
  endedAt: z.string().datetime().optional(),
});

export type CompanionProvider = z.infer<typeof CompanionProviderSchema>;
export type CompanionMode = z.infer<typeof CompanionModeSchema>;
export type CompanionSessionCreate = z.infer<typeof CompanionSessionCreateSchema>;
export type CompanionMessage = z.infer<typeof CompanionMessageSchema>;
export type CompanionEvent = z.infer<typeof CompanionEventSchema>;
export type CompanionSessionEnd = z.infer<typeof CompanionSessionEndSchema>;

export type CompanionSession = {
  sessionId: string;
  userId: string;
  provider: CompanionProvider;
  mode: CompanionMode;
  sessionType: "normal";
  startedAt: string;
  endedAt?: string;
  status: "active" | "ended";
};
```

- [ ] **Step 2: Add environment variables**

Update `lib/env.ts` by adding these fields to `envSchema`:

```ts
  AGENT_MEMORY_BASE_URL: z.string().url().optional().default("http://localhost:8000"),
  AGENT_MEMORY_NAMESPACE: z.string().min(1).optional().default("soothify_companion"),
  AGENT_MEMORY_DEFAULT_USER_ID: z.string().min(1).optional().default("demo-user"),
  AGENT_MEMORY_API_TOKEN: z.string().optional().default(""),
  REDIS_URL: z.string().min(1).optional().default("redis://localhost:6379"),
```

Add these fields to the parsed object:

```ts
  AGENT_MEMORY_BASE_URL: process.env.AGENT_MEMORY_BASE_URL,
  AGENT_MEMORY_NAMESPACE: process.env.AGENT_MEMORY_NAMESPACE,
  AGENT_MEMORY_DEFAULT_USER_ID: process.env.AGENT_MEMORY_DEFAULT_USER_ID,
  AGENT_MEMORY_API_TOKEN: process.env.AGENT_MEMORY_API_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
```

- [ ] **Step 3: Run existing tests**

Run:

```bash
asdf exec npm test -- lib/__tests__/api-utils.test.ts
```

Expected: PASS. Existing API helper tests should still pass because env defaults are optional.

---

### Task 2: Agent Memory REST Adapter

**Files:**
- Create: `lib/agent-memory.ts`
- Test: `lib/__tests__/agent-memory.test.ts`

- [ ] **Step 1: Write adapter tests**

Create `lib/__tests__/agent-memory.test.ts`:

```ts
import {
  appendWorkingMemoryMessages,
  createWorkingMemory,
  searchLongTermMemory,
} from "../agent-memory";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

test("createWorkingMemory configures custom extraction strategy", async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ session_id: "s1" }), { status: 200 }));

  await createWorkingMemory({
    baseUrl: "http://memory.test",
    namespace: "soothify_companion",
    sessionId: "s1",
    userId: "demo-user",
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "http://memory.test/v1/working-memory/s1",
    expect.objectContaining({
      method: "PUT",
      headers: { "content-type": "application/json" },
    })
  );
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.user_id).toBe("demo-user");
  expect(body.namespace).toBe("soothify_companion");
  expect(body.long_term_memory_strategy.strategy).toBe("custom");
  expect(body.long_term_memory_strategy.config.custom_prompt).toContain("recurring stressors");
});

test("appendWorkingMemoryMessages sends messages to working memory", async () => {
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ messages: [{ role: "assistant", content: "I am here." }] }), { status: 200 })
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ messages: [] }), { status: 200 }));

  await appendWorkingMemoryMessages({
    baseUrl: "http://memory.test",
    namespace: "soothify_companion",
    sessionId: "s1",
    userId: "demo-user",
    messages: [{ role: "user", content: "My professor is stressing me out." }],
  });

  const body = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(body.messages).toEqual([
    expect.objectContaining({ role: "assistant", content: "I am here." }),
    expect.objectContaining({ role: "user", content: "My professor is stressing me out." }),
  ]);
});

test("searchLongTermMemory returns normalized memory text", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ memories: [{ text: "User prefers chocolate imagery." }] }), { status: 200 })
  );

  const result = await searchLongTermMemory({
    baseUrl: "http://memory.test",
    namespace: "soothify_companion",
    userId: "demo-user",
    text: "What calms the user?",
  });

  expect(result).toEqual(["User prefers chocolate imagery."]);
});

test("adapter throws useful errors for failed memory requests", async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "down" }), { status: 503 }));

  await expect(
    searchLongTermMemory({
      baseUrl: "http://memory.test",
      namespace: "soothify_companion",
      userId: "demo-user",
      text: "context",
    })
  ).rejects.toThrow("Agent Memory request failed: 503 down");
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
asdf exec npm test -- lib/__tests__/agent-memory.test.ts
```

Expected: FAIL because `lib/agent-memory.ts` does not exist.

- [ ] **Step 3: Implement adapter**

Create `lib/agent-memory.ts`:

```ts
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

async function requestMemory<T>(baseUrl: string, path: string, init: RequestInit, apiToken?: string): Promise<T> {
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
  return requestMemory(config.baseUrl, `/v1/working-memory/${config.sessionId}`, {
    method: "PUT",
    body: JSON.stringify({
      session_id: config.sessionId,
      namespace: config.namespace,
      user_id: config.userId,
      messages: [],
      long_term_memory_strategy: {
        strategy: "custom",
        config: { custom_prompt: customExtractionPrompt },
      },
    }),
  }, config.apiToken);
}

export async function appendWorkingMemoryMessages(
  config: AgentMemoryConfig & { messages: CompanionMessage[] }
) {
  const query = new URLSearchParams({
    user_id: config.userId,
    namespace: config.namespace,
  });
  const current = await requestMemory<{ messages?: CompanionMessage[] }>(
    config.baseUrl,
    `/v1/working-memory/${config.sessionId}?${query}`,
    { method: "GET" },
    config.apiToken
  );

  return requestMemory(config.baseUrl, `/v1/working-memory/${config.sessionId}`, {
    method: "PUT",
    body: JSON.stringify({
      session_id: config.sessionId,
      namespace: config.namespace,
      user_id: config.userId,
      messages: [...(current.messages ?? []), ...config.messages].map((message) => ({
        role: message.role,
        content: message.content,
        created_at: message.createdAt ?? new Date().toISOString(),
      })),
    }),
  }, config.apiToken);
}

export async function searchLongTermMemory(options: SearchOptions): Promise<string[]> {
  const data = await requestMemory<{ memories?: Array<{ text?: string }> }>(
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

  return (data.memories ?? []).map((memory) => memory.text).filter((text): text is string => Boolean(text));
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
asdf exec npm test -- lib/__tests__/agent-memory.test.ts
```

Expected: PASS.

---

### Task 3: Structured Redis Store

**Files:**
- Create: `lib/redis-store.ts`
- Test: `lib/__tests__/redis-store.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Redis client**

Run:

```bash
asdf exec npm install redis
```

Expected: `package.json` and `package-lock.json` include `redis`.

- [ ] **Step 2: Write Redis store tests with mocked client**

Create `lib/__tests__/redis-store.test.ts`:

```ts
import {
  buildDashboardSummary,
  createSessionRecord,
  recordSessionEvent,
  endSessionRecord,
} from "../redis-store";

const redis = {
  hSet: jest.fn(),
  hGetAll: jest.fn(),
  zAdd: jest.fn(),
  zRange: jest.fn(),
  lPush: jest.fn(),
  lRange: jest.fn(),
  quit: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("createSessionRecord writes session hash and user timeline", async () => {
  await createSessionRecord(redis as never, {
    sessionId: "s1",
    userId: "demo-user",
    provider: "tavus",
    mode: "video",
    sessionType: "normal",
    status: "active",
    startedAt: "2026-06-06T10:00:00.000Z",
  });

  expect(redis.hSet).toHaveBeenCalledWith("soothify:session:s1", expect.objectContaining({ provider: "tavus" }));
  expect(redis.zAdd).toHaveBeenCalledWith("soothify:user:demo-user:sessions", {
    score: new Date("2026-06-06T10:00:00.000Z").getTime(),
    value: "s1",
  });
});

test("recordSessionEvent writes event list and stressor index", async () => {
  await recordSessionEvent(redis as never, "demo-user", "s1", {
    type: "stress_reason",
    value: "Professor X criticized my project.",
    createdAt: "2026-06-06T10:01:00.000Z",
  });

  expect(redis.lPush).toHaveBeenCalledWith(
    "soothify:session:s1:events",
    expect.stringContaining("Professor X")
  );
  expect(redis.zAdd).toHaveBeenCalledWith("soothify:user:demo-user:stressors", {
    score: expect.any(Number),
    value: "Professor X criticized my project.",
  });
});

test("endSessionRecord stores outcome and summary", async () => {
  await endSessionRecord(redis as never, "s1", {
    outcome: "helped",
    summary: "Chocolate imagery helped.",
    endedAt: "2026-06-06T10:10:00.000Z",
  });

  expect(redis.hSet).toHaveBeenCalledWith(
    "soothify:session:s1",
    expect.objectContaining({ status: "ended", outcome: "helped" })
  );
});

test("buildDashboardSummary returns empty user-friendly shape", async () => {
  redis.zRange.mockResolvedValueOnce([]);

  const summary = await buildDashboardSummary(redis as never, "demo-user");

  expect(summary).toEqual({
    userId: "demo-user",
    today: { sessions: 0, stressMoments: 0, averageOutcome: "no_data", recentHelpfulMethod: null },
    whatHelps: [],
    recurringStressors: [],
    companionNotes: [],
    sessions: [],
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```bash
asdf exec npm test -- lib/__tests__/redis-store.test.ts
```

Expected: FAIL because `lib/redis-store.ts` does not exist.

- [ ] **Step 4: Implement structured Redis helpers**

Create `lib/redis-store.ts`:

```ts
import { createClient, type RedisClientType } from "redis";
import type { CompanionEvent, CompanionSession, CompanionSessionEnd } from "@/lib/companion/types";

export type RedisLike = Pick<RedisClientType, "hSet" | "hGetAll" | "zAdd" | "zRange" | "lPush" | "lRange">;

export async function getRedisClient(redisUrl: string): Promise<RedisClientType> {
  const client = createClient({ url: redisUrl });
  await client.connect();
  return client as RedisClientType;
}

export async function createSessionRecord(redis: RedisLike, session: CompanionSession) {
  await redis.hSet(`soothify:session:${session.sessionId}`, {
    ...session,
    endedAt: session.endedAt ?? "",
  });
  await redis.zAdd(`soothify:user:${session.userId}:sessions`, {
    score: new Date(session.startedAt).getTime(),
    value: session.sessionId,
  });
}

export async function recordSessionEvent(
  redis: RedisLike,
  userId: string,
  sessionId: string,
  event: CompanionEvent
) {
  const stored = {
    ...event,
    createdAt: event.createdAt ?? new Date().toISOString(),
  };
  await redis.lPush(`soothify:session:${sessionId}:events`, JSON.stringify(stored));

  if (event.type === "stress_reason") {
    await redis.zAdd(`soothify:user:${userId}:stressors`, {
      score: new Date(stored.createdAt).getTime(),
      value: event.value,
    });
  }

  if (event.type === "coping_suggested" || event.type === "session_outcome") {
    await redis.zAdd(`soothify:user:${userId}:coping`, {
      score: new Date(stored.createdAt).getTime(),
      value: event.value,
    });
  }
}

export async function endSessionRecord(redis: RedisLike, sessionId: string, end: CompanionSessionEnd) {
  await redis.hSet(`soothify:session:${sessionId}`, {
    status: "ended",
    endedAt: end.endedAt ?? new Date().toISOString(),
    outcome: end.outcome ?? "unfinished",
    summary: end.summary ?? "",
  });
}

export async function buildDashboardSummary(redis: RedisLike, userId: string) {
  const sessionIds = await redis.zRange(`soothify:user:${userId}:sessions`, 0, 9, { REV: true });

  if (sessionIds.length === 0) {
    return {
      userId,
      today: { sessions: 0, stressMoments: 0, averageOutcome: "no_data", recentHelpfulMethod: null },
      whatHelps: [] as string[],
      recurringStressors: [] as string[],
      companionNotes: [] as string[],
      sessions: [] as Array<Record<string, string>>,
    };
  }

  const sessions = await Promise.all(sessionIds.map((sessionId) => redis.hGetAll(`soothify:session:${sessionId}`)));
  const stressors = await redis.zRange(`soothify:user:${userId}:stressors`, 0, 4, { REV: true });
  const coping = await redis.zRange(`soothify:user:${userId}:coping`, 0, 4, { REV: true });

  return {
    userId,
    today: {
      sessions: sessions.length,
      stressMoments: stressors.length,
      averageOutcome: sessions.find((session) => session.outcome)?.outcome ?? "no_data",
      recentHelpfulMethod: coping[0] ?? null,
    },
    whatHelps: coping,
    recurringStressors: stressors,
    companionNotes: [] as string[],
    sessions,
  };
}
```

- [ ] **Step 5: Run tests to verify pass**

Run:

```bash
asdf exec npm test -- lib/__tests__/redis-store.test.ts
```

Expected: PASS.

---

### Task 4: Companion Session API Routes

**Files:**
- Create: `app/api/companion/sessions/route.ts`
- Create: `app/api/companion/sessions/[sessionId]/messages/route.ts`
- Create: `app/api/companion/sessions/[sessionId]/events/route.ts`
- Create: `app/api/companion/sessions/[sessionId]/end/route.ts`
- Test: `app/api/companion/sessions/__tests__/route.test.ts`

- [ ] **Step 1: Write route tests**

Create `app/api/companion/sessions/__tests__/route.test.ts`:

```ts
jest.mock("@/lib/agent-memory", () => ({
  createWorkingMemory: jest.fn(),
  searchLongTermMemory: jest.fn().mockResolvedValue(["User prefers chocolate imagery."]),
  appendWorkingMemoryMessages: jest.fn(),
}));

jest.mock("@/lib/redis-store", () => ({
  getRedisClient: jest.fn().mockResolvedValue({ quit: jest.fn() }),
  createSessionRecord: jest.fn(),
  recordSessionEvent: jest.fn(),
  endSessionRecord: jest.fn(),
}));

import { POST as createSession } from "../route";
import { POST as appendMessages } from "../../[sessionId]/messages/route";
import { POST as logEvent } from "../../[sessionId]/events/route";
import { POST as endSession } from "../../[sessionId]/end/route";

function req(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as never;
}

test("create session returns session and recall context", async () => {
  const response = await createSession(req({ provider: "tavus", mode: "video" }));
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.success).toBe(true);
  expect(json.data.session.userId).toBe("demo-user");
  expect(json.data.recallContext).toEqual(["User prefers chocolate imagery."]);
});

test("message route validates and appends message", async () => {
  const response = await appendMessages(req({ role: "user", content: "I am stressed." }), {
    params: Promise.resolve({ sessionId: "s1" }),
  });

  expect(response.status).toBe(200);
});

test("event route accepts stress reason", async () => {
  const response = await logEvent(req({ type: "stress_reason", value: "Professor X" }), {
    params: Promise.resolve({ sessionId: "s1" }),
  });

  expect(response.status).toBe(200);
});

test("end route accepts outcome", async () => {
  const response = await endSession(req({ outcome: "helped", summary: "Chocolate imagery helped." }), {
    params: Promise.resolve({ sessionId: "s1" }),
  });

  expect(response.status).toBe(200);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
asdf exec npm test -- app/api/companion/sessions/__tests__/route.test.ts
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement create session route**

Create `app/api/companion/sessions/route.ts`:

```ts
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { createWorkingMemory, searchLongTermMemory } from "@/lib/agent-memory";
import { CompanionSessionCreateSchema, type CompanionSession } from "@/lib/companion/types";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";
import { createSessionRecord, getRedisClient } from "@/lib/redis-store";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await validateRequest(req, CompanionSessionCreateSchema);
  const session: CompanionSession = {
    sessionId: randomUUID(),
    userId: body.userId,
    provider: body.provider,
    mode: body.mode,
    sessionType: "normal",
    status: "active",
    startedAt: new Date().toISOString(),
  };

  await createWorkingMemory({
    baseUrl: env.AGENT_MEMORY_BASE_URL,
    namespace: env.AGENT_MEMORY_NAMESPACE,
    sessionId: session.sessionId,
    userId: session.userId,
    apiToken: env.AGENT_MEMORY_API_TOKEN,
  });

  const recallContext = await searchLongTermMemory({
    baseUrl: env.AGENT_MEMORY_BASE_URL,
    namespace: env.AGENT_MEMORY_NAMESPACE,
    userId: session.userId,
    apiToken: env.AGENT_MEMORY_API_TOKEN,
    text: "What context helps calm and support this user during a mental health companion session?",
  });

  const redis = await getRedisClient(env.REDIS_URL);
  try {
    await createSessionRecord(redis, session);
  } finally {
    await redis.quit();
  }

  if (!session.sessionId) throw API_ERRORS.INTERNAL_SERVER_ERROR("Session was not created");

  return successResponse({ session, recallContext });
});
```

- [ ] **Step 4: Implement message route**

Create `app/api/companion/sessions/[sessionId]/messages/route.ts`:

```ts
import { NextRequest } from "next/server";
import { appendWorkingMemoryMessages } from "@/lib/agent-memory";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionMessageSchema } from "@/lib/companion/types";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
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
});
```

- [ ] **Step 5: Implement event route**

Create `app/api/companion/sessions/[sessionId]/events/route.ts`:

```ts
import { NextRequest } from "next/server";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionEventSchema } from "@/lib/companion/types";
import { env } from "@/lib/env";
import { getRedisClient, recordSessionEvent } from "@/lib/redis-store";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
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
});
```

- [ ] **Step 6: Implement end route**

Create `app/api/companion/sessions/[sessionId]/end/route.ts`:

```ts
import { NextRequest } from "next/server";
import { appendWorkingMemoryMessages } from "@/lib/agent-memory";
import { API_ERRORS, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";
import { CompanionSessionEndSchema } from "@/lib/companion/types";
import { env } from "@/lib/env";
import { endSessionRecord, getRedisClient } from "@/lib/redis-store";

export const runtime = "nodejs";

export const POST = withErrorHandler(async (req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) => {
  const { sessionId } = await params;
  if (!sessionId) throw API_ERRORS.BAD_REQUEST("sessionId is required");

  const end = await validateRequest(req, CompanionSessionEndSchema);
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

  const redis = await getRedisClient(env.REDIS_URL);
  try {
    await endSessionRecord(redis, sessionId, end);
  } finally {
    await redis.quit();
  }

  return successResponse(null, "Session ended");
});
```

- [ ] **Step 7: Run tests to verify pass**

Run:

```bash
asdf exec npm test -- app/api/companion/sessions/__tests__/route.test.ts
```

Expected: PASS.

---

### Task 5: Provider Integration

**Files:**
- Modify: `app/api/tavus/conversations/route.ts`
- Verify: `app/api/elevenlabs/token/route.ts`
- Modify: `app/companion/video/page.tsx`
- Modify: `app/companion/audio/page.tsx`
- Modify: `app/companion/audio/Client.tsx`

- [ ] **Step 1: Update Tavus route schema and payload**

In `app/api/tavus/conversations/route.ts`, extend `TavusConversationRequestSchema`:

```ts
  sessionId: z.string().trim().min(1).optional(),
  recallContext: z.array(z.string().trim().min(1)).optional(),
```

Build context:

```ts
  const memoryContext = body.recallContext?.length
    ? `Known Soothify context for this user. Use gently and verify when relevant:\n- ${body.recallContext.join("\n- ")}`
    : "";
  const conversationalContext = [body.conversationalContext, memoryContext].filter(Boolean).join("\n\n");
```

Replace the Tavus request field:

```ts
      ...(conversationalContext ? { conversational_context: conversationalContext } : {}),
```

- [ ] **Step 2: Update video page to create Soothify session**

In `app/companion/video/page.tsx`, add session state:

```ts
type CompanionSessionResponse = {
  success: boolean;
  data?: {
    session: { sessionId: string };
    recallContext: string[];
  };
  error?: string;
};

const [sessionId, setSessionId] = useState<string | null>(null);
```

At the start of `startConversation`, create session:

```ts
      const sessionResponse = await fetch("/api/companion/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "tavus", mode: "video" }),
      });
      const sessionPayload = (await sessionResponse.json()) as CompanionSessionResponse;
      if (!sessionResponse.ok || !sessionPayload.success || !sessionPayload.data) {
        throw new Error(sessionPayload.error || "Unable to create Soothify session");
      }
      setSessionId(sessionPayload.data.session.sessionId);
```

Include session data in Tavus request body:

```ts
          sessionId: sessionPayload.data.session.sessionId,
          recallContext: sessionPayload.data.recallContext,
```

In `endConversation`, call:

```ts
      if (sessionId) {
        await fetch(`/api/companion/sessions/${sessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ outcome: "unfinished", summary: "Video companion session ended." }),
        });
      }
```

- [ ] **Step 3: Verify ElevenLabs token route stays provider-only**

In `app/api/elevenlabs/token/route.ts`, keep session creation out of this provider auth route. The audio page calls `/api/companion/sessions` before `/api/elevenlabs/token`, and this route continues to return only provider auth:

```ts
return NextResponse.json({ signedUrl });
```

No server-side change is required beyond preserving this simple provider boundary.

- [ ] **Step 4: Update audio page props**

In `app/companion/audio/page.tsx`, create Soothify session before fetching signed URL:

```ts
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recallContext, setRecallContext] = useState<string[]>([]);
```

Inside `fetchSignedUrl`, before token fetch:

```ts
        const sessionResponse = await fetch("/api/companion/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: "elevenlabs", mode: "audio" }),
        });
        const sessionPayload = await sessionResponse.json();
        if (!sessionResponse.ok || !sessionPayload.success) {
          throw new Error(sessionPayload.error || "Unable to create Soothify session");
        }
        setSessionId(sessionPayload.data.session.sessionId);
        setRecallContext(sessionPayload.data.recallContext ?? []);
```

Render:

```tsx
  return <ElevenLabsAudioClient signedUrl={signedUrl} sessionId={sessionId} recallContext={recallContext} />;
```

- [ ] **Step 5: Update audio client to end session**

In `app/companion/audio/Client.tsx`, update props:

```ts
function AudioSession({
  signedUrl,
  sessionId,
  recallContext,
}: {
  signedUrl: string;
  sessionId: string | null;
  recallContext: string[];
}) {
```

In `onStop`, after `endSession()`:

```ts
    if (sessionId) {
      await fetch(`/api/companion/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome: "unfinished", summary: "Audio companion session ended." }),
      });
    }
```

Show context count in existing status text without exposing sensitive details:

```tsx
          {recallContext.length > 0 ? `Memory context loaded: ${recallContext.length} notes` : "No prior memory context yet"}
```

Update wrapper props:

```ts
export default function ElevenLabsAudioClient({
  signedUrl,
  sessionId,
  recallContext,
}: {
  signedUrl: string;
  sessionId: string | null;
  recallContext: string[];
}) {
```

- [ ] **Step 6: Run lint**

Run:

```bash
asdf exec npm run lint
```

Expected: PASS or actionable TypeScript/ESLint errors only in touched files.

---

### Task 6: Redis-Backed Dashboard API And UI

**Files:**
- Create: `app/api/dashboard/summary/route.ts`
- Create: `app/api/dashboard/__tests__/summary.test.ts`
- Replace: `app/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard route test**

Create `app/api/dashboard/__tests__/summary.test.ts`:

```ts
jest.mock("@/lib/redis-store", () => ({
  getRedisClient: jest.fn().mockResolvedValue({ quit: jest.fn() }),
  buildDashboardSummary: jest.fn().mockResolvedValue({
    userId: "demo-user",
    today: { sessions: 1, stressMoments: 2, averageOutcome: "helped", recentHelpfulMethod: "Chocolate imagery" },
    whatHelps: ["Chocolate imagery"],
    recurringStressors: ["Professor X"],
    companionNotes: ["User prefers direct grounding prompts."],
    sessions: [{ sessionId: "s1", provider: "tavus", mode: "video", summary: "Helpful session" }],
  }),
}));

import { GET } from "../summary/route";

test("dashboard summary returns redis-backed payload", async () => {
  const response = await GET(new Request("http://localhost/api/dashboard/summary") as never);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.data.userId).toBe("demo-user");
  expect(json.data.whatHelps).toEqual(["Chocolate imagery"]);
});
```

- [ ] **Step 2: Run test to verify failure**

Run:

```bash
asdf exec npm test -- app/api/dashboard/__tests__/summary.test.ts
```

Expected: FAIL because route does not exist.

- [ ] **Step 3: Implement dashboard API**

Create `app/api/dashboard/summary/route.ts`:

```ts
import { NextRequest } from "next/server";
import { successResponse, withErrorHandler } from "@/lib/api-utils";
import { env } from "@/lib/env";
import { buildDashboardSummary, getRedisClient } from "@/lib/redis-store";

export const runtime = "nodejs";

export const GET = withErrorHandler(async (req: NextRequest) => {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || env.AGENT_MEMORY_DEFAULT_USER_ID;
  const redis = await getRedisClient(env.REDIS_URL);

  try {
    const summary = await buildDashboardSummary(redis, userId);
    return successResponse(summary);
  } finally {
    await redis.quit();
  }
});
```

- [ ] **Step 4: Run dashboard route test**

Run:

```bash
asdf exec npm test -- app/api/dashboard/__tests__/summary.test.ts
```

Expected: PASS.

- [ ] **Step 5: Replace dashboard UI**

Replace `app/dashboard/page.tsx` with a client component that fetches `/api/dashboard/summary?userId=demo-user` and renders:

```tsx
"use client";

import { useEffect, useState } from "react";

type DashboardSummary = {
  userId: string;
  today: {
    sessions: number;
    stressMoments: number;
    averageOutcome: string;
    recentHelpfulMethod: string | null;
  };
  whatHelps: string[];
  recurringStressors: string[];
  companionNotes: string[];
  sessions: Array<Record<string, string>>;
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/dashboard/summary?userId=demo-user");
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || "Unable to load dashboard");
        setSummary(payload.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="card p-6 muted">Loading memory insights...</div>
      </main>
    );
  }

  if (error || !summary) {
    return (
      <main className="mx-auto max-w-6xl space-y-5">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || "No dashboard data available"}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="muted mt-2">Personal patterns your companion can use next time.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="text-sm muted">Sessions</p>
          <p className="mt-2 text-3xl font-semibold">{summary.today.sessions}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm muted">Stress Moments</p>
          <p className="mt-2 text-3xl font-semibold">{summary.today.stressMoments}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm muted">Recent Outcome</p>
          <p className="mt-2 text-xl font-semibold capitalize">{summary.today.averageOutcome.replace("_", " ")}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm muted">Recently Helpful</p>
          <p className="mt-2 text-base font-medium">{summary.today.recentHelpfulMethod ?? "No pattern yet"}</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="What Helps" items={summary.whatHelps} empty="Helpful methods will appear after sessions." />
        <Panel title="Recurring Stressors" items={summary.recurringStressors} empty="Stress patterns will appear here." />
        <Panel title="Companion Notes" items={summary.companionNotes} empty="Memory notes will appear after extraction." />
      </section>

      <section className="card p-4">
        <h2 className="text-lg font-semibold">Recent Sessions</h2>
        <div className="mt-3 space-y-3">
          {summary.sessions.length === 0 ? (
            <p className="muted">No sessions yet.</p>
          ) : (
            summary.sessions.map((session) => (
              <div key={session.sessionId} className="rounded-md border p-3">
                <p className="font-medium">{session.provider} · {session.mode}</p>
                <p className="muted mt-1 text-sm">{session.summary || session.outcome || "Session saved"}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function Panel({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="card p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="muted mt-3">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {items.map((item) => <li key={item} className="rounded-md bg-gray-50 p-2">{item}</li>)}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Run lint**

Run:

```bash
asdf exec npm run lint
```

Expected: PASS.

---

### Task 7: Demo Seed Script And Docs

**Files:**
- Create: `scripts/seed-redis.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Add Redis seed script**

Create `scripts/seed-redis.ts`:

```ts
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
  await redis.zAdd(`soothify:user:${userId}:stressors`, { score: Date.now() - 3000, value: "Professor X criticism" });
  await redis.zAdd(`soothify:user:${userId}:stressors`, { score: Date.now() - 2000, value: "Project deadlines" });
  await redis.zAdd(`soothify:user:${userId}:coping`, { score: Date.now() - 1000, value: "Chocolate imagery" });
  await redis.zAdd(`soothify:user:${userId}:coping`, { score: Date.now(), value: "Short direct grounding prompts" });

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
```

- [ ] **Step 2: Add package script**

In `package.json`, add:

```json
"seed:redis": "TS_NODE_COMPILER_OPTIONS=\"{\\\"module\\\":\\\"commonjs\\\",\\\"moduleResolution\\\":\\\"node\\\"}\" ts-node --transpile-only ./scripts/seed-redis.ts"
```

- [ ] **Step 3: Update README**

Add this section:

````md
### Redis Agent Memory

Stage 2 uses Redis Agent Memory Server plus structured Redis records for companion sessions and dashboard data.

Frontend commands should run through asdf:

```bash
asdf exec npm run dev
asdf exec npm test
```

Backend Agent Memory services should run in conda environment `tinkerers`:

```bash
conda env list | rg '^tinkerers\\s' || conda create -n tinkerers python=3.12 -y
conda activate tinkerers
pip install agent-memory-server agent-memory-client redis
agent-memory api --host 0.0.0.0 --port 8000
agent-memory task-worker --concurrency 2
```

Seed dashboard demo data:

```bash
asdf exec npm run seed:redis
```
````

- [ ] **Step 4: Run seed script with Redis running**

Run:

```bash
asdf exec npm run seed:redis
```

Expected: prints `Seeded Redis demo data for demo-user`.

---

### Task 8: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
asdf exec npm test -- lib/__tests__/agent-memory.test.ts lib/__tests__/redis-store.test.ts app/api/companion/sessions/__tests__/route.test.ts app/api/dashboard/__tests__/summary.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run:

```bash
asdf exec npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
asdf exec npm run lint
```

Expected: PASS.

- [ ] **Step 4: Run development server**

Run:

```bash
asdf exec npm run dev
```

Expected: Next.js starts, usually at `http://localhost:3000`.

- [ ] **Step 5: Manual browser checks**

Open:

```text
http://localhost:3000/companion
http://localhost:3000/companion/audio
http://localhost:3000/companion/video
http://localhost:3000/dashboard
```

Expected:

- `/companion` still shows audio/video options.
- `/companion/audio` creates a Soothify session before connecting to ElevenLabs.
- `/companion/video` creates a Soothify session and sends recall context to Tavus route.
- `/dashboard` renders Redis-backed summary and does not call `/api/user-data`.

- [ ] **Step 6: Check git status**

Run:

```bash
git status --short
```

Expected: only intentional Redis memory integration files are changed.
