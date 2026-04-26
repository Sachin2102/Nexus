/**
 * NEXUS Brand Mark
 *
 * A stylised "N" letterform with:
 *  - Indigo → violet gradient background (optional)
 *  - Clean N stroke with rounded joints
 *  - Two bright node circles at the top corners
 *  - A dashed orbital arc on the right, with a "satellite" dot —
 *    visual callback to the loading screen's orbital rings
 *
 * Props
 *  size         — rendered px dimensions (SVG viewBox is always 40×40)
 *  uid          — unique prefix for SVG gradient / filter ids (avoids
 *                 collisions when multiple instances are in the DOM)
 *  noBackground — omit the rounded-rect background (for use inside a
 *                 container that already supplies one)
 *  glow         — add a soft drop-shadow bloom on the N stroke
 */

interface NexusLogoProps {
  size?:         number
  uid?:          string
  noBackground?: boolean
  glow?:         boolean
  className?:    string
}

export default function NexusLogo({
  size         = 32,
  uid          = 'nx',
  noBackground = false,
  glow         = false,
  className,
}: NexusLogoProps) {
  const bgId   = `nexus-bg-${uid}`
  const glowId = `nexus-glow-${uid}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background gradient — indigo ➜ violet */}
        <linearGradient id={bgId} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4338ca" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>

        {/* Optional glow filter on the N stroke */}
        {glow && (
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* ── Background ─────────────────────────────── */}
      {!noBackground && (
        <>
          <rect x="0.5" y="0.5" width="39" height="39" rx="9.5"
            fill={`url(#${bgId})`}
          />
          {/* Subtle edge highlight */}
          <rect x="0.5" y="0.5" width="39" height="39" rx="9.5"
            fill="none" stroke="rgba(255,255,255,0.13)" strokeWidth="1"
          />
        </>
      )}

      {/* ── Orbital arc (right side, dashed) ─────────
          Arc: M 34 8  A 17.5 17.5 0 0 1 34 32
          SVG computes centre ≈ (20.2, 20) at r≈17.5 — sits right of N
      ───────────────────────────────────────────── */}
      <path
        d="M 34.5 8.5 A 17.5 17.5 0 0 1 34.5 31.5"
        stroke="rgba(196,181,253,0.55)"
        strokeWidth="1.5"
        strokeDasharray="3.5 2.8"
        strokeLinecap="round"
      />

      {/* Satellite dot — rides the top of the arc */}
      <circle cx="34.5" cy="8.5" r="2.4" fill="#a5b4fc" />

      {/* ── N letterform ─────────────────────────────
          Two vertical bars + one diagonal:
            left-bar:  (10,29) → (10,11)
            diagonal:  (10,11) → (30,29)
            right-bar: (30,29) → (30,11)
      ───────────────────────────────────────────── */}
      <path
        d="M 10 29 L 10 11 L 30 29 L 30 11"
        stroke="white"
        strokeWidth="2.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#${glowId})` : undefined}
      />

      {/* ── Corner nodes (top of each bar) ────────── */}
      {/* Top-left — brighter */}
      <circle cx="10" cy="11" r="3"   fill="#c4b5fd" />
      {/* Top-right — brighter */}
      <circle cx="30" cy="11" r="3"   fill="#c4b5fd" />
      {/* Bottom-left — dimmer */}
      <circle cx="10" cy="29" r="2.2" fill="#a5b4fc" opacity="0.55" />
      {/* Bottom-right — dimmer */}
      <circle cx="30" cy="29" r="2.2" fill="#a5b4fc" opacity="0.55" />
    </svg>
  )
}
