# Firebase setup (Epic 3 — wiring only)

This project will use **Firebase Authentication (Anonymous)** and **Cloud Firestore** for live rooms.  
This document covers **project setup and env vars only**. The app does not create rooms in Firestore yet.

For scoring rules and epics, see `[PLAN.md](PLAN.md)`.

Tick items off as you finish them (`[ ]` → `[x]`).

Here's the link to me going through each step by video, if that helps! 

  
[https://drive.google.com/drive/folders/1UMwYcJKXENDZ0RFwIKE4AoKnMS3vTNB5?usp=drive_link](https://drive.google.com/drive/folders/1UMwYcJKXENDZ0RFwIKE4AoKnMS3vTNB5?usp=drive_link)

---

## What you need

- [x] A Google account
- [x] Node.js + `npm` available for this repo
- [x] Willingness to create a Firebase project (free Spark plan is enough to start)

---

## 1. Create a Firebase project

- [x] Open [Firebase Console](https://console.firebase.google.com/)
- [x] **Add project** (or pick an existing one)
- [x] Optionally turn Google Analytics off for a workshop prototype
- [x] Wait until the project is ready

---



## 2. Register a web app

- [x] In the project overview, click the **Web** icon (`</>`)
- [x] Nickname it something like `commons-web`
- [x] Leave Firebase Hosting unchecked for local Next.js
- [x] Register the app
- [x] Copy the `firebaseConfig` values (they map to `.env.local` below)

---



## 3. Enable Anonymous Authentication

- [x] Left menu → **Build** → **Authentication**
- [x] Get started if prompted
- [x] **Sign-in method** → **Anonymous** → Enable → Save

We will sign players in anonymously in a later slice (no email/password UI).

---



## 4. Create a Cloud Firestore database

- [x] Left menu → **Build** → **Firestore Database**
- [x] **Create database**
- [x] Choose mode: **test mode** only for local experiments, or **production mode** if you will add rules before any public deploy
- [x] Pick a region close to your workshop audience
- [x] Enable the database

**Important:** Before putting this on the public internet, replace open test rules with locked-down rules (room owner vs player writes). That comes with the real room implementation — do not ship with “allow all” rules.

---



## 5. Add env vars locally

- [x] Copy the example file:

```bash
cp .env.local.example .env.local
```

- [x] Paste your web config into `.env.local`:


| Env var                                    | Firebase config field | Done |
| ------------------------------------------ | --------------------- | ---- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | `apiKey`              | [ ]  |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | `authDomain`          | [ ]  |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | `projectId`           | [ ]  |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | `storageBucket`       | [ ]  |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId`   | [ ]  |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | `appId`               | [ ]  |


- [ ] Restart the Next.js dev server after changing env vars:

```bash
npm run dev
```

`NEXT_PUBLIC_` means these values are available in the browser. That is normal for the Firebase **web** SDK. Protect data with **Firestore Security Rules** and Anonymous Auth — not by hiding the API key.

---



## 6. Confirm the SDK is wired

Client helpers live in `[lib/firebase/client.ts](../lib/firebase/client.ts)`:

- [x] Confirmed `.env.local` has all six values (no `your-…` placeholders left)
- [ ] Know that `isFirebaseConfigured()` is true when env vars are set
- [ ] Know that `getFirebaseAuth()` / `getFirebaseDb()` exist for the next slice (UI does not call them yet)

If env vars are missing, those getters throw a clear error pointing back to this doc.

---



## Vercel (later)

- [ ] Project → **Settings** → **Environment Variables**
- [ ] Add the same six `NEXT_PUBLIC_FIREBASE_*` keys
- [ ] Redeploy

Still no service-account JSON is required for this client-only architecture.

---



## Later Epic 3 slices (not this doc’s job yet)

- [ ] Creating or joining real Firestore rooms
- [ ] Anonymous `signInAnonymously` from the UI
- [ ] Security rules file deployed from the repo
- [ ] Replacing the demo open-rooms list