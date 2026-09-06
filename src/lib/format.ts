export function shortAddr(a: string, head = 4, tail = 4): string {
  if (!a) return "";
  return a.length <= head + tail + 2 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;
}

const N = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export function fmtNum(n: number | string | null | undefined, maxFrac = 2): string {
  const v = N(n);
  if (v === null) return "—";
  const abs = Math.abs(v);
  const frac = abs >= 1000 ? 0 : abs >= 1 ? maxFrac : Math.min(9, Math.max(2, maxFrac + 4));
  return v.toLocaleString("en-US", { maximumFractionDigits: frac });
}

export function fmtUsd(n: number | string | null | undefined): string {
  const v = N(n);
  if (v === null) return "—";
  const abs = Math.abs(v);
  if (abs === 0) return "$0";
  if (abs >= 1) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  if (abs >= 0.01) return `$${v.toFixed(4)}`;
  // tiny prices: fixed notation, never exponents (4 significant digits)
  const decimals = Math.min(12, Math.max(4, 4 - Math.floor(Math.log10(abs))));
  return `$${v.toFixed(decimals).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "")}`;
}

export function fmtCompact(n: number | string | null | undefined): string {
  const v = N(n);
  if (v === null) return "—";
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function timeAgo(unixSec: number | null | undefined): string {
  if (!unixSec) return "—";
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unixSec));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function timeAgoIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  return timeAgo(Math.floor(new Date(iso).getTime() / 1000));
}

export function lamportsToUi(lamports: number | string | null | undefined, decimals = 9): number {
  return Number(lamports ?? 0) / 10 ** decimals;
}

export function uiToRaw(ui: string | number, decimals: number): string | null {
  const n = typeof ui === "string" ? Number(ui.replace(/,/g, "")) : ui;
  if (!Number.isFinite(n) || n <= 0) return null;
  const [int, frac = ""] = String(n).split(".");
  if (frac.length > decimals) return null;
  return `${int}${frac.padEnd(decimals, "0")}`.replace(/^0+(?=\d)/, "");
}

export function pct(n: number | string | null | undefined, digits = 2): string {
  const v = N(n);
  if (v === null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}
