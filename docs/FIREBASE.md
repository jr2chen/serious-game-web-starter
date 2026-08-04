# Firebase setup (Epic 3 — wiring only)

This project will use **Firebase Authentication (Anonymous)** and **Cloud Firestore** for live rooms.  
This document covers **project setup and env vars**. Room create/join is implemented in the app; keep security rules locked down before public deploy.

For scoring rules and epics, see [`PLAN.md`](PLAN.md).

Tick items off as you finish them (`[ ]` → `[x]`).

---

## What you need

- [ ] A Google account
- [ ] Node.js + `npm` available for this repo
- [ ] Willingness to create a Firebase project (free Spark plan is enough to start)

---

## 1. Create a Firebase project

- [ ] Open [Firebase Console](https://console.firebase.google.com/)
- [ ] **Add project** (or pick an existing one)
- [ ] Optionally turn Google Analytics off for a workshop prototype
- [ ] Wait until the project is ready

---

## 2. Register a web app

- [ ] In the project overview, click the **Web** icon (`</>`)
- [ ] Nickname it something like `commons-web`
- [ ] Leave Firebase Hosting unchecked for local Next.js
- [ ] Register the app
- [ ] Copy the `firebaseConfig` values (they map to `.env.local` below)

---

## 3. Enable Anonymous Authentication

- [ ] Left menu → **Build** → **Authentication**
- [ ] Get started if prompted
- [ ] **Sign-in method** → **Anonymous** → Enable → Save

The app calls `signInAnonymously` when listing or creating rooms.

---

## 4. Create a Cloud Firestore database

- [ ] Left menu → **Build** → **Firestore Database**
- [ ] **Create database**
- [ ] Choose mode: **test mode** only for local experiments, or **production mode** if you will add rules before any public deploy
- [ ] Pick a region close to your workshop audience
- [ ] Enable the database

**Important:** You are likely in **production mode**. Publish the rules in [`docs/FIRESTORE_RULES.md`](FIRESTORE_RULES.md) (or [`firestore.rules`](../firestore.rules)) before create/join will work.

---

## 5. Add env vars locally

- [ ] Copy the example file:

```bash
cp .env.local.example .env.local
```

- [ ] Paste your web config into `.env.local`:

| Env var | Firebase config field | Done |
| --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` | [ ] |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` | [ ] |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` | [ ] |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `storageBucket` | [ ] |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` | [ ] |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` | [ ] |

- [ ] Restart the Next.js dev server after changing env vars:

```bash
npm run dev
```

`NEXT_PUBLIC_` means these values are available in the browser. That is normal for the Firebase **web** SDK. Protect data with **Firestore Security Rules** and Anonymous Auth — not by hiding the API key.

---

## 6. Confirm rooms work

Client helpers:

- [`lib/firebase/client.ts`](../lib/firebase/client.ts) — app / auth / db
- [`lib/firebase/auth.ts`](../lib/firebase/auth.ts) — anonymous sign-in
- [`lib/firebase/rooms.ts`](../lib/firebase/rooms.ts) — create / list last hour / join count

- [ ] Confirmed `.env.local` has all six values (no `your-…` placeholders left)
- [ ] Main screen loads without a Firebase config error
- [ ] **Create room** with Municipal Commons produces a short code
- [ ] The new room appears under **Open rooms · last hour**
- [ ] Another browser/device can join that room

If Firestore asks you to create an index for the rooms query, follow the console link once.

---

## Vercel (later)

- [ ] Project → **Settings** → **Environment Variables**
- [ ] Add the same six `NEXT_PUBLIC_FIREBASE_*` keys
- [ ] Redeploy

Still no service-account JSON is required for this client-only architecture.

---

## Later Epic 3 slices

- [x] Creating rooms in Firestore (short codes + theme)
- [x] Listing rooms from the last hour
- [x] Joining a listed room (name / team / mark)
- [x] Anonymous `signInAnonymously` when creating or listing rooms
- [ ] Publish production Firestore rules ([`FIRESTORE_RULES.md`](FIRESTORE_RULES.md))
- [ ] Live player roster UI
- [ ] Security rules file kept in sync as player/role subcollections appear
- [ ] More than one workshop theme
