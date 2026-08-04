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
| Everything else | Denied |

Anonymous Auth counts as signed in.

**Important:** Republish rules after this Epic 3c change — player/secret paths were not covered before.

---

## Publish checklist

- [ ] Firebase Console → **Firestore Database** → **Rules**
- [ ] Paste the rules below (or copy from [`firestore.rules`](../firestore.rules))
- [ ] **Publish**
- [ ] Refresh the app, create/join a room, confirm the live roster updates
- [ ] Confirm another device sees your name/team but **not** your hidden role card text from their own role UI only

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

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## If roster or join fails

- [ ] Rules were **Published** (not draft)
- [ ] Anonymous Auth is enabled
- [ ] If Firestore asks for an index on `players.joinedAt`, follow the console link once

---

## Data shape

```text
rooms/{CODE}
  code, themeId, themeName, createdAt, createdBy, playerCount

rooms/{CODE}/players/{uid}          // public roster
  displayName, emoji, team, joinedAt

rooms/{CODE}/secrets/{uid}          // private role
  role_id, role_name, description, target_category, comparison, threshold
```
