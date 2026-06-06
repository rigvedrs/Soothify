import { createClient, type RedisClientType } from "redis";
import type { CompanionEvent, CompanionSession, CompanionSessionEnd } from "@/lib/companion/types";

export type DashboardSummary = {
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

export type RedisLike = {
  hSet: (key: string, value: Record<string, string | number>) => Promise<unknown>;
  hGetAll: (key: string) => Promise<Record<string, string>>;
  zAdd: (key: string, value: { score: number; value: string }) => Promise<unknown>;
  zRange: (key: string, start: number, stop: number, options?: { REV?: boolean }) => Promise<string[]>;
  lPush: (key: string, value: string) => Promise<unknown>;
  lRange: (key: string, start: number, stop: number) => Promise<string[]>;
};

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

export async function buildDashboardSummary(redis: RedisLike, userId: string): Promise<DashboardSummary> {
  const sessionIds = await redis.zRange(`soothify:user:${userId}:sessions`, 0, 9, { REV: true });

  if (sessionIds.length === 0) {
    return {
      userId,
      today: { sessions: 0, stressMoments: 0, averageOutcome: "no_data", recentHelpfulMethod: null },
      whatHelps: [],
      recurringStressors: [],
      companionNotes: [],
      sessions: [],
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
    companionNotes: [],
    sessions,
  };
}
