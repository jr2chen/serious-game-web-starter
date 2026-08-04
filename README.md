# Commons — Step 1

A tiny multiplayer workshop game starter. This repo is meant to be **readable by non-technical people**: small increments, plain-language docs, and a mock data layer you can later swap for a real backend.

**Working agreement:** keep increments extremely small and code changes minimal. After each change, keep this README in sync with the current step, and end with a suggested commit message (see [`.cursor/skills/step-readme-and-commit/SKILL.md`](.cursor/skills/step-readme-and-commit/SKILL.md)).

---

## How we got here

We started from a full one-day MVP backlog (rooms, voting, consequences, facilitator + player roles). That was too much for a first cut.

We stripped it down:

1. **One role only** — everyone is a player. No facilitator path yet.
2. **Three screens only** — main → name + emoji → game stage.
3. **Mock data** — no Firebase, no live multiplayer yet.
4. **One scenario** — enough to show the stage; create-room can grow later.

Before coding, we locked the UX in a static HTML prototype, then ported that look and flow into the Next.js app.

| Artifact | What it is |
| --- | --- |
| [`examples/step1-claude-commons-prototype.html`](examples/step1-claude-commons-prototype.html) | Visual / UX guide for this step (open in a browser) |
| This app (`npm run dev`) | Same flow, built in Next.js with a mock API |

---

## User flow (this step)

```
Main screen
  ├─ Join room (mock list) ──► Name + emoji ──► Game stage (1 scenario)
  └─ Create room ────────────► Name + emoji ──► Game stage (1 scenario)
```

1. **Main** — title “Commons”, open rooms list, Create room button  
2. **Entry** — pick a display name and emoji mark  
3. **Stage** — land immediately in the game; see one mock scenario  

That’s the whole product surface for Step 1.

---

## What’s in the code

| Path | Role |
| --- | --- |
| [`lib/mock/data.ts`](lib/mock/data.ts) | Hard-coded rooms, one scenario, emoji options |
| [`lib/mock/api.ts`](lib/mock/api.ts) | Mock API: `listRooms`, `getScenario`, `createRoom` |
| [`components/CommonsApp.tsx`](components/CommonsApp.tsx) | The three screens |
| [`app/page.tsx`](app/page.tsx) | Renders the app |
| [`app/globals.css`](app/globals.css) | Styles matched to the prototype |
| [`.cursor/skills/step-readme-and-commit/SKILL.md`](.cursor/skills/step-readme-and-commit/SKILL.md) | Agent habit: tiny increments, update README, suggest a commit |

Screens talk to the mock API, not to Firebase. Later you can replace `lib/mock/api.ts` without rewriting the UI.

---

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To review the original visual guide without running the app, open `examples/step1-claude-commons-prototype.html` in a browser.

---

## Explicitly not in this step

- Facilitator vs player split  
- Submitting decisions or voting  
- Resources / consequences  
- Real-time sync or Firebase  
- Multiple scenarios in create-room  
- Accounts or saved games  

---

## Suggested next increment

Keep it small. A natural follow-on:

- Let players **submit one short decision** on the stage screen  
- Still mock-backed (in-memory or mock API only)  
- Still no voting or resources  

Document that as Step 2 when you build it.
