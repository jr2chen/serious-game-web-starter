# Firestore security rules (production)

Your database is in **production mode**, so reads/writes stay denied until you publish rules.

Canonical rules file: [`firestore.rules`](../firestore.rules)  
Project setup: [`FIREBASE.md`](FIREBASE.md)

Tick items off as you go (`[ ]` → `[x]`).

---

## What these rules do

Keep it simple for now:

- Signed-in users (including Anonymous Auth) can **read and write** `rooms/...`
- Everything else is **denied**

That is enough for create / list / join in Epic 3b.  
When we add private roles and team proposals, we will tighten paths — do not put secrets on the public room document.

---

## Publish checklist

- [ ] Firebase Console → **Firestore Database** → **Rules**
- [ ] Paste the rules below (or copy from [`firestore.rules`](../firestore.rules))
- [ ] **Publish**
- [ ] Refresh the app and try **Create room** + join

---

## Rules to paste

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if request.auth != null;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## If create/join still fails

- [ ] Anonymous Auth is enabled
- [ ] Rules were **Published**
- [ ] `.env.local` points at this same Firebase project

---

## Later (not now)

- [ ] Player subcollections
- [ ] Private hidden-role docs (only that player can read)
- [ ] Team-only proposal drafts
- [ ] Facilitator-only fields
