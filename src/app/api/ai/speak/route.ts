import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Neural text-to-speech via ElevenLabs. Returns MP3 audio for the client to play.
 * Configure via env:
 *   ELEVENLABS_API_KEY (required)
 *   ELEVENLABS_VOICE_ID (default: Adam — deep, authoritative)
 *   ELEVENLABS_MODEL (default: eleven_turbo_v2_5 — fast, multilingual incl. pt-BR)
 * Responds 503 when no key so the client can fall back to browser speech.
 */

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB"; // Adam
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2_5";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "no_key" }, { status: 503 });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") return NextResponse.json({ error: "no_text" }, { status: 400 });
    const clipped = text.slice(0, 900);

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: clipped,
          model_id: MODEL,
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[speak]", res.status, err);
      return NextResponse.json({ error: "tts_failed" }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[speak]", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
