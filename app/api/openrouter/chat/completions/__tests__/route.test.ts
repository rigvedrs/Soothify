jest.mock("@/lib/env", () => ({
  env: {
    OPENROUTER_API_KEY: "test-openrouter-key",
  },
}));

import { POST } from "../route";

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

test("forwards chat completion requests to OpenRouter", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ choices: [{ message: { content: "grounding helps" } }] }), { status: 200 })
  );

  const response = await POST({
    json: async () => ({
      model: "openrouter/openai/gpt-5-mini",
      messages: [{ role: "user", content: "Extract topics" }],
    }),
  } as never);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.choices[0].message.content).toBe("grounding helps");
  expect(fetchMock).toHaveBeenCalledWith(
    "https://openrouter.ai/api/v1/chat/completions",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        authorization: "Bearer test-openrouter-key",
      }),
    })
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    model: "openrouter/openai/gpt-5-mini",
    messages: [{ role: "user", content: "Extract topics" }],
  });
});
