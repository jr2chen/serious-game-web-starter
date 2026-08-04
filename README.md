# Commons — Epic 1

A tiny multiplayer workshop game starter. This repo is meant to be **readable by non-technical people**: small increments, plain-language docs, and a mock data layer you can later swap for a real backend.

**Working agreement:** keep increments extremely small and code changes minimal. After each change, keep this README in sync with the current epic, and end with a suggested commit message (see [`.cursor/skills/step-readme-and-commit/SKILL.md`](.cursor/skills/step-readme-and-commit/SKILL.md)).

Living product plan (epics + locked V1 scoring): [`docs/PLAN.md`](docs/PLAN.md).

---

## How we got here

**Epic 0** shipped a single-player mock flow: main → name + emoji → one scenario on stage (see [`examples/step1-claude-commons-prototype.html`](examples/step1-claude-commons-prototype.html)).

**Epic 1 (current)** adds the Avalon-like identity layer, still mock-only:

1. On join, pick a **visible team** (Red or Blue) as well as name + mark (team sits above the emoji grid)
2. Stage shows **team badge**, **private hidden role**, and **five city categories** at 0
3. Scoring rules are locked in [`docs/PLAN.md`](docs/PLAN.md) (team scores from categories; roles score at end of game later)

Still no Firebase, proposals, or judging UI.

---

## User flow (this epic)

```
Main screen
  ├─ Join room (mock list) ──► Name + emoji + team ──► Stage
  └─ Create room ────────────► Name + emoji + team ──► Stage
```

On stage you see:

- Your team (Red → Jobs & Housing, Blue → Accessibility & Climate)
- Your private hidden role (mock-assigned from the five locked roles)
- Five categories: Jobs, Housing, Accessibility, Climate, Cost (all 0)
- The same one mock scenario as Epic 0

---

## What’s in the code

| Path | Role |
| --- | --- |
| [`docs/PLAN.md`](docs/PLAN.md) | Epics + locked V1 scoring rules |
| [`lib/mock/data.ts`](lib/mock/data.ts) | Rooms, scenario, teams, categories, roles |
| [`lib/mock/api.ts`](lib/mock/api.ts) | Mock API including `assignHiddenRole` |
| [`components/CommonsApp.tsx`](components/CommonsApp.tsx) | Main / entry / stage screens |
| [`app/globals.css`](app/globals.css) | Prototype styles + team/role/category UI |
| [`examples/step1-claude-commons-prototype.html`](examples/step1-claude-commons-prototype.html) | Epic 0 visual guide |

---

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Explicitly not in this epic

- Real multiplayer / Firebase  
- CSV loading  
- Team proposal drafting  
- Facilitator judging (−2…+2)  
- End-of-game hidden-role scoring UI  
- Accounts or saved games  

---

## Suggested next increment

**Epic 2:** load scenarios and roles from CSV so editors can change content without touching React components. Still no Firebase.
