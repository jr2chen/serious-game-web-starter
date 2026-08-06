# Commons — Dual player-scoring styles (CSV flip)

A tiny multiplayer workshop game starter. This repo is meant to be **readable by non-technical people**: small increments, plain-language docs, and CSV-driven game content you can edit without touching React.

**Working agreement:** keep increments extremely small and code changes minimal. After each change, keep this README in sync with the current epic, and end with a suggested commit message (see [`.cursor/skills/step-readme-and-commit/SKILL.md`](.cursor/skills/step-readme-and-commit/SKILL.md)).

Living product plan: [`docs/PLAN.md`](docs/PLAN.md).  
Firebase project setup: [`docs/FIREBASE.md`](docs/FIREBASE.md).  
Firestore rules (production): [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md).

---

## How we got here

**Epic 0–5** — rooms, proposals, judge, vote, adopt & next round, session complete  
**Epic 6a** — role reveal + scoreboards  
**This slice** — spreadsheet-driven **player scoring styles**: keep category-based player totals, or flip to policy-win + role points  
**Next** — Epic 7 polish

---

## User flow (this slice)

Same join/create/rejoin flow, plus a third seat on the entry screen: **Red**, **Blue**, or **Judge**.

**Red / Blue** — unchanged from Epic 4:
- Your team’s proposal starts from the CSV starter (text + five suggested changes)
- Anyone on the team can edit the text and nudge each number up to **±4**, then tap **Submit revision**
- Teammates’ screens update automatically when someone Submits (last write wins — prefer one reviser at a time)
- The other team still cannot see your draft

**Judge** — a neutral, non-scoring seat:
- No hidden role, no proposal of your own
- See **both** teams’ live drafts on stage
- Edit either team’s proposal **text and numbers** (±4), then **Save revision** — teammates see it live
- See every seated player’s hidden role (loads on demand as the roster fills in)
- Tap **+1m** next to the timer to add a minute — every device in the room sees the same countdown, not just your own
- Tap **Move room to voting →** to move the whole room to the public vote screen
- On the vote screen, keep editing either proposal; when ready, **Adopt Red** or **Adopt Blue** (public tally is advisory) — that proposal’s numbers update the city, votes clear, and everyone lands on the next scenario (or **session complete** after the last round)

**Session complete** — after the last round is applied:
- A **team scoreboard** on top — **0–2 points**: +1 for each of that team’s two goal categories that ends above 0 (no role bonuses)
- A **player scoreboard** below, ranked by each player’s **total** (`base + role`), with the role reveal under each row
- **Base** comes from [`content/scoring.csv`](content/scoring.csv): `categories` (that capped team score) or `policy` (points if their team’s proposal was last adopted). **Role** points come from each role’s `points` column in [`content/roles.csv`](content/roles.csv) when the condition is met

The discussion timer itself moved from a private per-tab mock to a single Firestore-backed clock (`rooms/{code}.timerEndsAtMs`) so a judge's "add time" is meaningful to the whole room. City totals and the current scenario live on the same room doc (`categoryTotals`, `scenarioId`).

**Voting screen** — once a judge starts it, everyone (Red, Blue, and Judge) sees the same shared screen instead of the discussion/proposal view:
- Both proposals appear, each **compressed** by default — team name, a one-line vote count, a one-line excerpt of the text, and a compact row of what the city's totals would be **if that proposal were adopted**
- Tap a proposal to expand it: full text plus the individual category deltas
- Red and Blue players cast a **public** vote for either proposal — their name and mark appear on the card they picked, tinted **rust for Red voters and blue for Blue voters** so anyone can see at a glance who’s voting what, and can be changed any time
- Judges watch the tally but don’t vote themselves — expanding a proposal still lets a judge revise its suggested numbers even after voting has started
- After votes are in, the judge applies the winner and advances (ties and zero votes are blocked)

---

## Firebase setup (required)

1. Follow [`docs/FIREBASE.md`](docs/FIREBASE.md)
2. **Republish rules** from [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md) — this slice opens `secrets/{uid}` reads to everyone when `phase == "complete"` so the role reveal works on player devices
3. `cp .env.local.example .env.local` and paste web keys, then `npm run dev`

Without `.env.local`, the main screen shows a configuration error instead of rooms.

If Firestore is in **production mode**, publish rules from [`docs/FIRESTORE_RULES.md`](docs/FIRESTORE_RULES.md) or create/join/Submit will be denied.

Room helpers: [`lib/firebase/rooms.ts`](lib/firebase/rooms.ts), [`lib/firebase/players.ts`](lib/firebase/players.ts), [`lib/firebase/proposals.ts`](lib/firebase/proposals.ts), [`lib/firebase/auth.ts`](lib/firebase/auth.ts).  
Session hint: [`lib/game/session.ts`](lib/game/session.ts) (tab `sessionStorage` for the active room code).

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

Rooms start on **round_order 1**. After a judge applies a vote winner, the room advances to the next `round_order` row (Round 2 is already in the file).

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
| `points` | Bonus if the condition is met | whole number ≥ 0 (default sample uses `1`) |

**Role bonus:** at end of game the player scores **`points`** if  
`final[target_category] comparison threshold` is true, else **0**.

Examples:

| Goal | comparison | threshold |
| --- | --- | --- |
| Jobs end above zero | `>` | `0` |
| Cost stays at 0 or below | `<=` | `0` |
| Cost stays under +2 | `<` | `2` |

Default Fiscal Watchdog uses `cost` + `<` + `2` so the role is still achievable when projects cost money.

---

### `content/scoring.csv`

One row = how **player** totals are built on the final scoreboard (team totals always stay category-only).

| Column | Meaning | Allowed values |
| --- | --- | --- |
| `player_base` | What counts as the player’s base before role points | `categories` or `policy` |
| `policy_win_points` | Points for being on the last-adopted team when `player_base` is `policy` | whole number ≥ 0 |

**Styles:**
- `categories` (default sample) — player total = capped team points (0–2) + role points  
- `policy` — player total = `policy_win_points` if their team was last adopted, else `0`, then + role points  

**Team points (always, on the team scoreboard and as `categories` base):** for that team’s two goal categories, score **+1 per category that ends above 0** — so 0, 1, or 2 max. Raw city totals are not summed.

To flip styles: edit `player_base` in this file, save, refresh, and start a new stage load (rejoin / re-enter).

---

### `content/starter_proposals.csv`

One row = one team’s starting draft for a scenario (Red or Blue).

| Column | Meaning | Notes |
| --- | --- | --- |
| `scenario_id` | Must match a row in `scenarios.csv` | |
| `team` | `red` or `blue` | |
| `proposal_text` | Starting proposal wording | quote if it has commas |
| `jobs` `housing` `accessibility` `climate` `cost` | Suggested effects | whole numbers from **-2 to +2** |

These **prefill** the team’s shared draft when a room first needs one. Players edit and Submit on stage; each Submit overwrites the live draft for that team.

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
| [`lib/firebase/rooms.ts`](lib/firebase/rooms.ts) | Create room, list last hour, get room, join count, shared timer (start / extend / watch) |
| [`lib/firebase/players.ts`](lib/firebase/players.ts) | Join as player (red/blue/judge), load my seat, live roster, private role, judge role lookup |
| [`lib/game/session.ts`](lib/game/session.ts) | Remember active room code in the browser tab |
| [`lib/game/themes.ts`](lib/game/themes.ts) | Workshop themes (Municipal only for now) |
| [`lib/firebase/proposals.ts`](lib/firebase/proposals.ts) | Ensure / submit / live-watch team draft |
| [`lib/firebase/votes.ts`](lib/firebase/votes.ts) | Cast / live-watch public votes for which proposal to adopt |
| [`lib/firebase/rounds.ts`](lib/firebase/rounds.ts) | Apply vote winner to city totals + advance (or complete) the round |
| [`lib/content/`](lib/content/) | CSV parse + load |
| [`lib/game/`](lib/game/) | Types, constants, scoring helpers |
| [`lib/api/client.ts`](lib/api/client.ts) | Browser client for content APIs |
| [`components/CommonsApp.tsx`](components/CommonsApp.tsx) | Screens (Tailwind utilities in JSX) |
| [`app/globals.css`](app/globals.css) | Color tokens + a few shared recipes (`.btn`, `.card`, `.chip`) |
| [`app/layout.tsx`](app/layout.tsx) | Fonts + page shell |
| [`next.config.ts`](next.config.ts) | Turbopack filesystem cache off in dev (avoids stale CSS) |

### Styling

- Prefer **Tailwind utility classes in the JSX** for layout and one-off visuals.
- Reuse the small recipes in [`app/globals.css`](app/globals.css) (`.btn`, `.card`, `.chip`, `.label-mono`) when a widget appears in several places.
- Change the palette in the `:root` block of `globals.css` — those tokens feed Tailwind (`bg-forest`, `text-ink-soft`, etc.).
- Avoid adding large new custom CSS files; keep styles next to the markup so renames can’t silently drop styling.

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

- A single combined “grand total” beyond the `team + bonus` display  
- Manual facilitator delta entry separate from the vote winner  
- A deadline/lock on voting  
- Going back from voting to discussion without advancing  
- Live keystroke sync (only **Submit** pushes to teammates)  
- Proposal locking / turn-taking enforcement  
- A cap on judges per room, and judges can't cast a vote themselves  
- Multiple themes  
- Accounts or saved games across browsers  

---

## Suggested next increment

**Epic 7:** empty/loading/error polish, mobile pass, and a fuller facilitator README.
