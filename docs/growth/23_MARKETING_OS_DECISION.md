# 23 — Marketing OS capability audit and decision

**Audited:** 18 August 2026 · **Decider:** Chairman review · **Subject:** `github.com/scayver/marketing-skills`

## Verdict

**DO NOT INSTALL.** Read it as reference. Adopt three checklists in local form.

This is not a quality judgement on the content, which is reasonable. It is a
supply-chain judgement, and the numbers decide it.

## What it actually is

| Property | Value |
|---|---|
| Skills | 76 markdown files |
| Executable tooling | 62 JavaScript CLIs, 347 integration guides |
| Licence | MIT (Copyright 2026 Alain Dorcelus) |
| Stars / forks | **1 / 1** |
| Latest tagged release | v1.7.0, 2026-05-28 |
| Install path | `npx skills add scayver/marketing-skills` → `.agents/skills/` |

## Why the answer is no

1. **One star.** There is no community, no issue history, and no second pair of
   eyes on 62 executable files. "Open source" is not "reviewed".
2. **`npx skills add` runs code and writes into the repo.** This repository holds
   `.dev.vars`, `.env.local`, Supabase credentials, auth proxy logic and billing
   routes. The cost of a bad install is not a bad blog post.
3. **The repo ships `env-secrets-manager` and `skill-security-auditor` skills.**
   Whatever their intent, a 1-star repo offering to manage secrets is precisely
   the thing a chairman declines.
4. **Coverage is already met.** `01`–`22` plus this file cover positioning,
   claims, SEO, GEO, ASO, content, PR, analytics and the 90-day plan — written
   against SLP Command's actual product, exam domain and legal posture. A
   generic `saas-launch` skill knows nothing about STANAG 6001.
5. **Maintenance.** 76 files we did not write, tracking an upstream we do not
   control, is a permanent tax against a founder-run operation.

## What is genuinely worth taking

Three ideas, reimplemented locally in our own words. No install, no dependency.

| Idea | Where it now lives | Why it earned its place |
|---|---|---|
| Named roles with structured handoffs | `os/README.md` | Stops one undifferentiated "write marketing" prompt |
| Scored quality gate before publish | `os/QUALITY_GATE.md` | Catches AI-slop and unsafe claims before they are public |
| Persistent experiment + learning ledger | `os/EXPERIMENTS.md`, `os/LEARNINGS.md` | Turns one-off outputs into compounding knowledge |

## Answers to the six questions asked

1. **Adopt:** none as installed packages. Three concepts, rewritten locally.
2. **Overlaps with the existing system:** positioning, competitors, pricing, SEO,
   ASO, content strategy, launch, PR, analytics — all already covered by `01`–`22`
   with domain specifics the generic versions cannot have.
3. **Materially improves Claude's capability:** the handoff format and the scored
   quality gate. Both are now local files.
4. **Do not adopt:** every executable CLI, `env-secrets-manager`,
   `directory-submissions` (spam risk), `programmatic-seo` (thin-page risk against
   a trust-led brand), `cold-email` and `prospecting` (no list, and GDPR exposure).
5. **Implemented:** `os/README.md`, `os/QUALITY_GATE.md`, `os/EXPERIMENTS.md`,
   `os/LEARNINGS.md`.
6. **Optional:** re-audit if the repo reaches meaningful adoption and an
   independent security review. Revisit at the Day 90 kill/keep review.

## Standing rule

SLP Command's product truth, claims registry, legal posture and SLP methodology
override any external marketing framework. Where a framework recommends volume,
programmatic pages, scraped outreach or manufactured authority, it is rejected —
those tactics are specifically corrosive to a brand whose entire position is
"we do not overstate what we know".
