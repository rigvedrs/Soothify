import {
  appendWorkingMemoryMessages,
  createLongTermMemories,
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

test("appendWorkingMemoryMessages preserves existing messages", async () => {
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

  expect(fetchMock.mock.calls[0][0]).toBe(
    "http://memory.test/v1/working-memory/s1?user_id=demo-user&namespace=soothify_companion"
  );
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

test("createLongTermMemories creates explicit extracted memories", async () => {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

  await createLongTermMemories({
    baseUrl: "http://memory.test",
    namespace: "soothify_companion",
    sessionId: "s1",
    userId: "demo-user",
    memories: [{ text: "Professor Y is a recurring stressor for the user.", entities: ["Professor Y"] }],
  });

  expect(fetchMock).toHaveBeenCalledWith(
    "http://memory.test/v1/long-term-memory/",
    expect.objectContaining({ method: "POST" })
  );
  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.deduplicate).toBe(true);
  expect(body.memories[0]).toEqual(
    expect.objectContaining({
      text: "Professor Y is a recurring stressor for the user.",
      session_id: "s1",
      user_id: "demo-user",
      namespace: "soothify_companion",
      entities: ["Professor Y"],
      memory_type: "semantic",
      discrete_memory_extracted: "t",
    })
  );
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
