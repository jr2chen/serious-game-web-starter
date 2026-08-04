# Commons — Epic 2

A tiny multiplayer workshop game starter. This repo is meant to be **readable by non-technical people**: small increments, plain-language docs, and CSV-driven game content you can edit without touching React.

**Working agreement:** keep increments extremely small and code changes minimal. After each change, keep this README in sync with the current epic, and end with a suggested commit message (see [`.cursor/skills/step-readme-and-commit/SKILL.md`](.cursor/skills/step-readme-and-commit/SKILL.md)).

Living product plan (epics + locked V1 scoring): [`docs/PLAN.md`](docs/PLAN.md).

---

## How we got here

**Epic 0** — join/create → name + emoji → stage shell  
**Epic 1** — pick Red/Blue team; show hidden role + five city categories  
**Epic 2 (current)** — load Round 1 scenario, roles, and starter proposals from CSV

Still no Firebase, no editable proposals, no advancing to Round 2 in the UI.

---

## User flow (this epic)

```
Main → Join/Create → Name + emoji + team → Stage
```

On stage:

- Team badge + private hidden role (from `roles.csv`)
- Five categories at 0
- **Round 1** from `scenarios.csv` (Downtown Redevelopment)
- Your team’s **starter proposal** (read-only) from `starter_proposals.csv`

Round 2 (Expanding Transportation Access) is already in the CSV files for later.

---

## Edit the game in CSV

| File | What it controls |
| --- | --- |
| [`content/scenarios.csv`](content/scenarios.csv) | Round order, title, problem, team task, discussion seconds |
| [`content/roles.csv`](content/roles.csv) | Hidden roles and scoring conditions |
| [`content/starter_proposals.csv`](content/starter_proposals.csv) | Red/Blue starter text + suggested −2…+2 deltas |

Change a cell, refresh, join again — the stage should show the new copy.

---

## What’s in the code

| Path | Role |
| --- | --- |
| [`docs/PLAN.md`](docs/PLAN.md) | Epics + locked V1 scoring |
| [`lib/content/parseCsv.ts`](lib/content/parseCsv.ts) | Small CSV parser |
| [`lib/content/load.ts`](lib/content/load.ts) | Load + validate content files |
| [`lib/game/types.ts`](lib/game/types.ts) | Shared game types |
| [`lib/game/constants.ts`](lib/game/constants.ts) | Teams, categories, demo room list |
| [`lib/api/client.ts`](lib/api/client.ts) | Browser client for content APIs |
| [`app/api/content/*/route.ts`](app/api/content/scenario/route.ts) | Content API endpoints |
| [`components/CommonsApp.tsx`](components/CommonsApp.tsx) | Screens |
| [`docs/screenshots/epic1/`](docs/screenshots/epic1/) | Epic 1 screenshots |

---

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Explicitly not in this epic

- Editing / submitting proposals (Epic 4)  
- Advancing to Round 2 in the UI  
- Real multiplayer / Firebase  
- Facilitator judging  
- Accounts or saved games  

---

## Suggested next increment

**Epic 3 (tiny slice):** real create/join room codes with a live roster — CSV content loading stays as-is.
