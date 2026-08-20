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
| C17 | 11 Academy topics per skill | PRODUCT FACT | slpcommand.com | 2026-08-18 | VERIFIED | Y | Exact number while true | Inflate |
| C18 | Speaking scored on four assessment criteria (Content, Tasks, Accuracy, Text produced) | PRODUCT FACT | `components/speaking/SpeakingPractice.tsx` (`SpeakingResultCard`, keys `content`/`tasks`/`accuracy`/`textProduced`) | 2026-08-19 | VERIFIED against product code | Y | Name the four; “four assessment criteria” | “Five dimensions”; “Official examiner score”; stating these four are a verbatim quotation from a specific BILC document without a fetched, dated source for that document |
| C19 | Ready GO €119–129/mo | COMPETITOR FACT | readygotraining.com | 2026-08-18 | VERIFIED | Internal / fair compare only | Do not misquote their price |
| C20 | Okara is $120/mo | UNVERIFIED | Conflicting public pages ($99 / $129 / $249) | 2026-08-18 | UNVERIFIED | N | Confirm checkout | Publish a price we did not see |

**Human approval required before changing C06, C07, C08, C13.**
