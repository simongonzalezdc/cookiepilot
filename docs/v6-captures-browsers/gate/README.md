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

## Re-run

```
node /Users/simongonzalezdecruz/workspaces/tastecheck/skills/tastecheck-pass/assets/release-gate.mjs \
  --input verifier/ledger.json --out report-rerun.json \
  --verifier-root "$PWD/verifier" --artifact-root /Users/simongonzalezdecruz/workspaces/cookiepilot
```

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
