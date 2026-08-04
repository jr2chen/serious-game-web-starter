# Commons — Epic 3b (Create / join rooms)

A tiny multiplayer workshop game starter. This repo is meant to be **readable by non-technical people**: small increments, plain-language docs, and CSV-driven game content you can edit without touching React.

**Working agreement:** keep increments extremely small and code changes minimal. After each change, keep this README in sync with the current epic, and end with a suggested commit message (see [`.cursor/skills/step-readme-and-commit/SKILL.md`](.cursor/skills/step-readme-and-commit/SKILL.md)).

Living product plan: [`docs/PLAN.md`](docs/PLAN.md).  
Firebase project setup: [`docs/FIREBASE.md`](docs/FIREBASE.md).  
Firestore rules (production): [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md).

---

## How we got here


**Epic 0** — join/create → name + emoji → stage shell  
**Epic 1** — pick Red/Blue team; show hidden role + five city categories  
**Epic 2** — load Round 1 scenario, roles, and starter proposals from CSV   
**Epic 3a** — Firebase SDK + env template + setup docs  
**Epic 3b (current)** — real Firestore rooms: create with theme, list last hour, join

---

## User flow (this slice)

```
Main (rooms from last hour)
  ├─ Join room ──► Name + emoji + team ──► Stage
  └─ Create room ──► Pick theme ──► Name + emoji + team ──► Stage
```

- Room list comes from Firestore (created in the **last hour** only) — no demo rooms
- Create: pick **Municipal Commons** (only theme for now) → get a short code
- Enter: name, mark, team → CSV scenario + starter proposal as before

---

## Firebase setup (required for rooms)

1. Follow [`docs/FIREBASE.md`](docs/FIREBASE.md) (checklist) — project, **Anonymous Auth**, **Firestore**
2. Copy env template and paste web keys:

```bash
cp .env.local.example .env.local
```

3. Restart `npm run dev`

Without `.env.local`, the main screen shows a configuration error instead of rooms.

If Firestore is in **production mode**, publish rules from [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md) or create/join will be denied.

Room helpers: [`lib/firebase/rooms.ts`](lib/firebase/rooms.ts), [`lib/firebase/auth.ts`](lib/firebase/auth.ts).

---

## How to edit the CSVs

All workshop content lives in [`content/`](content/). You can open these in Excel, Google Sheets, or any text editor. **You do not need to change React code** to rewrite scenarios, roles, or starter proposals.

After you save a file:

1. Keep `npm run dev` running (or restart it if the server was stopped)
2. Refresh the browser
3. Join or create a room again so content reloads

If something is wrong (missing column, bad number, unknown category), the join screen shows a clear error message.

### Tips that avoid breakage

- Keep the **header row** exactly as-is (column names matter)
- If text contains commas, wrap it in double quotes: `"Like this, with a comma"`
- Do not delete required columns
- `scenario_id` values must match between `scenarios.csv` and `starter_proposals.csv`

---

### `content/scenarios.csv`

One row = one round.

| Column | Meaning | Example |
| --- | --- | --- |
| `scenario_id` | Stable id (used by starter proposals) | `downtown_redevelopment` |
| `title` | Short title on the stage | `Downtown Redevelopment` |
| `problem` | The situation players discuss | long paragraph |
| `team_task` | What each team must propose | long paragraph |
| `discussion_seconds` | Suggested discussion length | `240` (= 4 minutes) |
| `round_order` | Play order (`1`, then `2`, …) | `1` |

Right now the app **always loads round_order 1** on stage. Round 2 is already in the file for later.

---

### `content/roles.csv`

One row = one hidden role. A player is randomly assigned one role when they enter.

| Column | Meaning | Allowed values |
| --- | --- | --- |
| `role_id` | Stable id | e.g. `fiscal` |
| `role_name` | Shown on the private role card | e.g. `Fiscal Watchdog` |
| `description` | What the player is pushing for | free text |
| `target_category` | Which city total is checked | `jobs` `housing` `accessibility` `climate` `cost` |
| `comparison` | How that total is compared | `>` `>=` `<` `<=` `=` |
| `threshold` | Number to compare against | any number, often `0` or `2` |

**Scoring rule:** at end of game the player scores **1 point** if  
`final[target_category] comparison threshold` is true, else **0**.

Examples:

| Goal | comparison | threshold |
| --- | --- | --- |
| Jobs end above zero | `>` | `0` |
| Cost stays at 0 or below | `<=` | `0` |
| Cost stays under +2 | `<` | `2` |

Default Fiscal Watchdog uses `cost` + `<` + `2` so the role is still achievable when projects cost money.

---

### `content/starter_proposals.csv`

One row = one team’s starting draft for a scenario (Red or Blue).

| Column | Meaning | Notes |
| --- | --- | --- |
| `scenario_id` | Must match a row in `scenarios.csv` | |
| `team` | `red` or `blue` | |
| `proposal_text` | Starting proposal wording | quote if it has commas |
| `jobs` `housing` `accessibility` `climate` `cost` | Suggested effects | whole numbers from **-2 to +2** |

These show as **read-only** on the stage in Epic 2. Players will edit/submit them in a later epic.

---

## What’s in the code

| Path | Role |
| --- | --- |
| [`docs/PLAN.md`](docs/PLAN.md) | Epics + locked V1 scoring |
| [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md) | Production Firestore rules checklist |
| [`firestore.rules`](firestore.rules) | Rules source of truth |
| [`firebase.json`](firebase.json) | Points CLI deploys at `firestore.rules` |
| [`.env.local.example`](.env.local.example) | Env var shape for the web SDK |
| [`lib/firebase/client.ts`](lib/firebase/client.ts) | Firebase app / Auth / Firestore getters |
| [`lib/firebase/auth.ts`](lib/firebase/auth.ts) | Anonymous sign-in helper |
| [`lib/firebase/rooms.ts`](lib/firebase/rooms.ts) | Create room, list last hour, join count |
| [`lib/game/themes.ts`](lib/game/themes.ts) | Workshop themes (Municipal only for now) |
| [`lib/content/`](lib/content/) | CSV parse + load |
| [`lib/game/`](lib/game/) | Types, constants, scoring helpers |
| [`lib/api/client.ts`](lib/api/client.ts) | Browser client for content APIs |
| [`components/CommonsApp.tsx`](components/CommonsApp.tsx) | Screens |

---

## Run it

```bash
npm install
cp .env.local.example .env.local   # then paste Firebase web keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Rooms require a configured `.env.local` plus Anonymous Auth and Firestore enabled.

---

## Explicitly not in this slice

- Live player roster UI  
- Locked-down production Firestore rules in-repo  
- Multiple themes  
- Editing / submitting proposals  
- Advancing to Round 2 in the UI  
- Accounts or saved games  

---

## Suggested next increment

**Epic 3c:** live roster in the room (who joined) while keeping hidden roles private.
