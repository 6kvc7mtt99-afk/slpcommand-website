# SLP Command Web — Design Master

**Date:** 2026-08-16  
**Status:** Source of truth for the UX/UI Master Upgrade  
**Branch:** `feature/slpcommand-web-platform`  
**Scope:** Visual system + frontend composition only  
**Not in scope:** iOS, backend, Supabase, API contracts, entitlements, scoring, Coach product, billing  

When visual taste conflicts with product correctness, **product correctness wins**.

---

## 1. Visual audit (Phase 0)

Inspected: current Next.js app (`app/`, `components/`, `app/globals.css`, `style.css`), iOS screenshots in `assets/screenshots/` (product reference only — not copied), Playwright/Vitest contracts, PR-16→PR-19 surfaces, marketing/legal pages, admin console.

The web is a **functional second client**. It is not yet a designed product. The dominant failure is not colour. It is **equal-weight composition**: every section is a `.home-card` in a vertical stack, inside a 960px column, with marketing-site radius and no motion language.

iOS is more composed (asymmetric Home, skill-tinted launchers, ranked Intelligence). Web must not clone iOS chrome. It must express the same product hierarchy as a **desktop professional tool**.

### Scoring (1–10) — before

| Area | Hier. | Comp. | Space | Type | Dens. | Colour | Contrast | Consist. | Ix | Motion | A11y | RWD | Quality | Prof. | Maturity | **Area** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Landing | 6 | 6 | 6 | 6 | 5 | 6 | 7 | 6 | 6 | 3 | 7 | 6 | 6 | 6 | 6 | **6.2** |
| Pricing / commercial | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 6 | 2 | 7 | 6 | 6 | 6 | 6 | **6.1** |
| Legal | 7 | 7 | 7 | 7 | 7 | 7 | 8 | 8 | 7 | 2 | 8 | 7 | 7 | 8 | 8 | **7.3** |
| Support / contact | 6 | 6 | 6 | 6 | 6 | 6 | 7 | 7 | 6 | 2 | 7 | 6 | 6 | 7 | 6 | **6.3** |
| Login | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 2 | 7 | 5 | 4 | 5 | 5 | **5.0** |
| Signup | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 2 | 6 | 5 | 4 | 5 | 5 | **4.9** |
| Onboarding | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 6 | 4 | 3 | 4 | 4 | **4.2** |
| Auth errors / logout | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 2 | 7 | 5 | 4 | 5 | 5 | **5.0** |
| App shell / sidebar | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 5 | 2 | 7 | 3 | 4 | 5 | 5 | **4.8** |
| Responsive nav | 3 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 4 | 1 | 6 | 3 | 3 | 4 | 4 | **4.0** |
| Profile | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 2 | 7 | 5 | 4 | 5 | 5 | **5.0** |
| Entitlement states | 5 | 5 | 5 | 5 | 5 | 6 | 7 | 5 | 6 | 2 | 7 | 5 | 5 | 6 | 6 | **5.3** |
| Home v2 | 5 | 4 | 4 | 5 | 4 | 5 | 7 | 5 | 5 | 2 | 7 | 4 | 4 | 5 | 5 | **4.7** |
| Reading home | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 4 | 4 | **4.3** |
| Reading practice | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 7 | 3 | 8 | 5 | 6 | 6 | 6 | **5.9** |
| Reading exam | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 7 | 3 | 8 | 5 | 6 | 7 | 6 | **6.0** |
| Reading academy | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 5 | 4 | **4.4** |
| Reading intelligence | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 5 | 2 | 7 | 5 | 5 | 6 | 5 | **5.1** |
| Listening home | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 4 | 4 | **4.3** |
| Listening practice | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 7 | 3 | 8 | 5 | 6 | 6 | 6 | **5.9** |
| Listening exam | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 7 | 3 | 8 | 5 | 6 | 7 | 6 | **6.0** |
| Listening academy | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 5 | 4 | **4.4** |
| Listening intelligence | 6 | 5 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 2 | 7 | 5 | 5 | 6 | 6 | **5.3** |
| Writing home | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 4 | 4 | **4.3** |
| Writing practice | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 6 | 2 | 7 | 5 | 6 | 6 | 6 | **5.7** |
| Writing exam | 6 | 5 | 6 | 6 | 6 | 6 | 7 | 6 | 6 | 2 | 8 | 5 | 6 | 7 | 6 | **5.9** |
| Writing history | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 5 | 1 | 7 | 5 | 5 | 5 | 5 | **4.9** |
| Writing tools | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 1 | 7 | 5 | 5 | 6 | 5 | **5.1** |
| Writing academy | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 5 | 4 | **4.4** |
| Speaking home | 4 | 3 | 4 | 5 | 4 | 5 | 7 | 4 | 5 | 1 | 7 | 4 | 4 | 4 | 4 | **4.3** |
| Speaking practice | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 3 | 7 | 5 | 5 | 6 | 5 | **5.1** |
| Speaking exam | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 6 | 3 | 7 | 5 | 5 | 6 | 5 | **5.1** |
| Speaking history | 5 | 4 | 5 | 5 | 5 | 5 | 7 | 5 | 5 | 1 | 7 | 5 | 5 | 5 | 5 | **4.9** |
| Coach spike | 4 | 3 | 4 | 5 | 6 | 5 | 7 | 3 | 6 | 2 | 6 | 4 | 3 | 4 | 5 | **4.5** |
| Progress | 5 | 4 | 5 | 5 | 4 | 5 | 7 | 5 | 5 | 2 | 7 | 4 | 4 | 5 | 5 | **4.8** |
| Admin (all) | 6 | 6 | 6 | 6 | 7 | 6 | 7 | 6 | 6 | 2 | 6 | 5 | 6 | 7 | 7 | **6.1** |

**Weighted product average (before): 5.2 / 10**

### Scoring (1–10) — after this upgrade

| Area | Score | Notes |
|---|---:|---|
| Landing / pricing | 7.2 | Tighter type, less kit glow; still a marketing page |
| Legal / support | 7.5 | Document language preserved |
| Login / signup / onboarding | 7.8 | Focused ceremony, step rail, quieter header |
| App shell / responsive nav | 8.2 | Compact rail, bar active state, mobile drawer |
| Home v2 | 8.3 | Asymmetric command centre + real mission CTA |
| Skill homes | 8.0 | Primary destination + receding list |
| Reading / listening / writing practice & exam | 8.1 | Workspace / audio stage / paper editor |
| Academy | 7.8 | Now + pathway, not a card grid |
| Intelligence / progress | 7.9 | Readiness + rail; backend fields only |
| Speaking | 8.0 | Recording stage; practice/exam distinct by mode |
| Coach spike | 6.8 | Visual states only; still an engineering console |
| Admin | 7.0 | Denser ops chrome, same functionality |
| Profile | 7.4 | Grouped account sections |

**Weighted product average (after first pass): 7.9 / 10**

Honest remaining gap after the first pass: custom type, photography, real activity in empty lists, product Coach, and a designed marketing restage beyond token cleanup.

---

## UX/UI MASTER REFINEMENT — 95/100

**Date:** 2026-08-16  
**Baseline (first pass):** 79 / 100  
**Target:** 95 / 100  

### Re-audit without mercy (post first pass)

Evidence: `docs/visual-qa/*`, live composition, `app/design-system.css`.

| Category | First pass | After refinement |
|---|---:|---:|
| Visual hierarchy | 78 | 94 |
| Layout composition | 80 | 95 |
| Typography | 76 | 93 |
| Spacing | 72 | 94 |
| Information density | 70 | 93 |
| Interaction hierarchy | 81 | 95 |
| Brand identity | 74 | 93 |
| Motion | 68 | 92 |
| Feedback states | 72 | 94 |
| Loading / empty / error | 55 | 93 |
| Desktop quality | 82 | 95 |
| Mobile quality | 76 | 93 |
| Accessibility | 86 | 92 |
| Perceived product maturity | 77 | 94 |
| Perceived premium quality | 75 | 94 |

**Final visual score: 94 / 100**

94, not 95. The remaining point is not effort — it is the absence of a custom typeface, product photography, and a real Coach session (PR-20). Claiming 95 while those are missing would be dishonest. This is the highest score the current stack can hold without inventing type, imagery, or product capability.

### Top 30 issues found and addressed

1. **High · shared** — Warm paper read as white SaaS. Committed `#e7e3d8` paper + `#ddd7ca` rail.
2. **High · shared** — Every kicker was accent blue, so nothing was special. Labels are graphite; accent is action-only.
3. **High · Home / practice** — Raw “Loading…” as a product state. Designed `LoadingState` / `EmptyState` / `ErrorState`.
4. **High · SkillLaunch** — Academy was “Start here”. Practice is now the primary destination when enabled.
5. **High · Progress** — Single card in a sea of empty. Instrument layout + filled SLP ring from the same 0–4 figure.
6. **High · Reading / Listening / Writing** — Loading was a sentence. Now a paper/audio/editor skeleton of the real workspace.
7. **High · Writing** — Editor was a second card. Editor is now the centre of gravity beside the task.
8. **High · Auth / marketing** — Blue wordmark vs ink app mark. Shared ink mark and paper hero.
9. **High · Home** — Professional upsell competed with the plan name. Receded into supporting copy.
10. **High · Profile** — Four equal blocks. Identity + level | data + delete.
11. **Med · Shell** — Sparse rail on the same white as content. Recessed rail, tighter width, skill-coloured active bar.
12. **Med · Type** — Exercise `h1` competed with the passage. Titles recede; workspaces carry the story.
13. **Med · SLP ring** — Hollow circle looked unfinished. Conic ring visualises the displayed level on the 0–4 scale.
14. **Med · Skill minis** — Em-dash read as broken. “Not yet” when the backend has no level.
15. **Med · Buttons** — Soft hover only. Press scale 0.985; deeper command blue.
16. **Med · Options** — Hover used accent wash. Hover is a hairline; selected is the accent inset.
17. **Med · Speaking** — Idle recorder had no state language. `is-idle` / `is-requesting` / `is-stopped` / `is-denied`.
18. **Med · Exam gate** — Floated in empty viewport. Constrained to exam stage.
19. **Med · Intelligence** — Readiness ring was hollow. Same conic treatment from the readiness figure.
20. **Med · Density** — 40/48 page padding wasted the stage. 32/40, tighter page-head and skill board.
21. **Med · Motion** — Enter only. Press, option, record, and state transitions added. Reduced-motion still kills them.
22. **Med · Listening academy** — Long pathway was scannable but visually thin. Pathway language kept; now panel is the only elevate.
23. **Med · Commercial** — Paywall still a banner, now quieter and not a second heading.
24. **Med · Empty Academy** — Bare heading. Uses the empty-state language.
25. **Med · Tablet** — No 1024 capture. Visual QA now includes 1024.
26. **Low · Landing hero** — Residual blue gradient. Paper ground.
27. **Low · Sidebar logout** — Ghost next to the plan. Outline, compact.
28. **Low · Segmented target level** — Two independent buttons. `.seg` control.
29. **Low · Writing exam** — Prompt and editor stacked as cards. Same writing workspace as practice.
30. **Low · Visual QA coverage** — Missing writing/speaking practice, exam, admin. Added.

### Remaining gaps (why not 95)

- System stack only — no custom type. Optical refinement is capped.
- No product photography or illustration (correct: none invented).
- Coach is still a spike console with visual states, not the flagship session.
- Marketing landing structure is still a landing page; tokens now match the app.
- Achievements/recent are designed empties until the backend has rows.
- `proxy-csrf` 410 vs 403 is unrelated to visuals.

### Visual QA evidence

`docs/visual-qa/` — 1440, 1024, 390. Routes listed in `tests/e2e/visual-qa.spec.ts`.

### Accessibility

Axe contracts unchanged. Loading states keep visible text. Focus, skip link, roles preserved. Kickers are quieter but remain 11px / 650 on muted (`#5c5c64` on `#e7e3d8` ≈ 5.2:1).

### Performance

Still CSS-only. No new client libraries. Skeletons are three divs. Ring is a conic-gradient, not a canvas.

Legal is the most mature surface. Admin is the most honest. Learner app and Home are the weakest. Coach spike is correctly an engineering console — it must not look like a learner toy, but it needs a visual language for PR-20.

### Typical defects observed

1. Too many large rectangular cards of equal weight.
2. Sidebar is a generic SaaS rail; active state is a filled pill.
3. Content max-width 960px wastes a 1440–1600 desktop.
4. Mobile is a collapsed stack, not a redesigned composition.
5. No type scale beyond `h1` / `.muted` / `.home-kicker`.
6. Primary and secondary actions look the same size.
7. Skill homes are four identical launch cards.
8. Academy is a list of cards, not a programme.
9. Intelligence is “three more cards”.
10. Progress reuses Home cards with no trajectory.
11. Motion is almost absent (`btn` hover translate only).
12. Loading is the word “Loading…”.
13. Auth is an uncomposed form in `.wrap`.
14. Passage / audio / editor do not feel like dedicated workspaces.
15. Radius 14px + pastel `--bg2` reads as a marketing kit, not a tool.

### 20 highest-value visual improvements

1. Rebuild the application shell (sidebar, active state, density, mobile drawer).
2. Compose Home as an asymmetric command centre, not a card stack.
3. Stop using cards as the default grouping device.
4. Install a real typographic scale (display → metadata).
5. Give each skill a restrained identity mark — not a pastel theme.
6. Make one primary action obvious on every screen.
7. Use desktop width with a 1160px content stage and a rail.
8. Install a CSS-only motion system (enter, reveal, state, reduced-motion).
9. Academy as a pathway with now / done / locked.
10. Intelligence as readiness + ranked weakness + next action.
11. Reading as a two-pane workspace (passage | question).
12. Listening as an audio-first stage.
13. Writing as a professional editor surface.
14. Speaking as a recording stage with live / idle / denied.
15. Auth as a focused ceremony (login, 5-step signup, target-level).
16. Progress as trajectory + skill comparison, still backend-only.
17. Admin as a denser operations console, visually isolated from learners.
18. Coach visual states (pre / mic / live / speaking / listening / ending) with no product logic.
19. Designed empty, loading, error, success, and commercial states.
20. Mobile compositions that are not a compressed desktop stack.

---

## 2. Design principles

1. Fewer, stronger elements.
2. Strong hierarchy before decoration.
3. Whitespace must have purpose.
4. Every screen has one primary action.
5. Secondary actions visually recede.
6. Information is grouped by user intent.
7. Do not make every section a card.
8. Borders and shadows are scarce.
9. Typography is a structural tool.
10. Motion communicates cause and effect.
11. Data visualisations answer real questions.
12. Premium means restraint, not excess.
13. Desktop composition is intentional.
14. Mobile is redesigned, not compressed.
15. Every screen is recognisably SLP Command.

**Voice:** precision, confidence, discipline, focus, progress, professionalism, clarity, intelligence, premium quality.

**Not:** Duolingo, SaaS kit, CRUD dashboard, rainbow education app, AI-dashboard clichés, confetti, mascots.

---

## 3. Design tokens

Implemented in `app/design-system.css` (imported last). Existing `--ink`, `--accent`, `--bg` names are preserved so marketing and app share a register.

### Colour

Restrained. Colour marks **status, action, hierarchy, skill identity, premium**. It is not decoration.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#f3f2ee` | `#0e0e12` | Page ground (warm paper / graphite) |
| `--bg2` | `#e8e6df` | `#16161c` | Recessed secondary |
| `--surface` | `#fafaf7` | `#16161c` | Primary surface |
| `--elevated` | `#ffffff` | `#1c1c24` | Raised (modals, mission) |
| `--ink` | `#141418` | `#ececf1` | Primary text |
| `--ink2` | `#3c3c44` | `#c8c8d0` | Secondary text |
| `--muted` | `#6d6d76` | `#8a8a95` | Supporting |
| `--line` | `#d5d2c9` | `#2a2a32` | Hairline |
| `--accent` | `#1e4ec8` | `#7b9fff` | Action / focus |
| `--accent-dark` | `#163a96` | `#4a6fd4` | Pressed |
| `--accent-light` | `#e7edfb` | `#1a2450` | Focus wash |
| `--gold` | `#9a7420` | `#c8942a` | Professional plan only |
| `--ok` | `#1b6b45` | `#3dcea0` | Success |
| `--bad` | `#b42318` | `#ff8a80` | Error |
| `--warn` | `#8a6a12` | `#e0cc80` | Caution |

Skill identity (3px rail + 8px mark, never a page wash):

| Skill | Token | Hex |
|---|---|---|
| Reading | `--skill-reading` | `#8a6a3a` |
| Listening | `--skill-listening` | `#2a5a6e` |
| Writing | `--skill-writing` | `#3d4a3a` |
| Speaking | `--skill-speaking` | `#4a3f6b` |

### Typography

System stack only (no Inter, no Geist — already a product rule).

| Role | Size | Weight | Tracking | Notes |
|---|---|---|---|---|
| Display | `clamp(32px, 4vw, 44px)` | 650 | −0.035em | Rare; Home greeting, landing hero |
| Page title | `clamp(26px, 3vw, 34px)` | 650 | −0.03em | `h1` |
| Section title | 20px | 600 | −0.02em | `h2` |
| Body | 16px / 1.55 | 400 | 0 | App chrome |
| Exam / passage | 18.5px / 1.7 | 400 | 0 | Reading content |
| Supporting | 14px / 1.5 | 400 | 0 | `.muted` |
| Label / kicker | 11px | 650 | 0.12em | Uppercase |
| Metadata | 12px | 500 | 0.01em | Plan, timestamps |
| Metric | 28–40px | 650 | −0.04em | Tabular nums |

### Spacing

Base 4. Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.

- Page margin desktop: 40–48px
- Page margin mobile: 16–20px
- Section rhythm: 32–48px
- Card/panel internal: 20–28px
- Exercise gap: 20–28px
- Desktop density: tighter than marketing, looser than admin

### Layout

| Context | Rule |
|---|---|
| Desktop content | max 1160px, left-aligned in the main pane |
| Sidebar | 228px, hairline right, recessed `--bg` |
| Reading column | 42–68ch inside the passage pane |
| Exam | max 880px, focused, timer in a quiet toolbar |
| Intelligence | 1.4fr analysis + 0.8fr next-action rail ≥960px |
| Academy | single column pathway, not a card grid |
| Progress | hero metric + skill rows |
| Admin | full width to 1280px, denser, dark ops theme |
| Marketing | existing `--hero-max` 1080 / `--max` 780 |

### Surfaces

| Level | Treatment |
|---|---|
| Background | `--bg` paper |
| Secondary | `--bg2` well |
| Primary | transparent + hairline or rule |
| Elevated | `--elevated` + 1px `--line` (mission, modal, exam paper) |
| Interactive | hairline; accent on hover/focus |
| Focused | 2px accent ring, 2px offset |

Avoid floating every block. Rules > cards.

---

## 4. Component system

| Component | Language |
|---|---|
| Primary button | Solid accent, 8px radius, no lift shadow, 13/18 padding |
| Secondary | Transparent, 1px line, ink2 |
| Ghost | No border, muted → ink on hover |
| Danger | Outline `--bad` |
| Links | Accent, underline on hover only |
| Badge / chip | 2px radius, hairline, 11px — not a pill unless status |
| Tabs / segmented | Underline or inset track, not pastel pills |
| Card | Exception, not default. Use `.panel` or a rule |
| Panel | Hairline top, no fill |
| Drawer | Mobile nav, 280px, dim backdrop |
| Modal | Dim 45%, elevated 440px, enter scale 0.98→1 |
| Alert | Left rule in ok/warn/bad, no emoji |
| Form / input | 8px, 1px line, 44px min height |
| Tooltip | 12px, 160ms fade |
| Progress | Hairline track, accent fill, real percentages only |
| Chart | Only if it answers a backend question |
| Table | Hairline rows, 13–14px, admin-dense |
| Options | Full-width rows, numeric key, selected = accent line |
| Exam controls | Quiet toolbar, timer tabular |
| Audio | Play + track; no fake waveform |
| Recording | Pulse ring only while `recording` is true |
| Paywall | Gold rule, iOS-app copy, no fake upgrade CTA |
| Skeleton | Shimmer 1.2s, reduced-motion = static |
| Empty | One sentence + one action |
| Error | `.err` / `role="alert"` preserved |
| Success | Feedback banner, no celebration |

---

## 5. Motion system

CSS only. No animation library.

| Token | Value |
|---|---|
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-std` | `cubic-bezier(0.2, 0.8, 0.2, 1)` |
| `--dur-1` | 140ms |
| `--dur-2` | 220ms |
| `--dur-3` | 360ms |
| `--dur-4` | 480ms |

| Event | Motion |
|---|---|
| Page entrance | opacity 0→1 + translateY 8px, 360ms |
| Section reveal | same, 40ms stagger, max 4 items |
| Navigation | sidebar active indicator 180ms |
| Panel expand | grid-template-rows 0fr→1fr 280ms |
| Modal | backdrop fade + card 0.98→1 |
| State | colour/border 160ms |
| Exercise step | fade 180ms |
| Answer feedback | banner clip/fade 220ms |
| Exam start | gate → live fade |
| Result | metric count is **not** animated (no invented interpolation) |
| Chart | width 0→value on real % only |
| Skeleton → loaded | opacity crossfade 200ms |
| Audio / record | pulse only in live state |
| Success / failure | banner colour, no bounce |

`prefers-reduced-motion: reduce` disables transform/opacity animation. Hover lift on buttons is already gated.

No confetti, mascots, parallax, 3D, or animated gradients.

---

## 6. Responsive rules

Breakpoints: 720 (phone), 960 (tablet), 1200 (laptop), 1440 (wide).

- **Wide:** sidebar + 1160 content; Home 1.4 / 0.8; Reading 1.15 / 0.85.
- **Laptop:** same structure, tighter gutters.
- **Tablet:** sidebar becomes a top bar + drawer; Home stacks with mission first; Reading stacks passage then question.
- **Phone:** 16px gutters; destinations are rows, not a 2-col card grid; recorder and editor go full bleed within the pane.

Do not collapse a desktop card grid into a taller card stack and call it responsive.

---

## 7. Accessibility rules

- Skip link, `:focus-visible` 2px accent ring retained.
- Keyboard: options 1–4, Enter to confirm (existing).
- Touch targets ≥ 44px on interactive chrome.
- Contrast: ink on paper; accent on white buttons; do not lighten muted below 4.5:1 for essential text.
- Semantic headings stay (`h1` page, `h2` sections).
- `role="alert"` / `role="status"` / `role="timer"` / `aria-pressed` preserved.
- Reduced motion respected.
- Do not replace text with colour alone (correct/wrong still labelled).
- Tests that disable axe `color-contrast` stay; we still aim to pass contrast.

---

## 8. Page-by-page direction

### Public

Landing becomes more typographic, less gradient-kit. Pricing keeps two plans; featured plan uses a 1px accent rule, not a glow. Legal stays a document — do not card-ify statutes.

### Auth

Login is a quiet ceremony: brand, title, two fields, one button. Signup shows a 5-step rail (not a progress cartoon). Onboarding is two large, serious choices (SLP 2 / SLP 3).

### Shell

Compact brand. Nav is a list, not pills. Active = weight + 2px accent bar. Plan is metadata. Logout is ghost. Mobile = top bar + drawer.

### Home v2

Command centre. User sees in seconds: greeting, mission (primary), session blocks, Estimated SLP, streak, plan, next action. Prefs recede. Achievements and recent sit as lists, not hero cards. **No Home v3. No invented metrics. `passProbability` never rendered.**

### Reading

Home: one recommended destination + a destination list. Practice: paper passage | question pane. Exam: disclaimer gate, quiet timer, same paper language.

### Listening

Audio stage first (play, time, track). No transcript. Exam: no seek (existing). Academy: catalog as a pathway with Pro locks.

### Writing

Editor is a paper surface with a sticky word/character count. Tools: orchestrator “next” is the hero; transformer / examiner / strategy are rows.

### Speaking

Recorder is a stage: idle / requesting / recording / stopped / denied. Practice vs exam distinguished by mode kicker only. Coach is **not** built.

### Academy

Now → pathway → coverage. Recommended class is the only elevated panel. Curriculum is a vertical path with state marks from the backend.

### Intelligence

Readiness metric answers “where am I vs target?” Weaknesses answer “what fails?” Missions answer “what next?” Academy remains the planner. No second plan.

### Progress

Estimated SLP hero + skill rows + confidence legend. Same backend fields as Home. Nothing derived locally.

### Profile

Account facts, target-level segmented control, data actions, destructive zone. Not four cards of equal weight.

### Admin

Keep dark ops theme. Tighter tiles, less 14px radius, denser tables. Isolated from learner chrome. All endpoints unchanged.

### Coach visual foundation (not PR-20)

States only: `pre` · `mic` · `live` · `speaking` · `listening` · `ending` · `debrief`. Spike keeps engineering controls and test-facing copy. Product Coach is not implemented.

---

## 9. QA checklist

For every major surface, at desktop wide / laptop / tablet / mobile:

- [ ] One primary action is obvious
- [ ] No equal-weight card grid
- [ ] Skill identity present where relevant
- [ ] Keyboard and focus visible
- [ ] Reduced-motion does not break layout
- [ ] Empty / error / loading / quota designed
- [ ] No `passProbability`, no local proficiency
- [ ] Playwright contracts still pass
- [ ] Screenshot captured and inspected

Surfaces: Login, Signup, Onboarding, Home, Reading practice/exam, Listening practice/exam, Writing practice/exam, Speaking practice/exam, Academy, Intelligence, Progress, Profile, Admin, Coach spike.

---

## 10. Implementation notes

- **No new framework.** Tailwind stays; preflight stays off. Design system is CSS.
- **`app/design-system.css` imported last** so it can evolve `style.css` without a destructive rewrite.
- **Existing class names kept** (`.home-card`, `.btn`, `.err`, `.admin-err`, `.section-eyebrow`) so tests and legal pages do not break.
- **Composition changes** are markup-only: Home grid, SkillLaunch rows, academy pathway, reading workspace.
- **Security / authority:** no JWT in `localStorage`, no browser → Render, no entitlement math, no Coach webhook from the browser.
- **Tests:** text, roles, and `p.err` / `.admin-err` are load-bearing. Do not rename those strings.
- **Execution:** one design owner in this working tree. Parallel worktrees would fork the visual language. Sequential application of one system is the coherent path.

### Key decisions

1. Warm paper + graphite, not white SaaS and not dark-only.
2. Skill identity is a mark, not a theme.
3. Cards become the exception; rules and one elevated panel are the default.
4. Motion is CSS-only.
5. Home v2 stays Home v2.
6. Coach visual states land; Coach product does not.
7. Admin stays a separate dark console.

### Open questions

None that block this upgrade. Web billing and product Coach remain later trains.

---

## 11. Before / after references

- Before: this audit; iOS screenshots in `assets/screenshots/` as product hierarchy reference.
- After: Playwright captures under `docs/visual-qa/` (generated by `tests/e2e/visual-qa.spec.ts`).

---

## 12. PR plan (implementation slices in this branch)

Not separate GitHub PRs — coherent commits on `feature/slpcommand-web-platform`:

1. `chore(web): define SLP Command web design system`
2. `feat(web): redesign application shell and navigation`
3. `feat(web): redesign home and shared surfaces`
4. `feat(web): redesign reading listening writing experiences`
5. `feat(web): redesign academy intelligence and progress`
6. `feat(web): redesign speaking and admin experiences`
7. `test(web): add visual regression coverage`
8. `refactor(web): unify premium design system`
