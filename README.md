# Soothify

**Soothify** is a mental wellness companion application built with Next.js and Node.js. It combines assessments, mood tracking, support resources, and multimodal companion experiences so users can move from reflection into real-time audio or video support when they need it most.

## Prerequisites

- Node.js 18+
- MongoDB (local installation or MongoDB Atlas)

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env.local` in the project root and fill in your API keys and database connection details:
   
   ```env
   OPENAI_API_KEY=your_openai_key
   MONGODB_URI=mongodb://localhost:27017
   DB_NAME=soothify
   ELEVENLABS_API_KEY=your_elevenlabs_key
   ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id
   ELEVENLABS_PANIC_AGENT_ID=your_panic_support_agent_id
   TAVUS_API_KEY=your_tavus_key
   TAVUS_REPLICA_ID=your_tavus_replica_id
   TAVUS_PERSONA_ID=your_tavus_persona_id
   ```

3. **Seed demo data (optional):**
   ```bash
   npm run seed
   ```

## Usage

**Start the development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000` with the following key features:

### Panic Support Setup

- `ELEVENLABS_AGENT_ID` is the default audio companion agent.
- `ELEVENLABS_PANIC_AGENT_ID` is optional but recommended. If set, the app can switch a live audio session into a dedicated panic-support agent.
- In the general ElevenLabs agent, configure the client tool `trigger_panic_support` so the agent can explicitly tell the app to show the immediate-support UI.
- The normal audio companion also runs an in-app transcript keyword detector. Phrases such as "I'm freaking out" and "I can't breathe" can trigger the same support block even if the agent tool is not called.

## Key Features

- **🎙️ Audio Companion**: ElevenLabs-powered voice support with a normal companion mode and a dedicated panic-support mode
- **🚨 Panic Escalation**: In-session panic detection, immediate grounding UI, `Text 988`, nearby-help links, and one-click transfer into the panic-support agent
- **🎥 Video Companion**: Tavus-powered video companion sessions
- **📊 Assessment Tools**: Interactive mental health assessments with progress tracking
- **📈 Dashboard**: Personal mood tracking and analytics with MongoDB integration
- **🗺️ Resource Locator**: Find nearby mental health facilities and resources
- **💪 Wellness Exercises**: Guided exercises and coping strategies
- **📚 Educational Content**: Mental health blogs and informational resources

## Project Structure

```
├── app/                 # Next.js app directory
│   ├── api/            # API routes (audio companion, Tavus, chat, user data, etc.)
│   └── [pages]/        # React pages and components
├── lib/                # Shared utilities and configurations
│   ├── components/     # Reusable React components
│   ├── hooks/         # Custom React hooks
│   ├── panic/         # Panic keyword detection and tests
│   └── [utils]/       # Helper functions and schemas
├── models/             # MongoDB data models
└── public/             # Static assets
```

## Testing

Run the test suite:
```bash
npm test
```

For test coverage:
```bash
npm run test:coverage
```
