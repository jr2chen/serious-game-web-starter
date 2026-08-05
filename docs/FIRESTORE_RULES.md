# Firestore security rules (production)

Your database is in **production mode**, so reads/writes stay denied until you publish rules.

Canonical rules file: [`firestore.rules`](../firestore.rules)  
Project setup: [`FIREBASE.md`](FIREBASE.md)

Tick items off as you go (`[ ]` → `[x]`).

---

## What these rules do

| Path | Who can access |
| --- | --- |
| `rooms/{code}` | Any signed-in user (read/write) — lobby metadata |
| `rooms/{code}/players/{uid}` | Everyone signed-in can **read**; only that uid can **write** |
| `rooms/{code}/secrets/{uid}` | **Only that uid** can read/write (hidden role) |
| `rooms/{code}/proposals/{team}` | Only players whose roster `team` matches (`red` / `blue`) |
| Everything else | Denied |

Anonymous Auth counts as signed in.

**Important:** Republish rules after this Epic 4 change — the `proposals` path is new. Without it, Submit revision will fail.

---

## Publish checklist

- [ ] Firebase Console → **Firestore Database** → **Rules**
- [ ] Paste the rules below (or copy from [`firestore.rules`](../firestore.rules))
- [ ] **Publish**
- [ ] Refresh the app, create/join a room, confirm the live roster updates
- [ ] Confirm another device sees your name/team but **not** your hidden role card text from their own role UI only
- [ ] On stage, edit + **Submit revision** — a teammate’s phone should update the shared draft automatically
- [ ] Confirm the other team cannot read your proposal doc (opposing draft stays private until Epic 5)

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

    function isTeammateProposal(roomId, teamId) {
      return signedIn()
        && (teamId == 'red' || teamId == 'blue')
        && myTeamInRoom(roomId) == teamId;
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
      allow read, write: if isSelf(playerId);
    }

    match /rooms/{roomId}/proposals/{teamId} {
      allow read, write: if isTeammateProposal(roomId, teamId);
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

rooms/{CODE}/players/{uid}          // public roster
  displayName, emoji, team, joinedAt

rooms/{CODE}/secrets/{uid}          // private role
  role_id, role_name, description, target_category, comparison, threshold

rooms/{CODE}/proposals/{red|blue}   // shared team draft (last Submit wins)
  team, scenario_id, proposal_text,
  jobs, housing, accessibility, climate, cost,   // each −4…+4 (revision range)
  updatedAt, updatedByUid, updatedByName
```
