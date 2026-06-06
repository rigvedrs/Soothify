# Soothify Companion Provider Launch MVP

Date: 2026-06-06
Status: Approved design for implementation planning

## Goal

Replace the active Hume voice experience with a minimal Soothify companion entry point that can launch either an ElevenLabs audio session or a Tavus video session.

The 2-hour development target is provider session launch only. Memory, Redis, stress logging, dashboard updates, panic-mode behavior, and provider tool calls are intentionally deferred.

## Success Criteria

- Hume is no longer visible in navigation or required by environment validation.
- `/companion` lets the user choose audio-only or video mode before starting.
- `/companion/audio` can start and end an ElevenLabs conversation session.
- `/companion/video` can create a Tavus conversation and let the user join or view the returned conversation URL.
- Each provider route has loading, connected/ready, stopped, and error states.
- The two provider implementations can be built in parallel with minimal file overlap.

## Route Ownership

### Shared App Owner

Files likely owned by the shared app pass:

- `app/layout.tsx`
- `app/page.tsx`
- `lib/env.ts`
- `README.md`
- `package.json`

Responsibilities:

- Add `/companion` to primary navigation.
- Remove `/hume` from primary navigation and home page entry points.
- Remove mandatory Hume environment variables.
- Add documented environment variables for ElevenLabs and Tavus.
- Keep existing `/chat`, dashboard, exercises, blogs, and facilities behavior unchanged.

### ElevenLabs Engineer

Files likely owned by the ElevenLabs pass:

- `app/companion/audio/page.tsx`
- optional local audio components under `app/companion/audio/`

Responsibilities:

- Install and use `@elevenlabs/react`.
- Wrap the audio companion in `ConversationProvider`.
- Start a session with `startSession({ agentId, userId })`.
- End a session with `endSession()`.
- Show microphone/connection status.
- Use a configured public ElevenLabs agent ID for the MVP.

Environment:

- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`

If the agent requires private auth, signed URL or conversation token support should be deferred unless the public-agent path is impossible.

### Tavus Engineer

Files likely owned by the Tavus pass:

- `app/companion/video/page.tsx`
- `app/api/tavus/conversations/route.ts`
- optional local video components under `app/companion/video/`

Responsibilities:

- Create a server-side route that calls Tavus `POST /v2/conversations`.
- Keep `TAVUS_API_KEY` server-only.
- Send `replica_id`, `persona_id`, and optional conversation metadata from the server route.
- Return the Tavus `conversation_id`, `status`, and `conversation_url`.
- Let the user launch the returned `conversation_url`, preferably embedded if fast and reliable, otherwise through an obvious join button.

Environment:

- `TAVUS_API_KEY`
- `TAVUS_REPLICA_ID`
- `TAVUS_PERSONA_ID`

## User Journey

1. User opens `/companion`.
2. User chooses Audio or Video.
3. Audio routes to `/companion/audio`; Video routes to `/companion/video`.
4. The selected route asks for only the permissions it needs.
5. User starts the provider session.
6. The app shows session state and gives the user a way to stop or leave.

## Out of Scope For This MVP

- Panic attack button.
- Redis agent memory.
- Dashboard logging.
- Stress detection.
- Tool calls from ElevenLabs or Tavus into Soothify.
- Post-session feedback capture.
- Tavus visual emotion/perception events.
- Reworking the existing `/chat` page.

## Later Integration Boundary

When provider launch is stable, both routes should converge on a shared Soothify session contract:

- `sessionId`
- `userId`
- `mode`: `audio` or `video`
- `sessionType`: `normal` or `panic`
- `provider`: `elevenlabs` or `tavus`

That contract will support later common tool calls:

- Log stress.
- Log why stress happened.
- Log whether the session helped.
- Log what helped or did not help.
- Log user response during the call.

## Error Handling

The MVP should prefer clear recoverable states over deep provider abstraction:

- Missing provider configuration shows a setup error.
- Microphone permission failure shows a retryable audio error.
- Tavus create-conversation failure shows the provider error message when available.
- Network failures keep the user on the same page with a retry button.

## Testing And Verification

Minimum verification:

- `npm run lint`
- Manual browser check of `/companion`.
- Manual browser check of `/companion/audio` with a configured ElevenLabs agent.
- Manual browser check of `/companion/video` with configured Tavus credentials.

If real credentials are not available during development, verify that missing-config states render cleanly and that the Tavus API route does not expose the server API key.

## Merge Order

1. Shared route/nav/env cleanup lands first.
2. ElevenLabs route lands independently.
3. Tavus API route and video route land independently.
4. Final pass removes any remaining active Hume references from user-facing docs and routes.
