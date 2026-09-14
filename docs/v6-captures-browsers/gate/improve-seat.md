# improve-existing-website seat — v6.3 pass (2026-09-13)

Direction audit of the EXISTING seat per the latest pack's SKILL.md: inspect the rendered
priority path before prescribing; label direct observations **EVIDENCE** and interpretations
**INFERRED**; classify Preserve / Normalize / Approval-needed. Priority path walked live at
1440×900 and 390×844, both themes (this pass's captures + probes).

## Inspection findings

| # | Observation | Label | Class |
|---|---|---|---|
| 1 | Hero = poster: masthead + giant COOK price + bitten ring centerpiece + fold-edge stat strip; sections numbered 02–05 below (rendered DOM, all captures) | EVIDENCE | Preserve |
| 2 | Bite/crumb/oven motifs repeat across favicon, ring, tx trail, feed — one geometry family, one warm palette (charts.tsx/styles.css/captures) | EVIDENCE | Preserve |
| 3 | CEO interview + v2–v6 addenda fix personality/playful-premium, dual themes light-first, Bite/Crumb/Oven signatures, single warm type family (DESIGN-SYSTEM.md rows all marked committed/CEO) | EVIDENCE | Preserve |
| 4 | Community-native voice ("oven-fresh L2", "Processed · Confirmed · Finalized", "crumb by crumb") consistently applied and never on a datum (copy walk) | EVIDENCE | Preserve |
| 5 | The old bite notch read as geometric (CEO verdict, 2026-09-13, quoted in directive) | EVIDENCE | Repair (done this pass: real-bite crescent, AM-3 v6.3) |
| 6 | Charts carry baselines, MIN/MAX/NOW labels, segment legends, aria-labels (DOM probes this pass: sparkLabels=3, ringSegments=2, barValueLabels=2) | EVIDENCE | Preserve |
| 7 | "The brand values warmth" — inferred from palette+copy; the CEO interview states playful-premium explicitly, so warmth is interview-backed but specific phrasing is ours | INFERRED | Preserve (documented) |
| 8 | Uniform 3-card grid + 11-row feed warn (gate-audit.js, all 3 engines, 6 warns) reads as intentional poster/workbench cadence, not template sameness — section numbering + distinct panel content | INFERRED | Preserve (documented decisions, kept) |
| 9 | Giant price `$0.00007003` at poster scale loses meaning for new visitors — v6 battery finding; notation fork (recast vs network-health hero) still open | INFERRED (from vision battery convergence) | **Approval needed** — CEO hero fork, carried |
| 10 | 41 below-fold microtext links < 24px tap targets (a11y-audit.js, measured) | EVIDENCE | Repair (staged: below-fold rework pass, carried) |
| 11 | Connect modal lacked Escape/close (keyboard-stranding dialog) — found by this pass's control-state probes; fixed this pass | EVIDENCE | Normalize (done) |
| 12 | Swap submit silently disabled on invalid input (form-ux non-negotiable violation) — found this pass; fixed with explained errbox + measured recovery | EVIDENCE | Normalize (done) |
| 13 | No shadow roots / iframes anywhere (DOM probe: 0/0) | EVIDENCE | n/a row evidence |

## Readiness decision

Direction is approvable without reconstruction: identity signals (1–4, 6) are directly
observable and internally consistent; this pass's repairs (5, 11, 12) are defects, not
identity changes. The one open approval item (9) is the already-staged CEO hero fork.
Deferred ambiguity: none new.

## Repairs this pass (observed failure → smallest coherent edit → proof)

| Repair | Observed failure | Edit | Proof (same path, re-measured) |
|---|---|---|---|
| Real bite | CEO: "doesn't look like a real bite" | realBiteGeometry crescent in charts.tsx (AM-3 v6.3) | vision verdicts REAL on chromium/webkit/firefox/real-Safari; bite path 46-pt wound edge + rim arc in DOM |
| Modal dismiss | Escape did not close dialog; no visible close | keydown Escape → onClose + labeled .modal-x button | probe: closedOnEsc=true |
| Swap recovery path | submit silently disabled at canQuote=false | explained errbox on invalid click, button enabled unless busy | probe: err present → pick token + amount → quoteout visible, err gone |

Signal survived: bite anchored on outer edge, one bite, crumbs at the wound, ring still
states bridged-share with segment legend; poster anatomy unchanged in all captures.
