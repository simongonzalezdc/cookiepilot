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
