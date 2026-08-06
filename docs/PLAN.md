# Commons — Avalon-like Plan

Living plan for the municipal serious game. Update this file as epics ship.

**North star:** Team proposals + human judgment (not fixed Option A/B voting).

```text
Create/Join → Pick team + get hidden role → Scenario
→ Team private proposal (text + suggested category changes)
→ Reveal proposals → Present/defend
→ Facilitator / judges set final category changes (−2…+2)
→ Totals update → Next round / End (then score hidden roles)
```

Software handles rooms, privacy, shared drafting, timers, and score display. Humans judge plausibility and final deltas.

---

## Locked V1 scoring rules

### Visible teams

| Team | Public goal categories | Team score |
| --- | --- | --- |
| **Red** | Jobs + Housing | `Jobs total + Housing total` |
| **Blue** | Accessibility + Climate | `Accessibility total + Climate total` |

Neither team gets points for having its proposal selected. Only judged category changes matter.

### Tracked categories (exactly five)

All start at **0**. After each round the facilitator enters a change in `{-2, -1, 0, +1, +2}`. Totals accumulate across rounds.

| Category | Meaning |
| --- | --- |
| **Jobs** | Local employment, apprenticeships, economic activity |
| **Housing** | Housing supply, affordability, displacement |
| **Accessibility** | Access for disabled people, older residents, underserved communities |
| **Climate** | Emissions, green space, environmental impact, climate resilience |
| **Cost** | Cost to the city. **Positive = costs more; negative = saves money; 0 = no significant change.** Shared constraint — belongs to neither team. |

### Proposal resolution

Each team submits written proposal + suggested changes for all five categories. Judges may adopt Red’s, Blue’s, or a compromise. **Selecting a proposal awards no points.** Facilitator enters the final category deltas; totals update automatically.

### Hidden roles

Each player gets one hidden role: one **target category**, a **comparison**, and a **threshold**. Roles score **once at end of game** (1 if met, else 0). Individual — separate from team scores. Roles may duplicate if more than five players.

| comparison | Succeeds when |
| --- | --- |
| `>` | Final total is greater than threshold |
| `>=` | Final total is at least threshold |
| `<` | Final total is less than threshold |
| `<=` | Final total is at most threshold |
| `=` | Final total equals threshold |

Editors set any number as the threshold (commonly `0` or `2`).

Locked starter roles:

| role_id | Name | Target | comparison | threshold |
| --- | --- | --- | --- | --- |
| labour | Labour Representative | jobs | `>` | 0 |
| housing | Housing Advocate | housing | `>` | 0 |
| accessibility | Accessibility Advocate | accessibility | `>` | 0 |
| environment | Environmental Advocate | climate | `>` | 0 |
| fiscal | Fiscal Watchdog | cost | `<` | 2 |

Cost usually rises when the city acts, so Fiscal Watchdog keeps the session Cost **below +2** by default — change the threshold in CSV anytime.

CSV shape:

```csv
role_id,role_name,description,target_category,comparison,threshold
labour,Labour Representative,You want the city to create more jobs.,jobs,>,0
fiscal,Fiscal Watchdog,You want the city to keep Cost under +2 across the session.,cost,<,2
```

### Locked V1 summary

- Red promotes Jobs and Housing; Blue promotes Accessibility and Climate
- Cost is a shared constraint
- Categories begin at zero; judges assign −2…+2 each round
- Team scores = sum of that team’s two categories
- No proposal-win / compromise / participation bonuses
- Hidden roles score once at the end
- Fiscal Watchdog defaults to Cost `< 2` (editable in CSV via comparison + threshold)
- Proposal outcomes stay human-judged

---

## Product principles

- Extremely small increments; minimal code changes
- CSV (or mock standing in for CSV) for content — not copy inside UI components
- No chat, accounts, elimination, or auto-consequence engine
- Facilitator can always override timing and final deltas
- Update [`README.md`](../README.md) after each shipped slice

---

## Epic 0 — Step 1 (done)

Join/create → name + emoji → stage with one mock scenario.

---

## Epic 1 — Teams, roles, categories on stage (done)

**Goal:** Avalon feel visible without multiplayer.

**Stories:**
- As a player, on join I pick a **name** and **visible team** (Red or Blue)
- As a player, I see my team badge and public goal on the stage
- As a player, I see my **private hidden role** (mock-assigned)
- As a player, I see five **public categories** starting at 0
- As a workshop host, I can read the locked scoring rules in this plan

**Keep simple:** Mock data only. No Firebase. No proposals yet.

**Done when:** Entry requires team; stage shows team, role card, and category strip.

---

## Epic 2 — CSV content (done)

**Goal:** Workshop content lives in editable CSV files, not React components.

**Stories:**
- As an editor, I can change Round 1 / Round 2 scenarios in `content/scenarios.csv`
- As an editor, I can change hidden roles in `content/roles.csv`
- As an editor, I can change Red/Blue starter proposals in `content/starter_proposals.csv`
- As a player, the stage loads **Round 1** from CSV (title, problem, team task, discussion time)
- As a player, I see my team’s **starter proposal** (read-only) with suggested −2…+2 deltas
- As a developer, missing required CSV fields return a clear error

**Keep simple:** No editable proposal UI yet (Epic 4). Round 2 is in CSV but not advanced to in-app. No Firebase.

**Sample content locked for V1:**
- Round 1: Downtown Redevelopment (`downtown_redevelopment`)
- Round 2: Expanding Transportation Access (`transportation_access`)

**Done when:** Editing CSV changes what the stage shows; starter proposals load per team.

---

## Epic 3 — Real rooms

### Slice A — Firebase wiring (done)

**Goal:** Project can connect to Firebase; docs explain setup. No gameplay DB usage yet.

**Stories:**
- As a developer, I can copy `.env.local.example` and fill Firebase web keys
- As a workshop host, I can follow [`docs/FIREBASE.md`](FIREBASE.md) to enable Anonymous Auth and Firestore
- As a developer, I have `getFirebaseAuth` / `getFirebaseDb` helpers ready for the next slice

**Done when:** `firebase` is installed, env template is committed, setup docs exist, and the app still runs without calling Firestore from the UI.

### Slice B — Create / join rooms (done)

**Goal:** Real rooms in Firestore; no demo room list.

**Stories:**
- As a host, I can create a room and pick a theme (only Municipal Commons for now)
- As a player, I see open rooms created in the **last hour**
- As a player, I can join a listed room with name, mark, and team
- As anyone, create/join signs me in anonymously when needed

**Keep simple:** Short 4-character codes.

**Done when:** Demo rooms are gone; create + list + join work against Firestore.

### Slice C — Live roster + role privacy (done)

**Goal:** Everyone in the room sees who joined; hidden roles stay private.

**Stories:**
- As a player, after I enter I appear on a live **Players in room** list
- As anyone in the room, I see others’ name, mark, and visible team
- As a player, my hidden role is stored so only I can read it (`secrets/{uid}`)
- As a player, re-joining the same browser seat updates my roster row without double-counting

**Done when:** Two devices in one room see each other on the roster; each only sees their own role card.

### Slice D — Rejoin after refresh (done)

**Goal:** Refreshing the tab does not trap you out of a room you still belong to.

**Stories:**
- As a player, if I refresh while still seated, Main shows a **Rejoin** button for that room
- As a player, Rejoin restores my name, mark, team, and private role without re-picking
- As a player, **Leave room** clears the rejoin offer for this tab

**Keep simple:** `sessionStorage` + existing player/secret docs; no auto-jump onto stage.

**Done when:** Refresh → Main with Rejoin → Stage with the same seat.

---

## Epic 4 — Team proposal drafting (done)

**Goal:** Each team shares one editable draft; Submit overwrites for everyone on that team.

**Stories:**
- As a player, I see my team’s proposal prefilled from CSV (text + five deltas)
- As a player, I can edit the text and nudge each category up to **±4**, then **Submit revision**
- As a teammate, my screen updates automatically when someone Submits (last write wins)
- As a player, I am reminded to prefer **one reviser at a time**
- As the opposing team, I cannot read the other draft yet (reveal is Epic 5)

**Keep simple:** No live typing sync (only on Submit). No locking. No reveal UI.

**Done when:** Two devices on the same team see Submit overwrite text + deltas; other team’s proposal stays private.

---

## Epic 5 — Reveal, present, judge

### Slice A — Judge seat (done)

**Goal:** A third, neutral seat that can see everything and run the clock; still no scoring UI.

**Stories:**
- As a player, at entry I can pick **Judge** instead of Red or Blue
- As a judge, I have no hidden role and no team proposal of my own
- As a judge, I can read **both** teams’ live proposal drafts, read-only
- As a judge, I can read every seated player’s hidden role
- As a judge, I can **add a minute** to the shared discussion timer
- As any player, the discussion timer is now the **same clock** on every device in the room (not a private per-tab mock)

**Keep simple:** Any number of judges per room (including zero). Judges can't edit proposals or write secrets. No facilitator-applies-final-deltas UI yet — that's a later Epic 5 slice.

**Done when:** A judge device sees both drafts + every role update live, and tapping +1m visibly extends the countdown on a second, non-judge device.

### Slice B — Public vote screen (done)

**Goal:** The judge reveals both proposals to the whole room and everyone casts a public vote on which one the city should adopt.

**Stories:**
- As a judge, I have a **Move room to voting →** button that moves everyone to a shared vote screen
- As anyone in the room, once voting starts I can see both teams’ proposals (previously private) and the city’s totals **if that proposal were adopted**
- As anyone, each proposal starts **compressed** (team name + vote count + revised totals) and expands on tap to the full text and category deltas
- As a Red or Blue player, I can cast (or change) a **public** vote for either proposal; my name and mark show up attached to the one I picked, tinted by **my own team's color** so others can tell at a glance who's voting what
- As a judge, I don’t vote — I only watch the tally
- As a judge, I can nudge either team's suggested numbers (±4) and **Save revision**; the team's own wording is untouched and their screen updates live, same as a teammate's Submit — this still works after voting has started

**Keep simple:** No vote deadline/lock, no automatic winner, no applying the winning proposal's deltas yet (that's Slice C). Room state is a single `phase: "discuss" | "vote"` field — one-way for now (no "back to discussion" button).

**Done when:** A judge taps the button and a second device (mid-discussion) flips straight to the vote screen with both proposals visible; casting a vote on one device shows up live on another; a judge's Save revision updates that team's numbers live without touching their text.

### Slice C — Apply winner & next round (done)

**Goal:** After the public vote, a judge applies the winning proposal to the city's running totals and opens the next CSV scenario (or finishes the session).

**Stories:**
- As a judge on the vote screen, I have **Apply winner & next round →**
- As anyone, that applies the **majority** proposal's suggested numbers to shared `categoryTotals` on the room
- As anyone, if another scenario exists in CSV, everyone returns to **discuss** with that scenario, fresh starter proposals, cleared votes, and a restarted timer
- As anyone, if that was the last scenario, the room moves to **complete** with final city totals
- As a judge, a **tie** (or zero votes) blocks advance until the tally is clear

**Keep simple:** No manual facilitator delta entry separate from the winning proposal; no role reveal / end-game scoring yet.

**Done when:** After Round 1 voting, a judge tap updates city chips on a second device and flips everyone to Round 2's scenario + blank-slate starters.

---

## Epic 6 — Scoring and end game (next)

Show derived team scores. At end game: reveal roles and score hidden-role conditions once.

---

## Epic 7 — Workshop polish

Three sample scenarios, empty/loading/error states, mobile polish, full README (run, deploy, CSV, Firebase, facilitator controls).

---

## Suggested tiny build order

1. Epic 1 — team pick + role + five categories (done)
2. Epic 2 — CSV scenarios / roles / starter proposals (done)
3. **Epic 3a** — Firebase env + client wiring (done)
4. Epic 3b — create/join + last-hour room list (done)
5. Epic 3c — live roster + private role secrets (done)
6. Epic 3d — rejoin button after refresh (done)
7. Epic 4 — editable private team proposals (done)
8. Epic 5a — judge seat: both proposals, all roles, shared timer (done)
9. Epic 5b — judge-triggered public vote screen, with judge number revisions + colored voter chips (done)
10. Epic 5c — apply vote winner to city totals + advance scenario (done)
11. **Epic 6** — derived team scores + end-game role reveal (next)
12. Epic 7 — polish

---

## Out of scope

Fixed A/B voting as the main loop · chat · accounts · elimination · AI content · Docs-style editing · complex judge math · custom editors · general game platform
