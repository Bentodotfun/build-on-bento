/**
 * Pulse's mark — a vertical ECG line with a single peak, shaped to read as
 * a "P", set in a square badge.
 *
 * Rounding is applied via CSS on the <svg> element itself (borderRadius +
 * overflow: hidden), not via `rx` on the inner <rect>. A rounded rect
 * against a square viewBox leaves a faint anti-aliased seam at the
 * corners (the rect's curve vs. the SVG canvas's own square edge); letting
 * the browser's own compositor clip the whole element is crisp with no
 * bleed.
 */
export function PulseLogo({ size = 24, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label="Pulse"
      style={{ borderRadius: "29%", overflow: "hidden", display: "block" }}
    >
      <rect width="24" height="24" fill="#000000" />
      <path
        d="M9 20 L9 13 L16 9 L9 6 L9 4"
        stroke="#ffffff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
