describe("env", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  test("loads without OPENAI_API_KEY for non-OpenAI features", async () => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "",
      MONGODB_URI: "mongodb://localhost:27017/test",
      DB_NAME: "test",
    };
    jest.resetModules();

    const { env } = await import("../env");

    expect(env.OPENAI_API_KEY).toBe("");
    expect(env.AGENT_MEMORY_BASE_URL).toBe("http://localhost:8000");
  });
});
