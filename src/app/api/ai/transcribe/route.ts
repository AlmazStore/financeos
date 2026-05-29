import { NextResponse } from "next/server";
import { auth } from "@/auth";

const GROQ_BASE = process.env.LLM_BASE_URL?.replace("/openai/v1", "") || "https://api.groq.com";
const WHISPER_MODEL = "whisper-large-v3-turbo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });

  try {
    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;
    if (!audio) return NextResponse.json({ error: "No audio provided" }, { status: 400 });

    const groqForm = new FormData();
    groqForm.append("file", audio, "audio.webm");
    groqForm.append("model", WHISPER_MODEL);
    groqForm.append("language", "pt");
    groqForm.append("response_format", "json");

    const res = await fetch(`${GROQ_BASE}/openai/v1/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[transcribe]", res.status, err);
      return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.text ?? "").trim();
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[transcribe]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
