import {
  buildDashboardSummary,
  createSessionRecord,
  endSessionRecord,
  recordSessionEvent,
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

test("buildDashboardSummary returns recent session metrics", async () => {
  redis.zRange
    .mockResolvedValueOnce(["s1"])
    .mockResolvedValueOnce(["Professor X"])
    .mockResolvedValueOnce(["Chocolate imagery"]);
  redis.hGetAll.mockResolvedValueOnce({
    sessionId: "s1",
    provider: "tavus",
    mode: "video",
    outcome: "helped",
  });

  const summary = await buildDashboardSummary(redis as never, "demo-user");

  expect(summary.today.sessions).toBe(1);
  expect(summary.today.stressMoments).toBe(1);
  expect(summary.today.recentHelpfulMethod).toBe("Chocolate imagery");
  expect(summary.recurringStressors).toEqual(["Professor X"]);
});
