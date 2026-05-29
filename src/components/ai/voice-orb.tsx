"use client";

import { useEffect, useRef } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

type RGB = [number, number, number];
const THEMES: Record<VoiceState, RGB> = {
  idle: [120, 180, 255], // blue-white
  listening: [180, 150, 255], // violet
  transcribing: [255, 200, 120], // amber
  thinking: [130, 180, 255], // blue
  speaking: [120, 245, 210], // teal
};

type Pt = { x: number; y: number; z: number; size: number; seed: number };

const N = 1300;

/**
 * Modern 3D particle-sphere voice visualizer. A dense cloud of points rotates
 * in 3D with perspective, forming an elegant starburst that breathes with the
 * voice (real mic analyser while listening, procedural otherwise).
 */
export function VoiceOrb({ state, analyser }: { state: VoiceState; analyser: AnalyserNode | null }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  const analyserRef = useRef(analyser);
  stateRef.current = state;
  analyserRef.current = analyser;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let t = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Build a uniform-in-volume sphere of points (cbrt → uniform density)
    const pts: Pt[] = [];
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = Math.cbrt(Math.random());
      pts.push({
        x: s * Math.cos(theta) * r,
        y: s * Math.sin(theta) * r,
        z: u * r,
        size: 0.5 + Math.random() * 1.9,
        seed: Math.random() * Math.PI * 2,
      });
    }

    const freq = new Uint8Array(128);
    let smoothAmp = 0;
    let angY = 0, angX = 0;
    const lerp = (a: number, b: number, n: number) => a + (b - a) * n;

    const draw = () => {
      t += 1;
      const st = stateRef.current;
      const an = analyserRef.current;
      const col = THEMES[st];
      const cx = w / 2, cy = h / 2;
      const maxR = Math.min(w, h) * 0.42;

      // amplitude
      let amp = 0;
      if (an && st === "listening") {
        an.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < 64; i++) sum += freq[i];
        amp = sum / 64 / 255;
      } else {
        amp =
          st === "speaking" ? 0.5 + Math.sin(t * 0.16) * 0.2 + Math.sin(t * 0.05) * 0.12 :
          st === "thinking" || st === "transcribing" ? 0.3 + Math.sin(t * 0.1) * 0.1 :
          0.14 + Math.sin(t * 0.03) * 0.05;
      }
      smoothAmp = lerp(smoothAmp, Math.max(0, amp), 0.14);

      // crisp clear (lets the grid/vignette behind show through)
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // rotation
      angY += 0.0022 + smoothAmp * 0.012;
      angX = Math.sin(t * 0.004) * 0.35;
      const cosY = Math.cos(angY), sinY = Math.sin(angY);
      const cosX = Math.cos(angX), sinX = Math.sin(angX);

      const radiusPx = maxR * (0.86 + smoothAmp * 0.3);
      const zCam = 2.4;
      const scaleNear = zCam / (zCam - 0.9);
      const scaleFar = zCam / (zCam + 0.9);
      const scaleRange = scaleNear - scaleFar;

      for (const p of pts) {
        // rotate Y then X
        const x1 = p.x * cosY + p.z * sinY;
        const z1 = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z1 * sinX;
        const z2 = p.y * sinX + z1 * cosX;

        const scale = zCam / (zCam - z2 * 0.9);
        const px = cx + x1 * radiusPx * scale;
        const py = cy + y2 * radiusPx * scale;

        const norm = (scale - scaleFar) / scaleRange; // 0 far → 1 near
        const twinkle = 0.72 + Math.sin(t * 0.07 + p.seed) * 0.28;
        const a = Math.max(0, (0.1 + norm * 0.9) * twinkle * (0.55 + smoothAmp * 0.7));
        const size = p.size * scale * (0.8 + smoothAmp * 0.5);

        // near points whiter, far points take the state color
        const c: RGB = [
          Math.round(lerp(col[0], 255, norm)),
          Math.round(lerp(col[1], 255, norm)),
          Math.round(lerp(col[2], 255, norm)),
        ];
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
        ctx.fill();
      }

      // compact glowing core
      const coreR = maxR * (0.13 + smoothAmp * 0.06);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.4, `rgba(${col[0]},${col[1]},${col[2]},0.45)`);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
