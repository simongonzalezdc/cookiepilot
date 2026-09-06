/**
 * CookiePilot custom icon set (DESIGN-SYSTEM v2 / AM-5).
 * One 24px set, 1.5px round-cap stroke (2px when rendered at 16px),
 * drawn for this product — no stock pack. Bite / crumb motifs appear
 * on exactly 8 marks (Bite, Crumbs, CookieFull, Oven, Wallet, Chart,
 * Coin, CookieMark); the cookie glyph itself is reserved for the
 * favicon + wordmark. Icons are decorative; text labels carry meaning.
 */
import { ReactNode, useId } from "react";

export type IconSize = number;

const strokeFor = (size: IconSize) => (size <= 16 ? 2 : 1.5);

interface BaseProps {
  size?: IconSize;
  className?: string;
  children: ReactNode;
  filled?: boolean;
  title?: string;
}

function Base({ size = 24, className, children, filled = false, title }: BaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : strokeFor(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** White rect + black bite circle: true bite geometry, per-instance id. */
function useBiteMask(cx: number, cy: number, r: number) {
  const id = useId();
  const maskId = `bite-${id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const mask = (
    <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
      <rect x="0" y="0" width="24" height="24" fill="#fff" />
      <circle cx={cx} cy={cy} r={r} fill="#000" />
    </mask>
  );
  return { maskId, mask };
}

/* ---------- wordmark glyph (cookie = favicon + wordmark ONLY) ---------- */

export function CookieMark({ size = 24, className }: { size?: IconSize; className?: string }) {
  const { maskId, mask } = useBiteMask(6.2, 5.4, 5.4);
  return (
    <Base size={size} className={className} filled title="CookiePilot">
      {mask}
      <g mask={`url(#${maskId})`}>
        <circle cx="13" cy="13.5" r="9.5" />
        <circle cx="10.4" cy="11" r="1.5" fill="#000" stroke="none" opacity="0.55" />
        <circle cx="16.6" cy="12.4" r="1.3" fill="#000" stroke="none" opacity="0.55" />
        <circle cx="12.2" cy="17.4" r="1.3" fill="#000" stroke="none" opacity="0.55" />
        <circle cx="16" cy="17.8" r="1.1" fill="#000" stroke="none" opacity="0.55" />
      </g>
    </Base>
  );
}

/* ---------- bite / crumb motif marks (6 of 8) ---------- */

/** A bitten cookie — outline. Crumb-trail “confirmed” station. */
export function IconBite({ size = 24, className }: { size?: IconSize; className?: string }) {
  const { maskId, mask } = useBiteMask(6.2, 5.4, 5.2);
  return (
    <Base size={size} className={className}>
      {mask}
      <g mask={`url(#${maskId})`}>
        <circle cx="13" cy="13.5" r="8" />
      </g>
    </Base>
  );
}

/** Crumb dots, diminishing — crumb-trail “processed” station. */
export function IconCrumbs({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <circle cx="7" cy="16.5" r="2.6" />
      <circle cx="14.2" cy="9.8" r="1.9" />
      <circle cx="18.6" cy="6" r="1" />
    </Base>
  );
}

/** Complete cookie with chip dots — crumb-trail “finalized” station. */
export function IconCookieFull({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="9.4" cy="9.8" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="10.6" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="11" cy="14.6" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14.9" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  );
}

/** The oven — rounded body, bitten window. */
export function IconOven({ size = 24, className }: { size?: IconSize; className?: string }) {
  const { maskId, mask } = useBiteMask(17.8, 8.2, 3.4);
  return (
    <Base size={size} className={className}>
      {mask}
      <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" />
      <g mask={`url(#${maskId})`}>
        <path d="M7.5 15.5v-3a4.5 4.5 0 0 1 9 0v3" />
      </g>
      <path d="M7 19.5v1.4M17 19.5v1.4" />
    </Base>
  );
}

/** Wallet with a bite taken from the corner. */
export function IconWallet({ size = 24, className }: { size?: IconSize; className?: string }) {
  const { maskId, mask } = useBiteMask(19.6, 5.2, 3.6);
  return (
    <Base size={size} className={className}>
      {mask}
      <g mask={`url(#${maskId})`}>
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h9.6a2 2 0 0 1 2 2v1" />
        <rect x="4" y="7.5" width="16.5" height="12" rx="2.5" />
        <path d="M20.5 12.5h-3.2a1.8 1.8 0 0 0 0 3.6h3.2" />
      </g>
    </Base>
  );
}

/** Bars — one bar carries a bite nick. */
export function IconChart({ size = 24, className }: { size?: IconSize; className?: string }) {
  const { maskId, mask } = useBiteMask(10.6, 6.4, 3);
  return (
    <Base size={size} className={className}>
      {mask}
      <g mask={`url(#${maskId})`}>
        <path d="M5 20V14M12 20V9.5M19 20V5.5" />
        <path d="M3.5 20h17" />
      </g>
    </Base>
  );
}

/** Coin with a bite — price / token marks. */
export function IconCoin({ size = 24, className }: { size?: IconSize; className?: string }) {
  const { maskId, mask } = useBiteMask(6.4, 5.6, 4);
  return (
    <Base size={size} className={className}>
      {mask}
      <g mask={`url(#${maskId})`}>
        <circle cx="12.5" cy="12.5" r="8" />
        <path d="M12.5 8.5v8M10 10.3c0-.8 1.1-1.4 2.5-1.4s2.5.6 2.5 1.4-1.1 1.3-2.5 1.5-2.5.7-2.5 1.5 1.1 1.4 2.5 1.4 2.5-.6 2.5-1.4" strokeWidth={1.2} />
      </g>
    </Base>
  );
}

/* ---------- plain system marks ---------- */

export function IconPulse({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M3 12h3.2l2-5.5 3.6 11 2.4-8 1.6 2.5H21" />
    </Base>
  );
}

export function IconClock({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.5V12l3 2.2" />
    </Base>
  );
}

export function IconBlocks({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <path d="M16.5 13.5v6M13.5 16.5h6" />
    </Base>
  );
}

export function IconSwap({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M4 8.5h13.5M14 4.5l4 4-4 4" />
      <path d="M20 15.5H6.5M10 11.5l-4 4 4 4" />
    </Base>
  );
}

export function IconConsole({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
      <path d="M7.5 9.5l3 2.5-3 2.5M12.5 15h4" />
    </Base>
  );
}

export function IconLink({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M9.5 14.5l5-5" />
      <path d="M13.5 7.5l1.6-1.6a3.5 3.5 0 0 1 5 5L18.5 12.5" />
      <path d="M10.5 16.5l-1.6 1.6a3.5 3.5 0 0 1-5-5L5.5 11.5" />
    </Base>
  );
}

export function IconSearch({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8L20 20" />
    </Base>
  );
}

export function IconCheck({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Base>
  );
}

export function IconCross({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </Base>
  );
}

export function IconCopy({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5.5 14.5A1.5 1.5 0 0 1 4 13V5.5A1.5 1.5 0 0 1 5.5 4H13a1.5 1.5 0 0 1 1.5 1.5" />
    </Base>
  );
}

export function IconExt({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M9 5h-2.5A1.5 1.5 0 0 0 5 6.5v12A1.5 1.5 0 0 0 6.5 20h12a1.5 1.5 0 0 0 1.5-1.5V16" />
      <path d="M13.5 4.5H20V11M20 4.5L11 13.5" />
    </Base>
  );
}

export function IconAlert({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M12 4L21 19.5H3L12 4z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r="0.4" fill="currentColor" stroke="none" />
    </Base>
  );
}

export function IconPause({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M9 6v12M15.5 6v12" />
    </Base>
  );
}

export function IconPlay({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M8.5 5.8l10 6.2-10 6.2V5.8z" />
    </Base>
  );
}

export function IconLock({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </Base>
  );
}

export function IconBox({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7L12 3.5z" />
      <path d="M4.8 7.8L12 12l7.2-4.2M12 12v8" />
    </Base>
  );
}

export function IconSend({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M12 19V5.5M6.5 11L12 5.5 17.5 11" />
    </Base>
  );
}

export function IconPen({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
      <path d="M14.5 6.5l3 3" />
    </Base>
  );
}

export function IconSun({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </Base>
  );
}

export function IconMoon({ size = 24, className }: { size?: IconSize; className?: string }) {
  return (
    <Base size={size} className={className}>
      <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5z" />
    </Base>
  );
}
