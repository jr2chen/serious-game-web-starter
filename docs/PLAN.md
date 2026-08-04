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

Each player gets one hidden role: one **target category** + one **score condition**. Roles score **once at end of game** (1 if met, else 0). Individual — separate from team scores. Roles may duplicate if more than five players.

| Condition | Succeeds when |
| --- | --- |
| `positive` | Final category total `> 0` |
| `non_positive` | Final category total `<= 0` |

Locked roles:

| role_id | Name | Target | Condition |
| --- | --- | --- | --- |
| labour | Labour Representative | jobs | positive |
| housing | Housing Advocate | housing | positive |
| accessibility | Accessibility Advocate | accessibility | positive |
| environment | Environmental Advocate | climate | positive |
| fiscal | Fiscal Watchdog | cost | non_positive |

CSV shape (later):

```csv
role_id,role_name,description,target_category,score_condition
labour,Labour Representative,You want the city to create more jobs.,jobs,positive
```

### Locked V1 summary

- Red promotes Jobs and Housing; Blue promotes Accessibility and Climate
- Cost is a shared constraint
- Categories begin at zero; judges assign −2…+2 each round
- Team scores = sum of that team’s two categories
- No proposal-win / compromise / participation bonuses
- Hidden roles score once at the end
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

## Epic 2 — CSV content (current)

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

Create/join with short codes; live roster; private roles; Firebase + anonymous auth.

---

## Epic 4 — Team proposal drafting

Private Red/Blue draft: one shared text box, five suggested category steppers (−2…+2), Submit. Prefill from starter proposal CSV. Last write wins. Opposing draft hidden until reveal.

---

## Epic 5 — Reveal, present, judge

Show both proposals; facilitator timing; facilitator enters final −2…+2 per category (optional judges advise; facilitator finalizes).

---

## Epic 6 — Scoring and next round

Show running category totals and team scores (derived). Clear proposals between rounds. At end game: reveal roles and score hidden-role conditions once.

---

## Epic 7 — Workshop polish

Three sample scenarios, empty/loading/error states, mobile polish, full README (run, deploy, CSV, Firebase, facilitator controls).

---

## Suggested tiny build order

1. Epic 1 — team pick + role + five categories (done)
2. **Epic 2** — CSV scenarios / roles / starter proposals (this slice)
3. Epic 3a — create/join + roster
4. Epic 3b — role privacy across devices
5. Epic 4 — editable private team proposals
6. Epic 5 — reveal + facilitator apply deltas
7. Epic 6 — derived scores + next/end
8. Epic 7 — polish

---

## Out of scope

Fixed A/B voting as the main loop · chat · accounts · elimination · AI content · Docs-style editing · complex judge math · custom editors · general game platform
