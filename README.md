# Soothify

**Soothify** is a mental wellness companion application built with Next.js and Node.js. It combines assessments, support resources, Redis-backed companion memory, and multimodal audio/video support so users can move from reflection into real-time help when they need it most.

## Prerequisites

- Node.js 18+
- Redis
- Conda for Redis Agent Memory backend tooling

## Quick Setup

1. **Install dependencies:**
   ```bash
   asdf exec npm install
   ```

2. **Configure environment:**
   Create `.env.local` in the project root and fill in your API keys and connection details:

   ```env
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=soothify
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
   ELEVENLABS_PANIC_AGENT_ID=your_panic_support_agent_id
   TAVUS_API_KEY=your_tavus_key
   TAVUS_REPLICA_ID=your_tavus_replica_id
   TAVUS_PERSONA_ID=your_tavus_persona_id
   OPENROUTER_API_KEY=your_openrouter_key
   AGENT_MEMORY_BASE_URL=http://localhost:8000
   AGENT_MEMORY_NAMESPACE=soothify_companion
   AGENT_MEMORY_DEFAULT_USER_ID=demo-user
   AGENT_MEMORY_API_TOKEN=
   REDIS_URL=redis://localhost:6379
   ```

   `OPENAI_API_KEY` is only needed for the legacy `/chat`, `/api/audio/stt`, and `/api/audio/tts` OpenAI routes.

3. **Seed demo data (optional):**
   ```bash
   asdf exec npm run seed:redis
   ```

## Redis Agent Memory

Stage 2 uses Redis Agent Memory Server plus structured Redis records for companion sessions and dashboard data. Redis 8-compatible command support is recommended for the Agent Memory worker; Redis 7.4 can index and search memories, but topic/entity structure enrichment may log `HSETEX` command errors.

Frontend commands should run through `asdf`:

```bash
asdf exec npm run dev
asdf exec npm test
```

Backend Agent Memory services should run in conda environment `tinkerers`:

```bash
conda env list | rg '^tinkerers\s' || conda create -n tinkerers python=3.12 -y
conda activate tinkerers
pip install agent-memory-server agent-memory-client redis
export REDIS_URL=redis://localhost:6379
export DISABLE_AUTH=true
export OPENROUTER_API_KEY=your_openrouter_key
export GENERATION_MODEL=openrouter/openai/gpt-5-mini
export EMBEDDING_MODEL=openai/text-embedding-3-small
export OPENAI_API_KEY=dummy-openrouter-proxy-key
export OPENAI_API_BASE=http://localhost:3000/api/openrouter
agent-memory api --host 0.0.0.0 --port 8000
agent-memory task-worker --concurrency 2
```

The `OPENAI_API_BASE` value points Agent Memory embedding calls at Soothify's OpenRouter proxy. If the Next.js dev server is running on a different port, update that URL before starting the Agent Memory API and worker.

## Panic Support Setup

- `ELEVENLABS_AGENT_ID` is the default audio companion agent.
- `ELEVENLABS_PANIC_AGENT_ID` is optional but recommended. If set, the app can switch a live audio session into a dedicated panic-support agent.
- In the general ElevenLabs agent, configure the client tool `trigger_panic_support` so the agent can explicitly tell the app to show the immediate-support UI.
- The normal audio companion also runs an in-app transcript keyword detector. Phrases such as "I'm freaking out" and "I can't breathe" can trigger the same support block even if the agent tool is not called.

## Usage

Start the development server:

```bash
asdf exec npm run dev
```

The application will be available at `http://localhost:3000`.

## Key Features

- **Audio Companion**: ElevenLabs-powered voice support with memory context, normal companion mode, and dedicated panic-support mode
- **Panic Escalation**: In-session panic detection, immediate grounding UI, `Text 988`, nearby-help links, and one-click transfer into the panic-support agent
- **Video Companion**: Tavus-powered video companion sessions with transcript sync into Agent Memory
- **Dashboard**: Redis-backed companion memory insights, recurring stressors, helpful coping patterns, and recent session history
- **Assessment Tools**: Interactive mental health assessments with progress tracking
- **Resource Locator**: Find nearby mental health facilities and resources
- **Wellness Exercises**: Guided exercises and coping strategies
- **Educational Content**: Mental health blogs and informational resources

## Project Structure

```
├── app/                 # Next.js app directory
│   ├── api/             # API routes (companion, dashboard, OpenRouter, Tavus, chat, user data, etc.)
│   └── [pages]/         # React pages and components
├── lib/                 # Shared utilities and configurations
│   ├── components/      # Reusable React components
│   ├── companion/       # Companion schemas and types
│   ├── hooks/           # Custom React hooks
│   ├── panic/           # Panic keyword detection and tests
│   └── [utils]/         # Helper functions and schemas
├── models/              # Legacy MongoDB models
├── public/              # Static assets
└── scripts/             # Seed and local utility scripts
```

## Testing

Run the test suite:

```bash
asdf exec npm test
```

For test coverage:

```bash
asdf exec npm run test:coverage
```
