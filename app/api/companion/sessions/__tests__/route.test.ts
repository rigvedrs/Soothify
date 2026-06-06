jest.mock("@/lib/agent-memory", () => ({
  createWorkingMemory: jest.fn(),
  searchLongTermMemory: jest.fn().mockResolvedValue(["User prefers chocolate imagery."]),
  appendWorkingMemoryMessages: jest.fn(),
  createLongTermMemories: jest.fn(),
}));

jest.mock("@/lib/redis-store", () => ({
  getRedisClient: jest.fn().mockResolvedValue({ quit: jest.fn() }),
  createSessionRecord: jest.fn(),
  recordSessionEvent: jest.fn(),
  endSessionRecord: jest.fn(),
}));

import { POST as createSession } from "../route";
import { POST as appendMessages } from "../[sessionId]/messages/route";
import { POST as logEvent } from "../[sessionId]/events/route";
import { POST as endSession } from "../[sessionId]/end/route";

function req(body: unknown) {
  return {
    json: async () => body,
  } as never;
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
