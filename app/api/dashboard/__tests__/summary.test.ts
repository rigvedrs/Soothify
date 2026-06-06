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
  const response = await GET({ url: "http://localhost/api/dashboard/summary" } as never);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.data.userId).toBe("demo-user");
  expect(json.data.whatHelps).toEqual(["Chocolate imagery"]);
});
