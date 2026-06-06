import { extractNamedStressors, extractTavusTranscriptMessages } from "../tavus-transcript";

test("extractTavusTranscriptMessages reads transcription_ready transcript", () => {
  const messages = extractTavusTranscriptMessages({
    events: [
      { event_type: "system.shutdown", properties: {} },
      {
        event_type: "application.transcription_ready",
        properties: {
          transcript: [
            { role: "user", content: "I hate professor Y as well.", timestamp: 1780782000.5 },
            { role: "assistant", content: "That sounds heavy.", timestamp: 1780782002 },
            { role: "tool", content: "ignored" },
          ],
        },
      },
    ],
  });

  expect(messages).toEqual([
    { role: "user", content: "I hate professor Y as well.", createdAt: "2026-06-06T21:40:00.500Z" },
    { role: "assistant", content: "That sounds heavy.", createdAt: "2026-06-06T21:40:02.000Z" },
  ]);
});

test("extractNamedStressors identifies named professor stressors from user messages", () => {
  expect(
    extractNamedStressors([
      { role: "user", content: "I hate professor Y as well." },
      { role: "assistant", content: "Professor Y sounds like a stressor." },
    ])
  ).toEqual(["Professor Y"]);
});

test("extractNamedStressors handles remember phrasing from Tavus ASR", () => {
  expect(
    extractNamedStressors([
      { role: "user", content: "No no professor is an X. I want you to remember that I make Professor Y as well." },
    ])
  ).toEqual(["Professor Y"]);
});

test("extractNamedStressors drops corrected professor misrecognitions", () => {
  expect(
    extractNamedStressors([
      { role: "user", content: "I want you to remember that I also hate Professor I" },
      { role: "user", content: "No no professor is an X. I want you to remember that I make Professor Y as well." },
    ])
  ).toEqual(["Professor Y"]);
});
