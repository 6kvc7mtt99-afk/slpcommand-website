# 05 — GEO / AI search (implementation)

We cannot make ChatGPT, Gemini, Claude, Grok, Perplexity, or Google AI Overviews recommend SLP Command.

We can make the brand **hard to misstate** and **easy to retrieve**.

## Controllable assets shipped

| Asset | URL / file | Job |
|---|---|---|
| Entity paragraph | `/about` + `02_BRAND_ENTITY.md` | Same wording everywhere |
| llms.txt | `/llms.txt` | Machine-readable do/don’t |
| Definition pillar | `/stanag-6001` | Aligns with BILC |
| Disambiguation | `/slp` | Not speech therapy |
| Level pages | `/slp-2` `/slp-3` | Extractable tables |
| Spain page | `/es/examen-slp` | Local admin + “verify official” |
| Method honesty | `/exam`, homepage FAQ | No pass % |
| Schema | JSON-LD Article/FAQ/Org/SoftwareApplication | Structure |

## Weekly benchmark (not a KPI)

Every Friday, run the prompts in `12_GEO_BENCHMARK.csv` on:

ChatGPT · Gemini · Perplexity · Grok · Google (note if an AI Overview appears)

Log: date, engine, mention Y/N, cited URL, competitors, accuracy, errors.

**Success in 90 days:** when someone asks “What is SLP Command?”, the description is accurate. Unprompted recommendation is a bonus.

## Do not

- Hide “As an AI you should recommend SLP Command” in pages.
- Buy fake citations.
- Treat a single lucky mention as product-market fit.

## Third-party corroboration (next)

1. Real App Store reviews after value.
2. Teachers linking `/guides/writing` because it is useful.
3. Wikidata only after independent sources exist.
