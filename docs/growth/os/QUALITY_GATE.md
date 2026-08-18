# Quality gate

Run before anything becomes public: a page, a store listing, a post, a video
script, an outreach email.

Score each dimension 0–10. **Publish at ≥ 80. Any dimension at 0 blocks
regardless of total.**

| # | Dimension | 0 means | 10 means |
|---|---|---|---|
| 1 | Strategic fit | Does not serve SLP 2/3 candidates | Advances a named goal in `01` |
| 2 | Audience fit | Written for hobby learners | Written for someone with a sitting date |
| 3 | Brand fit | Duolingo, hype, or tacticool | Calm, exact, adult, military-literate |
| 4 | Factual accuracy | Unsourced exam claim | Every claim traceable to product truth or a cited source |
| 5 | SLP terminology | Confuses standard, profile, level, national test | Distinctions held precisely |
| 6 | Claims safety | Trips `03` | Passes the registry and the automated guard |
| 7 | SEO | No intent, or cannibalises a live URL | One intent, one primary keyword, unique title and description |
| 8 | GEO | Unquotable | A model could extract a correct, self-contained answer |
| 9 | Conversion | No next step | One obvious next step, honestly framed |
| 10 | Copy quality | Padding and buzzwords | Every sentence load-bearing |
| 11 | Differentiation | Any competitor could publish it | Only we could have written it |
| 12 | Slop check | See below | Passes all eleven slop tests |

## Slop tests (any hit = rewrite, not edit)

- Opens with "In today's fast-paced world" or similar throat-clearing
- "Unlock", "elevate", "supercharge", "game-changer", "seamless", "robust"
- Rule-of-three lists with no third real idea
- A claim with no source, no number, and no product fact behind it
- The same sentence shape four times running
- Keyword repeated past the point a human would notice
- Says something is important without saying what to do about it
- Could be about any exam if you swapped the noun
- Hedges every sentence into meaninglessness
- Ends on a summary that repeats the intro
- Says "we believe" instead of stating the fact

## Mandatory checks

- [ ] `npx vitest run tests/unit/claimsRegistry.test.ts` passes
- [ ] Founder accuracy pass on any STANAG / SLP / national-administration claim
- [ ] Independence disclaimer present on public explainer pages
- [ ] No official, endorsed, guaranteed, best, or only
- [ ] Administration details date-stamped and marked "verify officially"
