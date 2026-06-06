import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const requestedMode = req.nextUrl.searchParams.get("mode");
  const mode = requestedMode === "panic" ? "panic" : "standard";
  const apiKey = env.ELEVENLABS_API_KEY;
  const standardAgentId = env.ELEVENLABS_AGENT_ID;
  const panicAgentId = env.ELEVENLABS_PANIC_AGENT_ID;
  const requestedAgentId = mode === "panic" ? panicAgentId || standardAgentId : standardAgentId;
  const usingFallbackAgent = mode === "panic" && !panicAgentId;

  if (!apiKey || !requestedAgentId) {
    return NextResponse.json(
      {
        error: "Missing ElevenLabs credentials",
        message: "Please configure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env.local",
      },
      { status: 500 }
    );
  }

  if (
    apiKey === "your_elevenlabs_api_key" ||
    standardAgentId === "your_elevenlabs_agent_id" ||
    panicAgentId === "your_elevenlabs_panic_agent_id"
  ) {
    return NextResponse.json(
      {
        error: "Placeholder credentials detected",
        message: "Please replace placeholder ElevenLabs values in .env.local with real credentials",
      },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${requestedAgentId}`,
    { headers: { "xi-api-key": apiKey } }
  );

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: "Failed to get ElevenLabs signed URL", message: text },
      { status: response.status }
    );
  }

  const { signed_url: signedUrl } = await response.json();
  return NextResponse.json({
    signedUrl,
    mode,
    usingFallbackAgent,
  });
}
