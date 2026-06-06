# Soothify Redis Agent Memory Integration

Date: 2026-06-06
Status: Approved design for implementation planning

## Goal

Make Redis the future data and memory foundation for Soothify companion sessions.

Stage 2 should integrate Redis Agent Memory Server with Soothify's ElevenLabs audio companion and Tavus video companion through a shared session layer. The companion should learn useful long-term context from conversations, such as recurring stressors, important people, calming preferences, disliked suggestions, and what helped or did not help. The dashboard should become Redis-backed and show the most useful, understandable patterns for the user.

Panic mode is intentionally deferred. The session contract may preserve room for a future `sessionType: "panic"`, but this stage only implements normal companion sessions.

## Success Criteria

- Next.js creates a shared Soothify session for both ElevenLabs and Tavus companion flows.
- Redis Agent Memory Server is used through its REST API from server-side Soothify code.
- Background extraction is the primary memory learning pattern.
- Working memory stores session conversation messages and context.
- Long-term memory extracts user-specific facts, preferences, stressors, people, coping outcomes, and summaries.
- Structured Redis records support dashboard metrics and session history.
- The new dashboard path does not depend on MongoDB seeded data.
- `demo-user` is used as the stable user id until real auth exists.
- Provider-specific code stays thin and does not know raw Agent Memory request shapes.

## Architecture

Stage 2 uses a dual Redis layer:

- Redis Agent Memory stores working memory, extracted long-term memories, user preferences, named people/entities, stress context, coping preferences, and summaries.
- Structured Redis records store dashboard-friendly facts: session counts, durations, stress moments, coping outcomes, recurring stressors, helpful techniques, and later panic events.

Redis Agent Memory should run as an external service in production-like mode:

- `redis`
- `agent-memory api`
- `agent-memory task-worker`
- optional `agent-memory mcp` later, but not required for app integration

Next.js talks to Agent Memory only from server-side routes. Add a small internal adapter at `lib/agent-memory.ts` so provider pages and route handlers do not depend on raw Agent Memory REST shapes.

MongoDB is not part of the new stage 2 source of truth. Existing Mongo-backed dashboard and seed data may be replaced or left as legacy while the new Redis-backed dashboard is built.

## Session Contract

Both provider flows use the same Soothify-owned session contract:

```ts
type CompanionSession = {
  sessionId: string;
  userId: "demo-user";
  provider: "elevenlabs" | "tavus";
  mode: "audio" | "video";
  sessionType: "normal";
  startedAt: string;
  endedAt?: string;
};
```

The contract should be owned by Soothify, not by Tavus or ElevenLabs. Provider-specific routes may attach provider ids, such as Tavus `conversation_id`, but shared session state should remain provider-neutral.

## Data Flow

### Session Start

1. User chooses audio or video from `/companion`.
2. Soothify creates a normal companion session for `demo-user`.
3. Soothify creates or opens Agent Memory working memory with:
   - `session_id`
   - `user_id: "demo-user"`
   - namespace such as `soothify_companion`
   - mental-health-focused long-term memory strategy
4. Soothify searches long-term memory for relevant recall context:
   - preferred calming imagery
   - disliked coping suggestions
   - recurring stressors
   - important people causing stress or support
   - strategies that helped or did not help before
5. Soothify passes relevant context into the provider session.

For Tavus, context can be passed through `conversational_context` and greeting setup. For ElevenLabs, the first implementation should use provider-compatible dynamic context or Soothify tool endpoints, depending on what the current ElevenLabs agent configuration supports.

### During Session

During a call, Soothify appends available conversation messages and important events to Agent Memory working memory. It also writes structured Redis records for dashboard events when known:

- stress detected
- stress reason captured
- user response during call
- coping suggestion offered
- helped or did-not-help feedback

The provider integrations should use the same Soothify session/event routes wherever possible. This keeps Tavus and ElevenLabs replaceable and avoids duplicating logging logic.

### Background Extraction

Agent Memory background extraction is the primary learning path. Soothify stores conversation messages in working memory, and the Agent Memory task-worker extracts long-term memories after the configured quiet period.

For local demos, set `EXTRACTION_DEBOUNCE_SECONDS` to 15 seconds so extraction is observable without running too often mid-conversation. Production can use a calmer debounce window to avoid mid-conversation extraction.

Examples of extracted memories:

- "The user feels stress around meetings with their boss, Priya."
- "The user finds chocolate imagery calming."
- "The user does not find nature visualization helpful."
- "The user prefers short, concrete grounding prompts during high stress."
- "The user's professor is a recurring school-related stressor."

### Session End

At session end:

1. Soothify finalizes the session duration and status.
2. Final messages or transcript data are stored in working memory when available.
3. Outcome data is recorded when available.
4. Structured Redis dashboard metrics are finalized.
5. Background extraction continues asynchronously through Agent Memory.

The dashboard should show structured records immediately. Newly extracted companion insights may appear after the debounce window and background worker processing.

## Memory Strategy

Use a custom mental health companion extraction strategy rather than plain generic extraction. Generic discrete extraction is useful, but Soothify needs memories that are emotionally and behaviorally useful.

The custom strategy should focus on:

- recurring stressors: work, school, relationships, health, finances, and specific people
- named people/entities tied to stress or support
- user coping preferences
- calming imagery or activities that work for the user
- suggestions or styles the user dislikes
- effective and ineffective interventions
- tone preferences: direct, gentle, quiet, humorous, spiritual, practical
- outcome signals: helped, neutral, made worse, unfinished

Extracted memories should be standalone and grounded. They should avoid diagnosis claims and should not turn one-off events into permanent truths unless the conversation clearly supports that. Companion prompts should treat memories as useful context to verify gently, not as unquestioned facts.

Sensitive memories stay scoped to `demo-user` for now. No memory or structured dashboard record should be shared across users.

## Dashboard UX

The dashboard should become Redis-backed and user-centered. It should answer:

- "What patterns matter for me?"
- "What has helped me before?"
- "What should my companion remember next time?"

First version sections:

### Today And This Week

Show session count, stress moments logged, average post-session outcome, and most recent helpful coping method.

### What Helps

Rank coping strategies that worked for the user, such as chocolate imagery, breathing, grounding, talking it out, music, or silence. Use structured Redis outcomes first and extracted memories as supporting context.

### Recurring Stressors

Show understandable categories and named sources when useful, such as school, boss, Professor X, deadlines, or relationship conflict. Avoid exposing full raw transcripts.

### Companion Notes

Show a concise summary of what the companion has learned: tone preferences, calming preferences, things to avoid, and context that may help future sessions.

### Session History

List recent sessions with provider, mode, duration, stress level or events, outcome, and a short summary.

The dashboard should not show a raw memory log by default. Raw memory review, editing, or deletion can be a later safety and trust feature.

## API Boundaries

Add Soothify-owned backend routes rather than letting provider pages talk directly to Redis Agent Memory.

Likely routes:

- `POST /api/companion/sessions`
  - Creates a normal session.
  - Creates Agent Memory working memory.
  - Searches long-term memory for recall context.
  - Writes a structured session-start record.
- `POST /api/companion/sessions/:sessionId/messages`
  - Appends user and assistant messages to working memory.
  - Used by provider tool calls or webhooks when message-level events are available.
- `POST /api/companion/sessions/:sessionId/events`
  - Logs structured events such as stress detected, stress reason, coping suggested, user response, and helped or did-not-help.
- `POST /api/companion/sessions/:sessionId/end`
  - Finalizes duration, outcome, and summary data.
  - Leaves long-term extraction to the Agent Memory worker.
- `GET /api/dashboard/summary?userId=demo-user`
  - Reads structured Redis records and selected Agent Memory-derived summaries for the dashboard.

Provider-specific routes remain provider-specific only where needed:

- ElevenLabs token or session route handles ElevenLabs auth and connection setup.
- Tavus conversation route handles Tavus conversation creation.
- Both include the Soothify `sessionId` and relevant memory context.

## Error Handling

Redis Agent Memory is central to this stage. If it is unavailable, starting a memory-backed companion session should show a clear setup error instead of silently pretending memory works.

Dashboard behavior:

- If Redis is unavailable, show a setup/error state.
- If Redis has no data, show an empty state designed for a new user.
- Do not fall back to Mongo seeded dashboard data for the new dashboard path.

Background extraction behavior:

- Structured session and dashboard records appear immediately.
- Long-term learned insights may appear after the extraction debounce window.
- The UI should not imply that extraction is instant.

Noisy extraction behavior:

- Memories are context, not hard truth.
- Dashboard summaries should avoid overconfident wording.
- Review/delete controls are deferred unless they become necessary for safety.

## Demo And Local Setup

Document a local stack with:

- Redis
- Agent Memory API server
- Agent Memory task-worker
- Next.js app

Use `demo-user` for all stage 2 memory and dashboard flows.

Demo seed data should later populate both:

- structured Redis dashboard records
- Agent Memory working or long-term memory data

This lets the dashboard show meaningful patterns and lets the companion demonstrate recall, even before long real usage history exists.

## Testing And Verification

Stage 2 should be testable without relying on live Tavus or ElevenLabs calls.

Minimum automated checks:

- Agent Memory adapter builds correct REST calls and handles failures.
- Session route creates a session for `demo-user`.
- Message route appends messages to working memory.
- Event route writes structured Redis records.
- End route finalizes session metrics.
- Dashboard summary route returns a stable shape when data exists and when data is empty.

Manual verification:

- Start Redis Agent Memory API, task-worker, and Redis.
- Start a normal audio session and verify a Soothify session is created.
- Start a normal video session and verify Tavus receives session and memory context.
- Append sample messages and confirm background extraction creates useful memories.
- Refresh dashboard and confirm Redis-backed summary, session, stressor, and helpful-technique data appears.
- Confirm MongoDB is not required for the new dashboard path.

Provider verification:

- ElevenLabs and Tavus both receive or can access the same recall context.
- Provider-specific failures do not corrupt Redis session state.
- Memory and session APIs work independently of provider credentials.

## Out Of Scope

- Panic button UX and panic-specific behavior.
- Real user authentication.
- Raw memory editing and deletion UI.
- MCP integration from the app.
- Migrating historical Mongo data.
- Medical diagnosis, risk scoring, or crisis workflow automation.

## Implementation Planning Notes

The implementation plan should sequence work as:

1. Add Redis and Agent Memory configuration.
2. Add Agent Memory REST adapter.
3. Add structured Redis session/event store.
4. Add Soothify companion session routes.
5. Integrate Tavus session creation with recall context.
6. Integrate ElevenLabs session creation or tool endpoints with recall context.
7. Replace the dashboard with the Redis-backed summary experience.
8. Add demo seed support for Redis and Agent Memory.
9. Verify background extraction and provider behavior.
