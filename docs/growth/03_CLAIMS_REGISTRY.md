# 03 — Claims registry

**Rule:** if a claim is not in this file as ALLOWED, do not publish it.

Status values: OFFICIAL FACT · PRODUCT FACT · MARKETING CLAIM · INFERENCE · UNVERIFIED  
Verification: VERIFIED · NEEDS REVIEW · FORBIDDEN

| ID | Claim | Type | Source | Source date | Verification | Public | Allowed copy | Forbidden copy |
|---|---|---|---|---|---|---|---|---|
| C01 | Independent educational platform | PRODUCT FACT | slpcommand.com disclaimer | 2026-08-18 | VERIFIED | Y | “Independent educational platform” | “Official platform” |
| C02 | Not affiliated with NATO / any MoD / any examining body | PRODUCT FACT | slpcommand.com /disclaimer | 2026-08-18 | VERIFIED | Y | Full sentence | Any badge, flag, or “NATO official” |
| C03 | AI feedback is indicative, not an official SLP/STANAG assessment | PRODUCT FACT | slpcommand.com FAQ | 2026-08-18 | VERIFIED | Y | “Indicative guidance” | “Certified SLP score” |
| C04 | Trains SLP Level 2 and Level 3 | PRODUCT FACT | slpcommand.com | 2026-08-18 | VERIFIED | Y | “SLP 2 and SLP 3” | “All STANAG levels” / L4 |
| C05 | Four skills: R/L/W/S | PRODUCT FACT | slpcommand.com | 2026-08-18 | VERIFIED | Y | Name the four | “Full official battery of your nation” |
| C06 | Professional €9.99/month | PRODUCT FACT | slpcommand.com/#pricing | 2026-08-18 | VERIFIED | Y | Current price only while live | “Always €9.99” in Terms (Terms refuse to lock a number) |
| C07 | Free quotas 10/10 weekly, 3/3/1 monthly | PRODUCT FACT | slpcommand.com pricing | 2026-08-18 | VERIFIED | Y | Exact quotas | “Unlimited free” |
| C08 | iOS; coming to the App Store | PRODUCT FACT | slpcommand.com | 2026-08-18 | VERIFIED | Y | “iOS” / “coming to the App Store” until live | “Available on Android” / “Download now” if not live |
| C09 | No pass probability, on purpose | PRODUCT FACT | slpcommand.com roadmap/FAQ | 2026-08-18 | VERIFIED | Y | “We will not give a pass %” | “72% likely to pass” |
| C10 | STANAG 6001 is the NATO language-proficiency standard | OFFICIAL FACT | https://nato-bilc.org/stanag-6001/ | fetched 2026-08-18 | VERIFIED | Y | Cite BILC | “We wrote the standard” |
| C11 | There is no single official NATO English exam | OFFICIAL FACT | JAPCC article | fetched 2026-08-18 | VERIFIED | Y | “Nations implement the descriptors” | “The NATO exam” as one paper |
| C12 | SLP order is L-S-R-W | OFFICIAL FACT | Public STANAG explainers + product | 2026-08-18 | VERIFIED | Y | “Listening, Speaking, Reading, Writing” | Averaging digits |
| C13 | Spanish sitting described via SIPERDEF/SOLIDI | INFERENCE from third-party guides | online-speaking.com Jul 2026 | 2026-07-29 | NEEDS REVIEW vs official | Y only as “publicly described; verify officially” | “We are the convocatoria” / fake dates |
| C14 | Best / only STANAG app | MARKETING CLAIM | — | — | FORBIDDEN | N | — | “Best app”, “only dedicated platform” |
| C15 | Used by NATO / unit X | UNVERIFIED | — | — | FORBIDDEN | N | — | Any unit, HQ, or flag endorsement |
| C16 | Guaranteed apto / pass | MARKETING CLAIM | — | — | FORBIDDEN | N | — | “Aprobarás sí o sí” |
| C17 | Academy topic counts | PRODUCT FACT | web catalogues differ per skill (Reading 12+, Listening 25 topics, no Speaking Academy on the web) | 2026-09-02 | RETIRED — do not publish a per-skill number | N | Describe the Academies without a count; “Reading and Writing Academy in full on Free; Listening every topic on Pro” | “11 topics per skill”; any Speaking Academy on the web |
| C18 | Speaking scored on four assessment criteria (Content, Tasks, Accuracy, Text produced) | PRODUCT FACT | `components/speaking/SpeakingPractice.tsx` (`SpeakingResultCard`, keys `content`/`tasks`/`accuracy`/`textProduced`) | 2026-08-19 | VERIFIED against product code | Y | Name the four; “four assessment criteria” | “Five dimensions”; “Official examiner score”; stating these four are a verbatim quotation from a specific BILC document without a fetched, dated source for that document |
| C19 | Ready GO €119–129/mo | COMPETITOR FACT | readygotraining.com | 2026-08-18 | VERIFIED | Internal / fair compare only | Do not misquote their price |
| C20 | Okara is $120/mo | UNVERIFIED | Conflicting public pages ($99 / $129 / $249) | 2026-08-18 | UNVERIFIED | N | Confirm checkout | Publish a price we did not see |

| C21 | The web application is available now; iOS is coming to the App Store | PRODUCT FACT | slpcommand.com (deployed web app); C08 | 2026-09-02 | VERIFIED | Y | “Web app, available now”; “iOS app coming to the App Store” | “Available on the App Store”; “download the app” |
| C22 | Live AI Speaking Coach: Professional only, 30 minutes a month, desktop browser, minutes do not carry over | PRODUCT FACT | backend ENTITLEMENTS-CATALOG-001.md; components/coach/CoachPreSession.tsx (desktop-only) | 2026-09-02 | VERIFIED | Y | State all four facts wherever the Coach is sold | “Unlimited Coach”; “live examiner” without “AI”; omitting desktop-only |
| C23 | Spaced review exists only for Writing | PRODUCT FACT | GET /api/health spacedRepetitionDetail | 2026-09-02 | VERIFIED | Y | Do not mention spaced review on public pages unless scoped to Writing | “A spaced-review scheduler” for Reading/Listening/Speaking |
| C24 | Writing evaluation returns a task verdict and an examiner write-up | PRODUCT FACT | lib/api/writing.ts WritingCorrection | 2026-09-02 | VERIFIED | Y | “Verdict on the task first, then the examiner's write-up” | “An improved version beside yours” (no such field on the web) |
| C25 | Organisation (academy) workspaces exist in early access; not self-serve; no public price | PRODUCT FACT | /teacher/* routes; feature flag academy_self_serve_enabled=false | 2026-09-02 | VERIFIED | Y | “Early access, by arrangement” | An academy plan, seat price, or “sign up your academy” |
| C26 | Professional is purchasable on the web (card, hosted checkout) | PRODUCT FACT | feature flag web_billing_enabled=true; app/(app)/subscription | 2026-09-02 | VERIFIED | Y | “Pay by card on the web from inside the app” | Naming a payment processor the page cannot verify |

**Human approval required before changing C06, C07, C08, C13, C21.**

**Enforcement (2026-09-02).** `tests/unit/claimsRegistry.test.ts` scans the rendered marketing pages (`/`, `/product`, `/pricing`, `/academies`), every authority page, every legal document and `llms.txt`. `tests/unit/marketingPages.test.ts` additionally pins C18 (four Speaking criteria), C21, C23, C24 and C25 on the rendered pages, and `tests/unit/conversion.test.ts` pins C06 and C07 against `lib/conversion.ts`.
