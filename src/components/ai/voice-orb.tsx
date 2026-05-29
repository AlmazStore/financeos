"use client";

import { useEffect, useRef } from "react";

export type VoiceState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

type RGB = [number, number, number];
const THEMES: Record<VoiceState, { primary: RGB; secondary: RGB }> = {
  idle: { primary: [56, 189, 248], secondary: [129, 140, 248] }, // cyan / indigo
  listening: { primary: [167, 139, 250], secondary: [236, 72, 153] }, // violet / fuchsia
  transcribing: { primary: [251, 191, 36], secondary: [249, 115, 22] }, // amber / orange
  thinking: { primary: [96, 165, 250], secondary: [167, 139, 250] }, // blue / violet
  speaking: { primary: [52, 211, 153], secondary: [45, 212, 191] }, // emerald / teal
};

type Particle = { angle: number; dist: number; speed: number; size: number; twinkle: number };

/**
 * Cinematic, audio-reactive "arc reactor" voice visualizer.
 * Renders a glowing core, radial frequency spectrum (driven by the real mic
 * analyser while listening), rotating HUD rings and a drifting particle field.
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

    // Particle field
    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 0.32 + Math.random() * 0.65,
      speed: (Math.random() - 0.5) * 0.0016,
      size: Math.random() * 1.6 + 0.4,
      twinkle: Math.random() * Math.PI * 2,
    }));

    const freq = new Uint8Array(128);
    let smoothAmp = 0;
    const spectrum = new Array(96).fill(0);

    const lerp = (a: number, b: number, n: number) => a + (b - a) * n;
    const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    const draw = () => {
      t += 1;
      const st = stateRef.current;
      const an = analyserRef.current;
      const theme = THEMES[st];
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h);
      const coreR = R * 0.16;

      ctx.clearRect(0, 0, w, h);

      // ---- amplitude source ----
      let amp = 0;
      let bins: number[];
      if (an && st === "listening") {
        an.getByteFrequencyData(freq);
        let sum = 0;
        for (let i = 0; i < 64; i++) sum += freq[i];
        amp = sum / 64 / 255;
        bins = Array.from({ length: 96 }, (_, i) => freq[Math.floor((i / 96) * 96)] / 255);
      } else {
        // synthetic, alive-looking spectrum per state
        const base =
          st === "speaking" ? 0.42 + Math.sin(t * 0.18) * 0.18 + Math.sin(t * 0.07) * 0.1 :
          st === "thinking" || st === "transcribing" ? 0.28 + Math.sin(t * 0.12) * 0.08 :
          0.14 + Math.sin(t * 0.04) * 0.05; // idle breathing
        amp = Math.max(0, base);
        bins = Array.from({ length: 96 }, (_, i) =>
          Math.max(0, base * (0.5 + 0.5 * Math.sin(i * 0.4 + t * (st === "speaking" ? 0.22 : 0.08)) * Math.sin(i * 0.13 - t * 0.05)))
        );
      }
      smoothAmp = lerp(smoothAmp, amp, 0.18);
      for (let i = 0; i < spectrum.length; i++) spectrum[i] = lerp(spectrum[i], bins[i], 0.35);

      const pulse = 1 + smoothAmp * 0.5;

      // ---- outer ambient glow ----
      const glow = ctx.createRadialGradient(cx, cy, coreR * 0.3, cx, cy, R * 0.5);
      glow.addColorStop(0, rgba(theme.primary, 0.16 + smoothAmp * 0.22));
      glow.addColorStop(0.5, rgba(theme.secondary, 0.06 + smoothAmp * 0.08));
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // ---- particle field ----
      for (const p of particles) {
        p.angle += p.speed * (1 + smoothAmp * 2);
        p.twinkle += 0.05;
        const r = R * 0.5 * p.dist * (1 + smoothAmp * 0.12);
        const x = cx + Math.cos(p.angle) * r;
        const y = cy + Math.sin(p.angle) * r;
        const a = (0.25 + Math.sin(p.twinkle) * 0.25 + smoothAmp * 0.3) * 0.9;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 + smoothAmp), 0, Math.PI * 2);
        ctx.fillStyle = rgba(theme.primary, Math.max(0, a));
        ctx.fill();
      }

      // ---- radial frequency spectrum ----
      const innerR = coreR * 1.5 * pulse;
      const maxBar = R * 0.2;
      ctx.lineCap = "round";
      for (let i = 0; i < spectrum.length; i++) {
        const ang = (i / spectrum.length) * Math.PI * 2 - Math.PI / 2 + t * 0.002;
        const len = spectrum[i] * maxBar + 2;
        const x1 = cx + Math.cos(ang) * innerR;
        const y1 = cy + Math.sin(ang) * innerR;
        const x2 = cx + Math.cos(ang) * (innerR + len);
        const y2 = cy + Math.sin(ang) * (innerR + len);
        const mix = i / spectrum.length;
        const c: RGB = [
          Math.round(lerp(theme.primary[0], theme.secondary[0], mix)),
          Math.round(lerp(theme.primary[1], theme.secondary[1], mix)),
          Math.round(lerp(theme.primary[2], theme.secondary[2], mix)),
        ];
        ctx.strokeStyle = rgba(c, 0.85);
        ctx.lineWidth = 2.4;
        ctx.shadowBlur = 12;
        ctx.shadowColor = rgba(c, 0.8);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ---- rotating HUD rings ----
      const drawArc = (radius: number, start: number, len: number, width: number, c: RGB, a: number) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, start, start + len);
        ctx.strokeStyle = rgba(c, a);
        ctx.lineWidth = width;
        ctx.shadowBlur = 8;
        ctx.shadowColor = rgba(c, a);
        ctx.stroke();
        ctx.shadowBlur = 0;
      };
      const ringBase = coreR * 2.1 * pulse;
      drawArc(ringBase, t * 0.01, Math.PI * 1.2, 1.5, theme.primary, 0.5);
      drawArc(ringBase, t * 0.01 + Math.PI * 1.4, Math.PI * 0.4, 1.5, theme.primary, 0.5);
      drawArc(ringBase + 14, -t * 0.014, Math.PI * 0.6, 1, theme.secondary, 0.4);
      drawArc(ringBase + 14, -t * 0.014 + Math.PI, Math.PI * 0.8, 1, theme.secondary, 0.4);

      // tick marks on outer ring
      const tickR = ringBase + 26;
      const ticks = 60;
      for (let i = 0; i < ticks; i++) {
        const ang = (i / ticks) * Math.PI * 2 + t * 0.004;
        const on = i % 5 === 0;
        const tl = on ? 6 : 3;
        const x1 = cx + Math.cos(ang) * tickR;
        const y1 = cy + Math.sin(ang) * tickR;
        const x2 = cx + Math.cos(ang) * (tickR + tl);
        const y2 = cy + Math.sin(ang) * (tickR + tl);
        ctx.strokeStyle = rgba(theme.primary, on ? 0.5 : 0.22);
        ctx.lineWidth = on ? 1.4 : 0.8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // sweeping scan arc while thinking/transcribing
      if (st === "thinking" || st === "transcribing") {
        const a = t * 0.05;
        drawArc(ringBase + 14, a, Math.PI * 0.25, 2.5, theme.primary, 0.9);
      }

      // ---- glowing core ----
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * pulse * 1.3);
      coreGlow.addColorStop(0, rgba([255, 255, 255], 0.95));
      coreGlow.addColorStop(0.25, rgba(theme.primary, 0.9));
      coreGlow.addColorStop(0.7, rgba(theme.secondary, 0.4));
      coreGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * pulse * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // inner bright dot
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 0.5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = rgba([255, 255, 255], 0.9);
      ctx.shadowBlur = 30;
      ctx.shadowColor = rgba(theme.primary, 1);
      ctx.fill();
      ctx.shadowBlur = 0;

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
