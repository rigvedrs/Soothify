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

test("forwards embeddings requests to OpenRouter with float encoding", async () => {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ object: "list", data: [{ embedding: [0.1, 0.2] }] }), { status: 200 })
  );

  const response = await POST({
    json: async () => ({
      model: "openai/text-embedding-3-small",
      input: ["Chocolate imagery helps."],
      encoding_format: null,
    }),
  } as never);
  const json = await response.json();

  expect(response.status).toBe(200);
  expect(json.data[0].embedding).toEqual([0.1, 0.2]);
  expect(fetchMock).toHaveBeenCalledWith(
    "https://openrouter.ai/api/v1/embeddings",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        authorization: "Bearer test-openrouter-key",
      }),
    })
  );
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    model: "openai/text-embedding-3-small",
    input: ["Chocolate imagery helps."],
    encoding_format: "float",
  });
});
