import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

/** True when all NEXT_PUBLIC_FIREBASE_* values are present. */
export function isFirebaseConfigured(): boolean {
  return readConfig() !== null;
}

function getFirebaseApp(): FirebaseApp {
  const config = readConfig();
  if (!config) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and fill in your web app keys. See docs/FIREBASE.md.",
    );
  }
  return getApps().length ? getApp() : initializeApp(config);
}

/** Browser Firebase Auth instance. */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Browser Firestore instance. */
export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
