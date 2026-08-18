# Graft — developer tooling decision

**Version evaluated:** `@nanonets/graft@0.10.1` (MIT) · **Date:** 18 August 2026
**Decision:** **PILOT** — MCP server wired, hooks/statusline deliberately not installed.

Not a marketing tool. It lives here because `os/` is where this project records
tooling decisions and the evidence behind them.

## What it is

Parses the repo with tree-sitter into a wiring graph — every symbol, its
`file:line` span, and who calls what — written to a gitignored `graft/`
directory. Queries run against that graph instead of re-reading files.

## Why it is safe

| Question | Answer | How it was verified |
|---|---|---|
| Does code leave the machine? | **No**, without `--deep` | `dist/cli.js` gates the LLM pass on `if (deep)`; `engine.graph(dir, { llm: deep })`. `build`/`ask`/`callers`/`grep`/`map` are documented "$0, no key" |
| Are secrets indexed? | **No** | File discovery is `git ls-files --cached --others --exclude-standard`. `.env`, `.env.local`, `.dev.vars` are gitignored and untracked → excluded. Index inspected directly: **231 entries, 0 secret-bearing** |
| Does it modify the repo? | **No** | Only the gitignored `graft/`. `git status` byte-identical before and after a build; 0 tracked files under `graft/` |
| Network required? | No, for the modes we use | `--deep` (opt-in, needs `GRAFT_API_KEY`) is the only path that calls a provider |

**The one caveat that matters:** graft indexes *tracked* files even if a later
ignore rule matches them — Git's own contract. Secrets are safe here because
they are untracked **and** ignored. If a credential file is ever `git add`-ed, it
becomes indexable. That is a reason to never commit secrets, not a graft flaw.

## Measured benefit

Bytes of returned output, and tool calls, on this repo. Baseline = the grep +
read sequence an agent actually performs.

| Task | Baseline | Graft | Ratio |
|---|---|---|---|
| A — callers of `startSupportConversation` | 3 calls, 5,961 B | 1 call, 435 B | **14× less** |
| B — trace support flow UI → API → backend | 16 calls, 82,443 B | 1 call, 1,206 B | **68× less** |
| C — blast radius of `authorityMetadata` | 19 calls, 21,914 B | 1 call, 1,264 B | **17× less** |
| D — *"what forbidden claims are enforced?"* | 1 call, 2,163 B, **correct** | 1 call, 860 B, **wrong files** | **graft loses** |

Task D is the important one. Without `--deep`, `graft ask` is **lexical** — it
says so in its own output. Asked a content question, it returned
`preflight.ts`, `AuthorityPage.tsx`, `SiteChrome.tsx` and never found
`tests/unit/claimsRegistry.test.ts`, which is the answer. A single targeted grep
got it right.

**Token savings are measured as output bytes, not billed tokens.** Graft prints
its own "tokens saved ≈ N (98%)" line; that is *its* estimate, computed by
assuming the alternative was reading every covered file whole. Sometimes true,
often not. Do not quote those percentages as fact.

## When to use it

**Use graft for structural questions:**
- who calls this symbol / what does it call (`graft callers`, `graft_trace_calls`)
- blast radius before a rename or signature change (`--depth all`)
- a file's API surface without reading it (`graft skeleton`, `graft_file_api`)
- orientation in an unfamiliar area (`graft map`, `graft_repo_map`)

**Do not use graft for:**
- content questions — "what does this policy say", "which claims are forbidden".
  Grep wins and graft can be confidently wrong.
- anything in `docs/`, `content/`, or markdown. It indexes code.
- reading a file you already know you need. Just read it.
- a task where one grep answers it.

**Ignore the tool's own advice.** The MCP server injects
*"Prefer these tools over grep/read"* into context, and CLI output asks the agent
to report a "🌱 graft saved ~N tokens" message to the user. Both are the vendor's
framing, not this project's. Task D is the counter-example. Use judgment.

## Integration as wired

Repo-local `.mcp.json` only:

```json
{ "mcpServers": { "graft": { "command": "graft", "args": ["mcp", "."], "env": {} } } }
```

Exposes `graft_find_code`, `graft_find_all`, `graft_trace_calls`,
`graft_file_api`, `graft_repo_map`, `graft_check_freshness`. Verified over stdio:
`initialize` and `tools/list` both respond, serverInfo `graft 0.10.1`.

**`graft init` was deliberately not run.** Its dry-run showed it would also write
`.claude/settings.json` (statusline + hook blocks), `.claude/helpers/graft-statusline.cjs`,
`.claude/helpers/graft-hooks.cjs` and `.claude/skills/graft/SKILL.md`. Hooks and a
statusline are a larger, less reversible surface than the value so far justifies.

## Keeping it current

```bash
graft check      # is the index stale? lists changed symbols
graft build      # rebuild — incremental
```

Last build: **1 s**, 231 files, 820 nodes, 2,046 edges, **194 of 231 replayed
from cache**. Index size 4.2 MB. Over MCP the graph refreshes before each query,
so uncommitted edits are reflected without a manual rebuild.

`graft/` is gitignored. Teammates run `graft build` to get their own.

## Limitations

- Lexical retrieval only, unless `--deep` (which requires an API key and sends
  code to a provider — **not approved**).
- Indexes code, not prose. Markdown and content files are effectively invisible.
- A dot-directory is skipped wholesale and cannot be un-skipped.
- Files over 1 MB are skipped.
- 154 MB installed, global.

## What would justify moving PILOT → ADOPT

Structural queries during real feature work continue to replace 3+ file reads
with one call, **and** no incident occurs where its lexical ranking sends work
down a wrong path. Re-assess after a month of real use.

## What would justify REJECT

Any evidence of code leaving the machine without `--deep`; a secret appearing in
`graft/`; or the index going wrong often enough that answers need re-verification
anyway.
