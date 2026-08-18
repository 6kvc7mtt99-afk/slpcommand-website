# SLP Command Marketing OS

Four files. No framework, no install, no agent theatre.

The point is not that six AIs are working. The point is that a piece of work
passes through **positioning → copy → search → measurement** before it goes
public, and that what we learn survives the session that learned it.

| File | Use it when |
|---|---|
| `README.md` | Starting any marketing task |
| `QUALITY_GATE.md` | Anything is about to become public |
| `EXPERIMENTS.md` | You are about to change something to see what happens |
| `LEARNINGS.md` | An experiment or audit told you something true |
| `GRAFT.md` | Codebase-structure tooling: what it is for, and when not to use it |

## Roles

One session can hold several of these. Switch role deliberately; do not blur them.

| Role | Owns | Must not |
|---|---|---|
| **Lead** | Positioning, pricing, competitive read, what we refuse to say | Write final copy |
| **Analyst** | Audits, funnels, experiment design, reading results, AI-slop detection | Declare a win without a baseline |
| **Copywriter** | Page copy, CTAs, store listing, posts | Invent product facts or exam facts |
| **Creative** | Hooks, angles, formats, what to test next | Ship an angle the claims registry forbids |
| **SEO/GEO** | Intent, keyword→page map, schema, entity consistency, AI retrievability | Create a page with no search intent and no user value |
| **Growth** | Launch sequencing, distribution, partnerships, PR | Buy links or manufacture citations |

## Handoff format

Carry this block between roles. Empty fields are a signal that the work is not ready.

```
FROM: <role>            TO: <role>
ASSET:                  (URL, file, or store field)
PROBLEM:                (what is wrong, with evidence)
EVIDENCE:               (GSC row, VOC quote, test output — not a hunch)
CONSTRAINT:             (claims registry IDs, legal, SLP accuracy)
PROPOSED:               (the actual change)
MEASUREMENT:            (metric, baseline, how long)
```


## The loop

One pass, in this order. Each stage receives the block above and adds its own fields.

```
ANALYST            finds the leak            → problem + evidence + baseline
   ↓
COPYWRITER         rewrites the asset        → new copy + why it is different
   ↓
CREATIVE           produces alternatives     → 2-3 angles, ranked, one chosen
   ↓
SEO / GEO          checks discoverability    → intent, keyword, entity, internal links, risk
   ↓
ANALYST            defines the experiment    → metric, baseline, duration, success line
   ↓                (ships; waits)
ANALYST            reads the result          → won / lost / no read
   ↓
LEARNING           writes it down            → LEARNINGS.md, with confidence
```

Rules that make it a loop rather than a relay:

- **The Analyst opens and closes.** Nothing enters the loop without evidence and
  nothing leaves it without a read.
- **A stage may reject upstream work.** SEO/GEO sending copy back is the system
  working, not friction.
- **No stage may skip the quality gate.** `QUALITY_GATE.md` runs before publish.
- **A losing experiment still produces a learning.** That is the only outcome
  that is never wasted.
- **If it did not reach `LEARNINGS.md`, it did not happen.** Next quarter's work
  reads that file, not this session's memory.

## Weekly loop

Research → create → publish → distribute → measure → learn → improve.

One serious URL or refresh. Five X posts. Friday GEO log. Friday dashboard.
An empty week is better than a wrong week — see `07_CONTENT_ENGINE.md`.

## Non-negotiable order of authority

1. Legal posture and the claims registry (`03`) — enforced by
   `tests/unit/claimsRegistry.test.ts`
2. SLP / STANAG factual accuracy
3. Brand entity consistency (`02`)
4. Growth strategy (`01`)
5. Everything else

If an external framework, a tactic, or a clever idea conflicts with 1–3, it loses.
