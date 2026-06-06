import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey || !agentId) {
    return NextResponse.json(
      {
        error: "Missing ElevenLabs credentials",
        message: "Please configure ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID in .env.local",
      },
      { status: 500 }
    );
  }

  if (apiKey === "your_elevenlabs_api_key" || agentId === "your_elevenlabs_agent_id") {
    return NextResponse.json(
      {
        error: "Placeholder credentials detected",
        message: "Please replace placeholder ElevenLabs values in .env.local with real credentials",
      },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
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
  return NextResponse.json({ signedUrl });
}
