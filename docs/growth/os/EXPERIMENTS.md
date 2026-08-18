# Experiment ledger

One row per experiment. No row, no experiment.

Rank by **ICE**: Impact (1–10) × Confidence (1–10) ÷ Effort (1–10).
Do not start a second experiment on the same surface while one is running.

## Rules

1. A baseline recorded **before** the change, or it is not an experiment.
2. One variable.
3. Success and duration written down before the change ships.
4. A losing experiment that produced a clean read is a success — log the learning.
5. No experiment may violate the claims registry to win.

## Open

| ID | Date | Hypothesis | Asset | Variable | Baseline | Success metric | Duration | ICE | Status |
|---|---|---|---|---|---|---|---|---|---|
| E01 | 2026-08-18 | Authority pages with a real social card earn materially more link clicks than bare text links | 12 authority URLs + X posts | og:image present and 1200x630 | 0 cards rendered (verified: `og:image` absent on all 12) | Click-through on shared links; card renders in X/LinkedIn validators | 30d after first distribution | 9×9÷2 = 40 | RUNNING |
| E02 | — | ES storefront subtitle with `2222 & 3333` lifts Spanish install rate | App Store subtitle ES | Subtitle | Unknown — store not live | Impression→install +10% rel. | 21d | — | BLOCKED (store) |
| E03 | — | Shortening registration lifts reg→first-scored-practice | iOS onboarding | Field count | Unknown — events not yet firing | Reg→practice ≥ 40% | 21d | — | BLOCKED (analytics) |

Store experiments A1–A6 live in `13_ASO_TEST_MATRIX.md` and stay blocked until
the app is live and impressions exist.

## Completed

| ID | Result | Learning | Logged in |
|---|---|---|---|
| — | — | — | — |

## Template

```
ID:
DATE:
HYPOTHESIS:        We believe <change> will cause <effect> because <reason>
ASSET:
VARIABLE:
BASELINE:          (number + how measured + when)
CHANGE:
EXPECTED IMPACT:
EFFORT / RISK:
SUCCESS METRIC:
DURATION:
RESULT:
LEARNING:
NEXT ACTION:
```
