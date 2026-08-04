import { type User, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

/** Ensure an anonymous Firebase user exists for this browser. */
export async function ensureAnonymousUser(): Promise<User> {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and see docs/FIREBASE.md.",
    );
  }

  const auth = getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;

  const existing = await new Promise<User | null>((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
  if (existing) return existing;

  const result = await signInAnonymously(auth);
  return result.user;
}
