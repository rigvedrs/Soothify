import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional().default(""),
  MONGODB_URI: z.string().min(1),
  DB_NAME: z.string().min(1),
  HUME_API_KEY: z.string().optional().default(""),
  HUME_SECRET_KEY: z.string().optional().default(""),
  HUME_CONFIG_ID: z.string().optional().default(""),
  ELEVENLABS_API_KEY: z.string().optional().default(""),
  ELEVENLABS_AGENT_ID: z.string().optional().default(""),
  ELEVENLABS_PANIC_AGENT_ID: z.string().optional().default(""),
  OPENROUTER_API_KEY: z.string().optional().default(""),
  TAVUS_API_KEY: z.string().optional().default(""),
  TAVUS_REPLICA_ID: z.string().optional().default(""),
  TAVUS_PERSONA_ID: z.string().optional().default(""),
  AGENT_MEMORY_BASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional().default("http://localhost:8000")
  ),
  AGENT_MEMORY_NAMESPACE: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional().default("soothify_companion")
  ),
  AGENT_MEMORY_DEFAULT_USER_ID: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional().default("demo-user")
  ),
  AGENT_MEMORY_API_TOKEN: z.string().optional().default(""),
  REDIS_URL: z.preprocess(emptyToUndefined, z.string().min(1).optional().default("redis://localhost:6379")),
});

const parsed = envSchema.safeParse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME,
  HUME_API_KEY: process.env.HUME_API_KEY,
  HUME_SECRET_KEY: process.env.HUME_SECRET_KEY,
  HUME_CONFIG_ID: process.env.HUME_CONFIG_ID,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID,
  ELEVENLABS_PANIC_AGENT_ID: process.env.ELEVENLABS_PANIC_AGENT_ID,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  TAVUS_API_KEY: process.env.TAVUS_API_KEY,
  TAVUS_REPLICA_ID: process.env.TAVUS_REPLICA_ID,
  TAVUS_PERSONA_ID: process.env.TAVUS_PERSONA_ID,
  AGENT_MEMORY_BASE_URL: process.env.AGENT_MEMORY_BASE_URL,
  AGENT_MEMORY_NAMESPACE: process.env.AGENT_MEMORY_NAMESPACE,
  AGENT_MEMORY_DEFAULT_USER_ID: process.env.AGENT_MEMORY_DEFAULT_USER_ID,
  AGENT_MEMORY_API_TOKEN: process.env.AGENT_MEMORY_API_TOKEN,
  REDIS_URL: process.env.REDIS_URL,
});

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
