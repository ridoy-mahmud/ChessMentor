// Phase 21A — browser-only Firebase bootstrap. Everything here is lazily
// imported so the SDK never enters the SSR bundle.

import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import { getFirebaseConfig } from "./config.functions";

export type FirebaseBundle = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

let cached: Promise<FirebaseBundle | null> | null = null;

/**
 * Returns the initialised Firebase services, or `null` when the project has no
 * Firebase credentials configured (so the UI can show a setup-needed state
 * instead of crashing).
 */
export function getFirebase(): Promise<FirebaseBundle | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (cached) return cached;
  cached = (async () => {
    const config = await getFirebaseConfig();
    if (!config) return null;

    const [{ getApps, initializeApp }, authMod, firestoreMod] =
      await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/firestore"),
      ]);

    const app = getApps()[0] ?? initializeApp(config);
    const auth = authMod.getAuth(app);
    await authMod
      .setPersistence(auth, authMod.browserLocalPersistence)
      .catch(() => undefined);
    const db = firestoreMod.getFirestore(app);
    return { app, auth, db };
  })().catch((err) => {
    console.error("Firebase init failed", err);
    cached = null;
    return null;
  });
  return cached;
}

/** Maps Firebase error codes to plain, human sentences. */
export function friendlyAuthError(err: unknown): string {
  const code =
    typeof err === "object" && err && "code" in err
      ? String((err as { code: unknown }).code)
      : "";
  switch (code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/missing-password":
      return "Please enter your password.";
    case "auth/weak-password":
      return "Passwords need at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account already exists with that email. Try signing in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in window was closed before finishing.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow popups and retry.";
    case "auth/unauthorized-domain":
      return "This domain isn't authorised in the Firebase console yet. Add it under Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled in the Firebase console yet.";
    case "auth/network-request-failed":
      return "Network problem — check your connection and try again.";
    default:
      return err instanceof Error && err.message
        ? err.message
        : "Something went wrong. Please try again.";
  }
}
