import type { CompanionMessage } from "@/lib/companion/types";

type TavusTranscriptEntry = {
  role?: unknown;
  content?: unknown;
  timestamp?: unknown;
};

type TavusEvent = {
  event_type?: unknown;
  properties?: {
    transcript?: unknown;
  };
};

type TavusVerboseConversation = {
  events?: unknown;
};

const allowedRoles = new Set(["user", "assistant", "system"]);
type TavusMessageRole = CompanionMessage["role"];

function isCompanionRole(role: unknown): role is TavusMessageRole {
  return typeof role === "string" && allowedRoles.has(role);
}

export function extractTavusTranscriptMessages(conversation: TavusVerboseConversation): CompanionMessage[] {
  const events = Array.isArray(conversation.events) ? (conversation.events as TavusEvent[]) : [];
  const transcriptionEvent = events.find((event) => event.event_type === "application.transcription_ready");
  const transcript = transcriptionEvent?.properties?.transcript;
  if (!Array.isArray(transcript)) return [];

  return (transcript as TavusTranscriptEntry[])
    .map((entry) => {
      const role = isCompanionRole(entry.role) ? entry.role : null;
      const content = typeof entry.content === "string" ? entry.content.trim() : "";
      if (!role || !content) return null;

      const createdAt =
        typeof entry.timestamp === "number" && Number.isFinite(entry.timestamp)
          ? new Date(entry.timestamp * 1000).toISOString()
          : undefined;

      return { role, content, ...(createdAt ? { createdAt } : {}) } satisfies CompanionMessage;
    })
    .filter((message): message is CompanionMessage => Boolean(message));
}

export function extractNamedStressors(messages: CompanionMessage[]): string[] {
  const stressorPattern =
    /\b(?:hate|hating|stressed|stress|anxious|upset|angry|mad|criticized|criticism|ruminating|worried|remember)\b[^.?!\n]*?\b((?:professor|boss|manager|teacher|advisor|supervisor)\s+(?:[A-Z][a-zA-Z'-]*|[A-Z]))\b/gi;
  const stressors = new Set<string>();

  for (const message of messages) {
    if (message.role !== "user") continue;

    if (/\bno\s+no\b/i.test(message.content)) {
      for (const stressor of [...stressors]) {
        if (/^Professor\b/i.test(stressor)) stressors.delete(stressor);
      }
    }

    for (const match of message.content.matchAll(stressorPattern)) {
      const stressor = match[1]?.replace(/\s+/g, " ").trim();
      if (stressor) {
        stressors.add(stressor.replace(/^\w/, (char) => char.toUpperCase()));
      }
    }
  }

  return [...stressors];
}
