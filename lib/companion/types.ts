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
  tavusConversationId: z.string().trim().min(1).optional(),
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
