# v6.3 tastecheck-pass gate — how to read and re-run

## Verdict: **HOLD** (release_eligible: false)

Every mechanical validation passes — artifact hash ✓, dependency manifest ✓, evidence/provenance
hashes ✓, catalog complete ✓, subject inventory + coverage ✓, execution policy (repo audit) ✓.
The 27-row ledger and full report: `release-gate-report.json` (input: `verifier/ledger.json`).

## Why HOLD (15 blockers, three causes)

1. **Carried HOLD #1 — `browser:zoom-400` (measured FAIL):** 400% zoom sim (320px→80px
   effective) still overflows (scrollWidth 299 vs 80) — the honest 11-char price at its font
   floor. Pre-existing since v6.1 base; owner = CEO hero-fork notation decision, then repair
   pass. Row carries owner/repair/rerun/acceptance.
2. **Carried HOLD #2 — `verification:a11y` (measured FAIL):** 41 sub-24px tap targets
   (below-fold feed/market microtext links). Pre-existing; owner = staged below-fold rework
   pass; acceptance = 0 TAP TARGET fails on a11y-audit.js fresh load.
3. **12 subjective rows require reviewer provenance** (`direction:system`,
   `surface:*`, `verification:cognitive-a11y/deslop-ui/humanize-copy`, `browser:rendering/
   zoom-400/keyboard/cold-load`, `gate:blocker-handoff`, and the n/a rows `verification:i18n`
   + `browser:shadow-iframe`). The catalog's contract demands an **independent `human`
   reviewer** (rubric + decision + review hash) on every subjective row. This pass ran
   agent-side (evidence collected, org-bridge vision seats consulted for the bite roll) — an
   agent cannot truthfully countersign as a human, so the rows are left review-null and the
   gate fails closed exactly as designed. **To flip to SHIP:** a human reviewer countersigns
   the 12 subjective rows (rubric per row, decision matching each row status) AND the two
   carried repairs land. This is consistent with DESIGN-SYSTEM.md: "the CEO's eyes outrank
   every seat."

## v6.4 re-run (2026-09-13, CEO visual-identity pass 4 — hero B / thick band / C3 accent / stuffing / pill cut)

Verdict: **HOLD** (release_eligible: false) — `verifier/report-rerun.json`. All mechanical
validation passes against the NEW dist (sha `9dd01388…`): artifact ✓ dependencies ✓
evidence hashes ✓ provenance ✓ subject inventory/coverage ✓.

Row deltas vs the v6.3 run:
- **`browser:zoom-400`: fail → PASS** — HERO B's 3–4-char giant number (live ms/block,
  fit floor 14px) + the ≤300px reflow lane: 80px probe `sw=80 === iw=80` (was 299).
  The row still counts as a blocker ONLY because it is subjective and awaits the human
  countersign, like every subjective row.
- `verification:a11y`: **carried** (same 41 sub-24px below-fold microtext targets;
  the pill cut preserved control padding — no new fails).
- `foundation:color`: re-measured on the C3 amber roll — 22 pairs × 2 themes, min 4.67
  light / 6.5 dark (toffee text #E8B47A on cocoa; #94632B on vanilla).
- `verification:deslop-ui`: rationale updated — pill proliferation CEO-overruled
  2026-09-13; exactly 3 pill affordances survive (MAINNET LIVE, theme toggle, hero CTA).
- 13 subjective rows remain review-null → HOLD-for-human (no agent countersigns as a
  human; the CEO's eyes outrank every seat).

v6.4 evidence lives in `../../v6-captures-v6b/` (captures, ring crops, gate-report.json,
accent-roll candidates + vision transcripts).

## Re-run

```
cd docs/v6-captures-browsers/gate
node /Users/simongonzalezdecruz/workspaces/tastecheck/skills/tastecheck-pass/assets/release-gate.mjs \
  --input ledger.json --out report-rerun.json \
  --verifier-root "$PWD/verifier" --artifact-root /Users/simongonzalezdecruz/workspaces/cookiepilot
```
(`--input`/`--out` are verifier-root-relative: `ledger.json` sits at the verifier root.)

`verifier/` mirrors the pack's `check-catalog.json` + `browser-subject-manifest.json`
byte-identically (the CLI requires verifier-relative paths; the pack repo stays untouched).
Rebuild first (`npm run build`) — the ledger binds dist/ by SHA-256 (`2f2d7d7c…`).

## Evidence files

- `evidence.json` — full battery: audits (3 engines), contrast (36 pairs ×2 themes),
  overflow ladder + 400% sim, keyboard trace, reduced-motion, control/form/empty-state
  probes, data-viz honesty probes, bite-geometry DOM probes, shadow/iframe absence.
- `contrast-viewports.json` — contrast measured at 390/768/1280 × light/dark.
- `improve-seat.md` — improve-existing-website direction seat (EVIDENCE vs INFERRED).
- `../browser-matrix.json` + 12 PNGs + `../safari-real-{light,dark}.png` — engine matrix
  and the real-Safari lane.
