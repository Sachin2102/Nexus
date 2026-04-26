'use client'

import { useEffect, useState } from 'react'
import NexusLogo from '@/components/NexusLogo'

/* ─── boot sequence ─────────────────────────────────────────────────── */
const STEPS = [
  { msg: 'Initializing neural core…',  pct: 20 },
  { msg: 'Loading org intelligence…',  pct: 52 },
  { msg: 'Syncing agent network…',     pct: 80 },
  { msg: 'All systems ready.',          pct: 100 },
]

/* ─── fixed star field (avoids SSR mismatch) ────────────────────────── */
const STARS = [
  { x:  7, y: 11, s: 1.5, d: 2.1 }, { x: 93, y:  6, s: 1.0, d: 3.2 },
  { x: 42, y:  4, s: 1.2, d: 1.8 }, { x: 77, y: 19, s: 1.8, d: 2.6 },
  { x: 14, y: 64, s: 1.0, d: 1.4 }, { x: 89, y: 44, s: 1.5, d: 4.0 },
  { x: 24, y: 31, s: 1.2, d: 2.9 }, { x: 61, y: 86, s: 1.0, d: 1.7 },
  { x:  3, y: 89, s: 1.5, d: 2.3 }, { x: 71, y: 91, s: 1.0, d: 3.5 },
  { x: 37, y: 77, s: 1.8, d: 1.6 }, { x: 96, y: 73, s: 1.0, d: 2.8 },
  { x: 51, y: 96, s: 1.5, d: 1.9 }, { x: 11, y: 41, s: 1.2, d: 3.1 },
  { x: 84, y: 29, s: 1.0, d: 2.4 }, { x: 54, y: 54, s: 2.0, d: 4.5 },
  { x: 29, y:  9, s: 1.0, d: 1.5 }, { x: 67, y: 63, s: 1.5, d: 2.2 },
  { x: 18, y: 75, s: 1.2, d: 3.8 }, { x: 80, y: 82, s: 1.0, d: 1.3 },
]

export default function LoadingScreen() {
  // Mount guard — server renders null, client shows the splash.
  // This prevents the Next.js hydration mismatch caused by the inline
  // <style> tag whose quote characters get HTML-encoded differently by
  // the SSR serialiser vs the browser DOM.
  const [mounted,     setMounted]     = useState(false)
  const [visible,     setVisible]     = useState(true)
  const [exit,        setExit]        = useState(false)
  const [step,        setStep]        = useState(0)
  const [progress,    setProgress]    = useState(0)
  const [lettersDone, setLettersDone] = useState(0)

  useEffect(() => {
    setMounted(true)

    // Letter-by-letter reveal
    'NEXUS'.split('').forEach((_, i) =>
      setTimeout(() => setLettersDone(i + 1), 350 + i * 110)
    )

    // Boot steps
    STEPS.forEach((s, i) =>
      setTimeout(() => { setStep(i); setProgress(s.pct) }, 150 + i * 620)
    )

    // Exit sequence
    setTimeout(() => setExit(true),     2850)
    setTimeout(() => setVisible(false), 3500)
  }, [])

  // Don't render on server (avoids hydration mismatch)
  if (!mounted || !visible) return null

  return (
    <>
      <style>{CSS}</style>

      <div
        className="nexus-splash"
        style={{ animation: exit ? 'splashExit 0.65s cubic-bezier(0.4,0,1,1) forwards' : 'none' }}
      >
        {/* ── Star field ─────────────────────────────────────────────── */}
        {STARS.map((s, i) => (
          <span key={i} className="star" style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.s, height: s.s,
            animationDuration: `${s.d}s`,
            animationDelay: `${(i * 0.17) % 2.5}s`,
          }} />
        ))}

        {/* ── Ambient glow ───────────────────────────────────────────── */}
        <div className="ambient-glow" />

        {/* ── Orbital system ─────────────────────────────────────────── */}
        <div className="orbital-wrap">

          {/* Ring 1 — indigo, -28° tilt, 7s CW */}
          <div className="ring-layer" style={{ animation: 'orb1 7s linear infinite' }}>
            <svg viewBox="0 0 340 340" width="340" height="340">
              <defs>
                <filter id="glow1">
                  <feGaussianBlur stdDeviation="4" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <g transform="rotate(-28 170 170)">
                <ellipse cx="170" cy="170" rx="155" ry="48"
                  stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" fill="none"
                  strokeDasharray="12 5"
                />
                <circle cx="325" cy="170" r="7" fill="#6366f1" filter="url(#glow1)" />
                <circle cx="15"  cy="170" r="4" fill="#818cf8" opacity="0.5" filter="url(#glow1)" />
              </g>
            </svg>
          </div>

          {/* Ring 2 — violet, +38° tilt, 10s CCW */}
          <div className="ring-layer" style={{ animation: 'orb2 10s linear infinite' }}>
            <svg viewBox="0 0 340 340" width="340" height="340">
              <defs>
                <filter id="glow2">
                  <feGaussianBlur stdDeviation="3" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <g transform="rotate(38 170 170)">
                <ellipse cx="170" cy="170" rx="136" ry="44"
                  stroke="rgba(139,92,246,0.45)" strokeWidth="1.5" fill="none"
                  strokeDasharray="7 9"
                />
                <circle cx="306" cy="170" r="5.5" fill="#a78bfa" filter="url(#glow2)" />
                <circle cx="34"  cy="170" r="3.5" fill="#c4b5fd" opacity="0.6" filter="url(#glow2)" />
              </g>
            </svg>
          </div>

          {/* Ring 3 — sky, near-flat, 13s CW */}
          <div className="ring-layer" style={{ animation: 'orb3 13s linear infinite' }}>
            <svg viewBox="0 0 340 340" width="340" height="340">
              <defs>
                <filter id="glow3">
                  <feGaussianBlur stdDeviation="3" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <ellipse cx="170" cy="170" rx="160" ry="28"
                stroke="rgba(56,189,248,0.3)" strokeWidth="1" fill="none"
              />
              <circle cx="330" cy="170" r="4.5" fill="#38bdf8" opacity="0.85" filter="url(#glow3)" />
            </svg>
          </div>

          {/* ── Core ───────────────────────────────────────────────── */}
          <div className="core-outer">
            <div className="core-inner">
              {/* Scan line sweeping down */}
              <div className="scanline" />
              {/* NEXUS brand mark — no bg so core gradient shows through */}
              <div style={{ position: 'relative', zIndex: 1 }}>
                <NexusLogo size={68} uid="splash" noBackground glow />
              </div>
              {/* Pulse rings */}
              <div className="pulse-ring r1" />
              <div className="pulse-ring r2" />
            </div>
          </div>

        </div>{/* /orbital-wrap */}

        {/* ── NEXUS lettering ─────────────────────────────────────────── */}
        <div className="letters-row">
          {'NEXUS'.split('').map((ch, i) => (
            <span
              key={i}
              className="letter"
              style={{
                animationPlayState: lettersDone > i ? 'running' : 'paused',
                opacity: lettersDone > i ? undefined : 0,
                animationDelay: '0s',
              }}
            >
              {ch}
            </span>
          ))}
        </div>

        {/* Tagline */}
        <p className="tagline">Autonomous AI Chief of Staff</p>

        {/* ── Progress ────────────────────────────────────────────────── */}
        <div className="progress-block">
          <div className="progress-meta">
            <span className="progress-msg">{STEPS[step].msg}</span>
            <span className="progress-pct">{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Version */}
        <p className="version-tag">NEXUS v2.0 · NVIDIA NIM · LangGraph</p>

      </div>
    </>
  )
}

/* ─── styles ────────────────────────────────────────────────────────── */
const CSS = `
.nexus-splash {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: radial-gradient(ellipse 90% 65% at 50% 38%, #0e0b2e 0%, #080819 55%, #020210 100%);
}

/* ── Stars ───────────────────────────────────────── */
.star {
  position: absolute;
  border-radius: 50%;
  background: #fff;
  animation: twinkle linear infinite;
}

/* ── Ambient centre glow ─────────────────────────── */
.ambient-glow {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 500px; height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%);
  animation: ambientPulse 3s ease-in-out infinite;
  pointer-events: none;
}

/* ── Orbital wrapper ─────────────────────────────── */
.orbital-wrap {
  position: relative;
  width: 340px;
  height: 340px;
}

.ring-layer {
  position: absolute;
  inset: 0;
}

/* ── Core ────────────────────────────────────────── */
.core-outer {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 152px; height: 152px;
  border-radius: 50%;
  padding: 2.5px;
  background: conic-gradient(from 0deg, #4f46e5, #7c3aed, #06b6d4, #6366f1, #4f46e5);
  animation: coreSpin 5s linear infinite;
  box-shadow: 0 0 40px 8px rgba(99,102,241,0.25);
}

.core-inner {
  width: 100%; height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 42% 38%, #1a1750 0%, #0c0c22 60%, #080818 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.pulse-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(99,102,241,0.35);
  animation: pulseRing 2.4s ease-out infinite;
}
.pulse-ring.r2 { animation-delay: -1.2s; }

.scanline {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.85) 50%, transparent 100%);
  animation: scanDown 2.4s linear infinite;
}

/* ── Letters ─────────────────────────────────────── */
.letters-row {
  display: flex;
  gap: 10px;
  margin-top: 30px;
  letter-spacing: 0.28em;
}

.letter {
  font-size: 54px;
  font-weight: 900;
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(140deg, #e0e7ff 0%, #a5b4fc 30%, #6366f1 65%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: letterPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

/* ── Tagline ─────────────────────────────────────── */
.tagline {
  color: rgba(148, 163, 184, 0.6);
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  margin-top: 10px;
  font-family: 'Inter', system-ui;
}

/* ── Progress ────────────────────────────────────── */
.progress-block {
  width: 340px;
  margin-top: 52px;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.progress-msg {
  color: rgba(148,163,184,0.5);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

.progress-pct {
  color: rgba(99,102,241,0.9);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

.progress-track {
  height: 3px;
  background: rgba(15,15,35,0.9);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  background: linear-gradient(90deg, #4338ca, #6366f1, #8b5cf6);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 16px rgba(99,102,241,0.95), 0 0 32px rgba(99,102,241,0.4);
}

/* ── Version tag ─────────────────────────────────── */
.version-tag {
  position: absolute;
  bottom: 28px;
  color: rgba(90,90,130,0.5);
  font-size: 10px;
  letter-spacing: 0.18em;
  font-family: 'JetBrains Mono', monospace;
}

/* ─── Keyframes ──────────────────────────────────── */
@keyframes twinkle {
  0%, 100% { opacity: 0.06; transform: scale(1); }
  50%       { opacity: 0.85; transform: scale(1.4); }
}

@keyframes ambientPulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(1); }
  50%       { opacity: 1;   transform: translate(-50%,-50%) scale(1.1); }
}

@keyframes orb1 {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes orb2 {
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
}
@keyframes orb3 {
  from { transform: rotate(-18deg); }
  to   { transform: rotate(342deg); }
}

@keyframes coreSpin {
  from { transform: translate(-50%,-50%) rotate(0deg); }
  to   { transform: translate(-50%,-50%) rotate(360deg); }
}

@keyframes pulseRing {
  0%   { opacity: 0.8; transform: scale(0.88); }
  100% { opacity: 0;   transform: scale(1.4); }
}

@keyframes scanDown {
  0%   { top: 0%;   opacity: 0; }
  8%   { opacity: 1; }
  92%  { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

@keyframes letterPop {
  0%   { opacity: 0; transform: translateY(18px) scale(0.65); filter: blur(8px); }
  100% { opacity: 1; transform: translateY(0)    scale(1);    filter: blur(0); }
}

@keyframes splashExit {
  0%   { opacity: 1; transform: scale(1);    filter: blur(0px); }
  100% { opacity: 0; transform: scale(1.07); filter: blur(6px); }
}
`
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   