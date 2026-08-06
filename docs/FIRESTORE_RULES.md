# Firestore security rules (production)

Your database is in **production mode**, so reads/writes stay denied until you publish rules.

Canonical rules file: [`firestore.rules`](../firestore.rules)  
Project setup: [`FIREBASE.md`](FIREBASE.md)

Tick items off as you go (`[ ]` → `[x]`).

---

## What these rules do

| Path | Who can access |
| --- | --- |
| `rooms/{code}` | Any signed-in user (read/write) — lobby metadata, shared timer, phase |
| `rooms/{code}/players/{uid}` | Everyone signed-in can **read**; only that uid can **write** |
| `rooms/{code}/secrets/{uid}` | That uid, or a `judge` seated in the room, can **read**; only that uid can **write** |
| `rooms/{code}/proposals/{team}` | That team's players and judges can always **read**; once `rooms/{code}.phase == "vote"`, anyone signed in can **read** both; only that team's players can **write** |
| `rooms/{code}/votes/{uid}` | Any signed-in user can **read**; only seated `red`/`blue` players can **write** their own vote |
| Everything else | Denied |

Anonymous Auth counts as signed in.

**Important:** Republish rules after this change — it adds the `votes` path and widens `proposals` reads to everyone once a judge starts the vote phase.

---

## Publish checklist

- [ ] Firebase Console → **Firestore Database** → **Rules**
- [ ] Paste the rules below (or copy from [`firestore.rules`](../firestore.rules))
- [ ] **Publish**
- [ ] Refresh the app, create/join a room, confirm the live roster updates
- [ ] Confirm another device sees your name/team but **not** your hidden role card text from their own role UI only
- [ ] On stage, edit + **Submit revision** — a teammate’s phone should update the shared draft automatically
- [ ] Confirm a red/blue player still cannot read the other team's proposal doc before voting starts
- [ ] Join as a `judge` seat — confirm you can read both teams' proposals and every player's hidden role, and can add time to the shared timer
- [ ] As a judge, tap **Move room to voting** — confirm a red/blue device now sees both proposals and can cast a public vote; confirm the judge device cannot cast a vote

---

## Rules to paste

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() {
      return request.auth != null;
    }

    function isSelf(playerId) {
      return signedIn() && request.auth.uid == playerId;
    }

    function myTeamInRoom(roomId) {
      return get(/databases/$(database)/documents/rooms/$(roomId)/players/$(request.auth.uid)).data.team;
    }

    function isJudgeInRoom(roomId) {
      return signedIn() && myTeamInRoom(roomId) == 'judge';
    }

    function isTeammateProposal(roomId, teamId) {
      return signedIn()
        && (teamId == 'red' || teamId == 'blue')
        && myTeamInRoom(roomId) == teamId;
    }

    function roomPhaseIsVote(roomId) {
      return get(/databases/$(database)/documents/rooms/$(roomId)).data.phase == 'vote';
    }

    function isVotingEligible(roomId) {
      return myTeamInRoom(roomId) == 'red' || myTeamInRoom(roomId) == 'blue';
    }

    match /rooms/{roomId} {
      allow read, write: if signedIn();
    }

    match /rooms/{roomId}/players/{playerId} {
      allow read: if signedIn();
      allow create, update: if isSelf(playerId);
      allow delete: if isSelf(playerId);
    }

    match /rooms/{roomId}/secrets/{playerId} {
      allow read: if isSelf(playerId) || isJudgeInRoom(roomId);
      allow write: if isSelf(playerId);
    }

    match /rooms/{roomId}/proposals/{teamId} {
      allow read: if isTeammateProposal(roomId, teamId)
        || isJudgeInRoom(roomId)
        || (signedIn() && roomPhaseIsVote(roomId));
      allow write: if isTeammateProposal(roomId, teamId);
    }

    match /rooms/{roomId}/votes/{playerId} {
      allow read: if signedIn();
      allow create, update: if isSelf(playerId) && isVotingEligible(roomId);
      allow delete: if isSelf(playerId);
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## If roster, join, or proposal submit fails

- [ ] Rules were **Published** (not draft)
- [ ] Anonymous Auth is enabled
- [ ] If Firestore asks for an index on `players.joinedAt`, follow the console link once
- [ ] For proposal errors: confirm you are seated in that room with a matching team before Submit

---

## Data shape

```text
rooms/{CODE}
  code, themeId, themeName, createdAt, createdBy, playerCount
  timerEndsAtMs   // shared discussion countdown target (epoch ms); set on stage entry, judges can extend it
  phase           // "discuss" (default) | "vote" — a judge flips this to reveal both proposals

rooms/{CODE}/players/{uid}          // public roster
  displayName, emoji, team, joinedAt   // team is "red" | "blue" | "judge"

rooms/{CODE}/secrets/{uid}          // private role — absent for judge seats
  role_id, role_name, description, target_category, comparison, threshold

rooms/{CODE}/proposals/{red|blue}   // shared team draft (last Submit wins)
  team, scenario_id, proposal_text,
  jobs, housing, accessibility, climate, cost,   // each −4…+4 (revision range)
  updatedAt, updatedByUid, updatedByName

rooms/{CODE}/votes/{uid}            // one public vote per red/blue player (last write wins)
  choice,          // "red" | "blue" — which proposal this player wants adopted
  displayName, emoji, updatedAt
```
