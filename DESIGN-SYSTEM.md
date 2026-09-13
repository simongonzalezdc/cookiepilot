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

## SKILL PROTOCOL (CEO order 2026-09-06: "make sure luna uses tastecheck all skills") — BINDING on every edit pass
Every iteration in the visual ralph loop MUST consult and apply the installed tastecheck skill suite (read each SKILL.md before editing; apply its self-checks while editing; the gate will re-run them):
- Gate + pipeline map: ~/.agents/skills/tastecheck-pass/SKILL.md
- Foundations: ~/.agents/skills/color-system/SKILL.md · web-typography · spacing-system · theming
- Structure/behavior: responsive-layout · component-states · form-ux · empty-states
- Surface: micro-motion · data-viz · art-direction
- Verification: a11y-pass · cognitive-a11y · deslop-ui (against THIS spec) · humanize-copy
Working discipline per pass: fix verdict failures THROUGH these skills' lenses (e.g., type fixes via web-typography rules, token fixes via color-system, state coverage via component-states/empty-states), and name in your commit/summary which skills you applied.

---

# v4 — POSTER EXECUTION LAYER (visual-ralph v4, reference-approved.png = binding visual authority; 2026-09-07)

The CEO picked the Swiss Poster editorial reference from the gallery. v4 rebuilds the execution layer on top of the v2/v3 token + contracts base (all AM-1..5 amendments, refusals, contrast law still binding).

## What the reference locked in
- **Poster anatomy:** unboxed flat-paper hero (no cards in 01), ink editorial rules (`--rule` = ink 34%), masthead double rule, registration crosses at content corners, vertical marginalia (COOKIEPILOT · LIVE NETWORK STATE · date), giant numbered section heads (clamp 40→76px, 900, ink numerals, terse titles: 02 — WALLET).
- **Display type:** M PLUS Rounded 1c 800/900 (self-hosted latin woff2, same family as v2 amendment AM-2). Hero price = 4 significant digits (display rounding; exact value in aria-label + lower rows), fluid `clamp(24px, 17.5cqw, 132px)` container-query sizing — poster scale, zero overflow at any width incl. 400% zoom.
- **Texture (mandate):** feTurbulence paper grain on the whole page (`--grain-opacity` 0.07 light / 0.085 dark); halftone dot fills under the sparkline + quarter-disc behind the ring; halftone punch on BarChart bars. NOT flat fills.
- **Ember moments:** delta chip = solid ember with hard ink offset (text INK on ember, 4.79:1 AA); CTA = ink pill with hard 4px ember offset, caps; the bitten ring centerpiece = ember fill on token track (`--ring-track`: dough mix in light / warm tan --line-ctl in dark).
- **The Bite centerpiece (v4 metric decision):** the ring shows **share of circulating supply bridged from Solana** (56.5% at capture) — honest AND reference-scale loud; epoch progress lives in the ring's sub line. Near-full rings get NO bite (AM-3: track only, never the fill endpoint). Bite = one notch, edge-anchored, ≤14% chord bound.
- **Reference copy adopted verbatim where true:** masthead "OVEN-FRESH L2 · ISSUE 07", stat trio THROUGHPUT / BLOCK TIME / FINALITY (3 ticks, cement ≈ computed from live slot ms), PROCESSED · CONFIRMED · FINALIZED crumb microline, terse WALLET section title.
- **Header:** logo + pipe + masthead line · MAINNET LIVE pill (dot carries live/offline) · dual sun|moon toggle — right-cluster grid per reference. Connect moved OUT of the header into the hero CTA (present in all hero states). No backdrop blur anywhere (refusal #2 enforced).

## Gate results folded in (tastecheck-cookiepilot-0907)
- BLOCKER fixed: all `.tbl` tables wrapped in `.tblwrap` (overflow-x auto); acceptance probe scrollWidth === innerWidth at 320/390/1024/1440 + 400%-zoom sim — PASS (org-hq ralph-loop/v4/probe.mjs).
- 320px header single-row (connect sheds ≤360px; hero CTA carries connect); `.txrow .sig` overflow-wrap anywhere.
- Kept clean: contrast 38/38 both themes, console-zero, tnum verified, bite geometry compliant.

## Loop outcome (v4, 8 iterations)
Baseline 42 → 68 light / 71 dark / 71 mobile (gemini fidelity to reference). Plateau 67–71 over iters 6–8 → ESCALATION per stop rules: residual gap is structural (honest live data vs comp copy; dual-theme; single-column mobile mandated by AM-5). CEO call needed: accept as SHIP or pin pixel-target frames. Log: org-hq docs/cfo-corpus/expansion/ralph-loop/{loop.log, v4/}.

---

# v5 — POSTER-PURIFY (CEO order 2026-09-07: the hero IS the poster, not a dashboard)

v4's escalation diagnosis: the app made a dashboard wear poster clothes with all widgets still visible. v5 is the structural fix, applied decisively in one pass:

- **Viewport 01 = poster only.** Contents: masthead (logo · pipe · OVEN-FRESH L2 · ISSUE 07) with connect pill + MAINNET LIVE pill + theme toggle; the ONE giant COOK price (fit-to-column JS sizing, 700-weight tabular, cap 150px desktop / 96px mobile); the ▲% 24H delta as a poster-weight TYPE companion (ember-text, no chip); the bitten ember ring centerpiece (solid dough track light / warm tan dark, scallop notch, ~380px); a thin fold-edge stat strip (THROUGHPUT TPS · BLOCK TIME · BRIDGED · HEIGHT as small tabular entries on the fold edge). NOTHING else.
- **AM-5 (updated by v5):** the value proposition lives IN the first viewport as the poster standfirst under the price (reference copy, live block time). The h1 stays the page's value prop.
- **Everything else below the fold:** network facts + finality ("3 ticks to cement") live in 03 — Analytics; one shared StatsProvider poll feeds hero + section 03 (no extra requests).
- **Fold composition:** hero ends with the stat strip (THROUGHPUT TPS · BLOCK TIME · BRIDGED · HEIGHT); the giant "02 — WALLET" section head peeks at the fold like the reference.
- **Texture intact:** page-wide grain bumped (0.085 light / 0.10 dark), halftone quarter-disc enlarged behind the ring, print rules + double rules between sections.
- **Overflow law:** the fit-to-column price cannot overflow at any live value; tblwrap probe acceptance (scrollWidth === innerWidth at 320/390/400%) must keep passing.
.
.

---

# v6 — HONEST-DATA REPAIR (CEO verdict 2026-09-13: "needs a lot of work, starting with the design"; addendum authored 2026-09-13)

Ground truth established before this addendum: the live site (cookiepilot.netlify.app) is byte-identical to master `ab73c7d` v5 (SHA-256 `3617ee29…707d99` both sides). The CEO verdict applies to v5 as deployed. The v5 loop's 93/91/91 gemini scores measured fidelity-to-reference, not design quality; an independent vision battery (org bridge MiniMax-M3, three passes on fresh live captures: light/dark/mobile + full-page + reference comparison, 2026-09-13) converged on three structural findings plus a craft-debt list. All CEO-interview commitments (dual themes light-first, Bite/Crumb Trail/Oven signatures, single warm type family, playful-precise personality, refusal list) remain binding.

## Structural findings (battery verdict)
1. **Hero number collapses under honest data.** The reference's giant price worked at `$0.0142`; live COOK prints `$0.00008257` at poster scale — reads as bug/meme, kills credibility in 3 seconds. The v4 escalation already named this ("honest live data vs comp copy"); v5 doubled down anyway.
2. **Hierarchy inversion.** Poster chrome (giant section numerals, fold-bleeding headlines, vertical marginalia) outweighs product content; sections read as empty editorial spreads; "template filled in, not a designed product surface."
3. **Charts are decorative, not functional.** Sparkline/ring/bars carry no axes, baselines, ranges, or legends while the product's pitch is live network state.

## v6 KEEP (poster DNA worth keeping)
Swiss grid + modular rhythm · cream/ink/ember palette · MAINNET LIVE pulse pill · section numbering as TOC · hero ring as the dominant single-glance viz · compact label+value+unit metric triplets.

## v6 KILL (fights a live data product)
Clever-copy captions as data labels ("EXACTLY 54.5% BAKED") — wordplay stays in marketing lines, never on a datum · hero-scale sparkline that is neither actionable nor decorative · vertical rotated marginalia column · section headlines bleeding off the fold.

## THE HERO FORK — CEO ruling required before the next full pass (renders to be presented side-by-side)
- **Option A — recast the number, keep the gesture (default if no word):** the giant price stays THE poster number but renders in value-preserving poster notation: `0.00826¢` (= $0.0000826) with exact USD in the meta line, or `$0.0₄826` sub-zero form (implemented — the exact form; the sub-zero notation was verified value-correct); delta chip obeys the glyph law below. Reference anatomy intact.
- **Option B — network-health hero:** giant element becomes the epoch/finality ring (live ms-to-cement as the big number: `~458ms` — a number Cookie Chain is actually proud of), KPI matrix beside it; price demoted to an equal-weight chip next to MAINNET LIVE.

## Unconditional v6 fixes (both branches; first implementation pass)
1. Kill the injected "Powered by Netlify" badge (hosting chrome leaking into product UI).
2. Theme toggle: crisp 24px dual sun|moon SVG pair (active at full ink, inactive dim) — replace the pixelated glyphs.
3. Delta glyph law: `▲` only when change > +0.005%, `▼` only when < −0.005%, `◆` (or nothing) at flat ±0.00%; never an up-arrow on `+0.00%`.
4. Chart honesty floor: every chart gets a labeled baseline, min/max value labels with units, and current-value marker; bars get value labels on hover + top-N axis note; the ring gets segment labels (bridged vs native, with COOK amounts). Zero chart deps stays.
5. Section-head scale: numerals step down so content leads (numeral ≤ 2× section title, ≤ content max font); no headline may crop at the fold — the fold peek becomes a hairline + "02 — WALLET" microline, not bleeding display type.
6. Tables (markets/registry/pools): tabular-nums rhythm, unit column headers, row zebra at 3% ink, explicit "—" for nulls; verify no malformed currency strings on live data before shipping.
7. Below-fold densification (staged): sections become workbench panels — real density (inputs + live state) instead of editorial air; wallet section leads with the connect path, not an empty void.
8. Mobile: stat strip wraps 2×2 with hairlines; hero ring ≤ 55% viewport width; no horizontal marginalia.

## Gate
Passes only when: tastecheck battery green (skill protocol below still binding), fresh live-capture battery (both themes × desktop/mobile) shows no craft-debt item remaining, console zero, overflow probe PASS, and the CEO has seen the hero-fork renders and picked. Panel/judge scores do not override the CEO's eyes.

---

# v6 INTERVIEW COMPLETION (CEO order 2026-09-13: "every single answer completed"; external panel seated same day)

Every dimension of the original interview + later forks now carries an answer. Provenance is explicit: **CEO** = his committed choice/directive; **PANEL** = converged external verdict (seats: MiniMax-M3, Floor, Gemini, Kimi, Codex-P/Luna@max-reasoning — all with vision or full transcript; GLM-flash seat rate-limited 429×3, recorded as attempted; Ornith seat unavailable — nuc engine lane serves PERSISTENT-BRAIN, owner change needed to load it; Grok lane 502); **nod owed** = panel-settled, awaiting CEO ratification.

| Dimension | Status | Answer | Basis |
|---|---|---|---|
| reference | **CEO (2026-09-07)** | Swiss editorial poster (gallery pick) — supersedes the v1 "assumed" row | CEO picked it himself; v1 table was never updated |
| structure_rhythm | PANEL, nod owed | Poster fold (hero owns 100svh) → numbered sections as densified workbench panels below; mobile becomes a real cockpit (nav + context + headline KPIs + curated activity), not a raw tx dump | v5→v6 evolution + unanimous panel weaknesses list |
| imagery_iconography | PANEL | Keep the custom 24px line set + bite/crumb motifs; ADD consistent status icons to feed/finality rows (text-heavy today) | floor seat + gemini seat |
| hero_metric | PANEL 5/5 B, nod owed | **B**: block-time hero (~432ms live) + epoch ring + KPI matrix; price demoted to a header pill. A (recast $0.0₄826) held in reserve | minimax/floor/gemini/kimi/codex-luna all B: "the product is blocks, not price" |
| texture | **CEO (2026-09-13 directive)** + PANEL restraint recipe | Realistic cookie crumbs + crackling-cookie surface, IMPLEMENTED restrained: crumbs 2–6px irregular, warm beige/ember, low opacity, bite-anchored + one secondary zone only; crackle hairlines on the ring only; never inside charts/tables/labels, never repeating-pattern, never animated | CEO order verbatim; all 4 vision seats warned literal skeuomorph cheapens — final taste ruling stays CEO's on the renders |
| flat_delta | PANEL | Flat 24h change renders a neutral chip ("24h flat" wording, no directional color/arrow) — a flat delta must not read as a dead feed | kimi + minimax flagged the dead-read; luna recipe |
| community_alignment | **CEO (2026-09-13 directive)** | Hyper-align to Cookie Chain community intent: playful-warm native voice ("oven-fresh L2", "crumb by crumb" — panel: the single most native element, amplify), bite identity, degen-friendly but precise; wordplay never on a datum (v6 KILL row stands) | CEO directive + kimi/luna convergence |
| personality / aesthetic / color_mode / signature / type / density | **CEO (2026-09-06, unchanged)** | As v1 interview — playful-premium, cookie-native, dual themes light-first, Bite/Crumb/Oven, one warm family, airy-then-dense | original interview |
| hosting | CEO question 2026-09-13, answer owed | Netlify was the $0 contest default; edge-proxy rewrites are portable (netlify.toml/vercel.json/_redirects). Recommendation staged for CEO: Cloudflare Pages or self-host on org VPS; cutover only on his word | CEO asked "why Netlify" — answered in session report |

Panel transcripts: org-hq `docs/COOKIEPILOT-PANEL-2026-09-13/` (to be written with the session report). Gate unchanged: CEO's eyes outrank every seat.
