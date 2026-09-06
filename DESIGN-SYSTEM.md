# CookiePilot DESIGN-SYSTEM.md — CEO taste spec (binding)
Interview: 2026-09-06, design-system-interview (tastecheck pipeline step 1). Authority: CEO choices live, marked. This file is the source of truth the redesign builds to and the tastecheck gate judges against.

## Direction (one line)
"Bakery-light cookie-native playful-premium — airy premium hierarchy with one warm type family, vanilla/chocolate dual themes (light-first), signature = The Bite (bitten charts) + Crumb Trail (tx states) + Oven (ambient feed motion)."

## Decision map
| Dimension | Status | Decision | Consequence |
|---|---|---|---|
| personality | **committed (CEO)** | Playful-premium: fun outside, precision inside | Warmth never at the cost of data credibility |
| aesthetic | **committed (CEO)** | Cookie-native, leans into brand; premium craft execution | Identity earned through system, not stickers |
| color_mode | **committed (CEO)** | BOTH themes; light-first default, one-click toggle | Semantic tokens ×2 themes; gate contrast-checks each separately |
| signature | **committed (CEO)** | All three, layered: **Bite** = primary (charts/meters bitten, block-timer loses bites; survives screenshots) · **Crumb Trail** = tx state journey (processed→confirmed→finalized, dissolves at finality — makes sub-second finality visible) · **Oven** = ambient feed motion (tray-glide arrivals, golden sheen confirm; reduced-motion kill switch) | Restraint law: all three share palette+geometry or it's a theme park |
| type | **committed (CEO)** | Single warm humanist sans family; rounded terminals echo the cookie world; display-weight (700) tabular numerals for ALL data | Words and numbers one family; weights do hierarchy |
| density_shape | **committed (CEO)** | Airy premium: generous spacing, cards breathe, one idea per section; radius card 20px / controls pill; soft warm shadows, minimal elevation | Whitespace = luxury; depth per screen lower, scroll for detail |
| reference | assumed (nod owed) | "Linear's restraint on a bakery palette" — Nothing-OS-style warm-precise system product | Craft bar: system coherence over decoration |
| structure_rhythm | assumed (nod owed) | Hero network-pulse first paint → alternating full-bleed sections (pulse / wallet / analytics / feed+crumbs / swap / NL console), consistent card cadence | Judges' first screenshot = hero + bite chart |
| imagery_iconography | assumed (nod owed) | One custom line-icon set with bite/crumb motifs; no unmodified stock pack; cookie mark only as favicon/logo, not wallpaper | Icon system is part of the identity |
| motion (optional) | committed via signature | 150–250ms ease-out ambient only (Oven); `prefers-reduced-motion` kills all | Motion is seasoning, never information |

## Refusals (defaults this product will NOT use)
1. No neon-on-black / generic crypto-dark template
2. No glassmorphism blur panels
3. No 4px-radius SaaS-admin look
4. No unmodified stock icon pack
5. No dark-only theme (both themes are first-class)

## Build contract — semantic tokens (real jobs, both themes)
- `--surface` vanilla #FAF3E7 / cocoa #1C1210 · `--surface-raised` sugar #FFFDF8 / #2A1D18
- `--ink` chocolate #2B1A12 / cream #F5E9D6 (AA+ on both, gate-verified) · `--ink-dim` ~60%
- `--accent-live` ember #E85D2F (live/pulse ONLY) · `--accent-confirm` mint #2FA87C/#4CC79A · `--accent-down` jam #C03A2B/#E05A4A
- `--line` warm #E8DCC8 / #3A2A22 · radius: card 20 / pill 999 · shadow: 0 8px 24px rgba(43,26,18,.08)
- Type: system warm-humanist stack (`ui-rounded`, -apple-system, "SF Pro Rounded", Segoe, Inter fallbacks); `font-variant-numeric: tabular-nums` on all data
- Responsive: 320px→desktop; keyboard-complete; 400% zoom; both themes pass AA+ (gate enforces)
- Structure: 01 pulse-hero → 02 wallet → 03 analytics → 04 live feed (Crumb Trail) → 05 swap + NL console

## Next move
Approval of this spec (esp. the 3 assumption rows) → dispatch rebuild to spec → dual-theme, dual-browser render verification → tastecheck-pass gate (SHIP required) → CEO's 3 submission acts.

---

# v2 — PANEL AMENDMENTS (ralplan consensus: Astra-medium + Grok-4.6-high + Sol-high, all ITERATE→resolved; MiniMax parked 503×2, Kimi absent from bridge — per CEO)
Panel files: org-hq docs/cfo-corpus/consensus/panel-{astra,grok,sol}.md|.log

## Resolved contradictions
- **Motion law restated:** motion is never the SOLE carrier of information. Every animated state has a labeled static equivalent (icon + text) that parses in a still screenshot; authoritative state updates happen instantly, never gated on animation; reduced-motion = the static contract (labels, stations, sheen-substitute), not content loss.
- **Contrast law:** "AA+" is not a contract. Required: text ≥4.5:1, UI controls/chart marks ≥3:1, BOTH themes, ratios published in the build README and verified by the tastecheck gate.

## Amendments applied
- **AM-1 (all 3, blocker): executable color tokens.** `--ink-dim` = SOLID hex per theme (light #6B5443, dark #C9B8A3 — provisional, gate verifies ≥4.5:1). Accent-as-TEXT variants for light theme: ember-text #B53F1F, mint-text #1F7A5C, jam-text #A03225 (Sol's hexes); bright accents (#E85D2F/#2FA87C/#4CC79A) = decorative fills/live-pulse/icons ONLY, never body text or ≤14px labels. State never communicated by color alone (label/icon always).
- **AM-2 (Grok+Astra): one bundled typeface.** Single self-hosted webfont with VERIFIED tabular figures (tnum), weights 400/500/700; candidates Figtree / Nunito Sans / M PLUS Rounded 1c — whichever's tnum verifies in BOTH browsers ships; metric-matched fallback stack; Inter forbidden as visual fallback (squares terminals). `font-variant-numeric: tabular-nums` on every data element.
- **AM-3 (all 3): Bite geometry contract.** One notch max per chart element, 10–14% of plot bounding box (or ≤8px depth on meters), ~40° arc, NEVER crossing axes, labels, thresholds, the last data point, or the current value; meters bite the TRACK not the fill endpoint; exact numeric value printed beside every bitten element; max two bitten elements per viewport.
- **AM-4 (all 3): static-equivalent states.** Crumb Trail renders as three discrete labeled stations (processed/confirmed/finalized + icons) that parse with zero motion; Oven's reduced-motion/static = 2–4% warm sheen on newest feed row, no glide. Motion tokens SPLIT: interaction 180ms ease-out; ambient 500–700ms; `prefers-reduced-motion` → durations 0, labels/stations persist.
- **AM-5 (all 3): judging-frame contract.** First viewport at 1440×900 AND 390×844 must show: product name, one-line value proposition, live network state, one legible Bite chart, theme toggle top-right (aria-pressed, localStorage-persisted, in both screenshot crops). Dark theme gets its own shadow token 0 8px 24px rgba(0,0,0,.40) + hairline (light token vanishes on cocoa). Icons: one 24px set, 1.5px round-cap stroke (2px @16px), bite/crumb motifs on 6–8 marks only; cookie glyph = favicon/wordmark only.

Consensus state: amendments applied; final approval authority = CEO (panel verdicts superseded by his nod). Next: rebuild to v2 → dual-theme dual-browser render proof → tastecheck-pass gate (SHIP required) → CEO's 3 submission acts.
