// Phase 21A — auth context: session state, email/password + Google sign-in,
// verification, password reset, and Firestore profile hydration.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { friendlyAuthError, getFirebase } from "./client";
import {
  deleteUserData,
  ensureUserProfile,
  subscribeProfile,
  updateProfile as writeProfile,
  type UserProfile,
} from "./db";

export type SessionUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};

type AuthState = {
  /** `true` until the first auth resolution completes. */
  loading: boolean;
  /** `false` when the project has no Firebase credentials configured. */
  configured: boolean;
  user: SessionUser | null;
  profile: UserProfile | null;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  /** Updates display name on both the auth record and the profile doc. */
  updateDisplayName: (name: string) => Promise<void>;
  /** Stores a resized data-URL avatar on the profile doc. */
  updateAvatar: (dataUrl: string) => Promise<void>;
  /** Re-authenticates with the current password, then sets a new one. */
  changePassword: (current: string, next: string) => Promise<void>;
  /** Re-authenticates (when a password is given) and deletes all user data. */
  deleteAccount: (currentPassword?: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const unsubProfile = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubAuth: (() => void) | undefined;

    (async () => {
      const fb = await getFirebase();
      if (cancelled) return;
      if (!fb) {
        setConfigured(false);
        setLoading(false);
        return;
      }
      const { onAuthStateChange } = await import("firebase/auth").then((m) => ({
        onAuthStateChange: m.onAuthStateChanged,
      }));
      unsubAuth = onAuthStateChange(fb.auth, async (fbUser) => {
        unsubProfile.current?.();
        unsubProfile.current = null;

        if (!fbUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        const session: SessionUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          photoURL: fbUser.photoURL,
          emailVerified: fbUser.emailVerified,
        };
        setUser(session);
        setLoading(false);
        try {
          const initial = await ensureUserProfile(session);
          setProfile(initial);
          unsubProfile.current = await subscribeProfile(
            fbUser.uid,
            (p) => p && setProfile(p),
          );
        } catch (err) {
          console.error("profile hydrate failed", err);
        }
      });
    })();

    return () => {
      cancelled = true;
      unsubAuth?.();
      unsubProfile.current?.();
    };
  }, []);

  const requireFb = useCallback(async () => {
    const fb = await getFirebase();
    if (!fb) throw new Error("Accounts aren't configured for this app yet.");
    return fb;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const fb = await requireFb();
      const m = await import("firebase/auth");
      try {
        const cred = await m.createUserWithEmailAndPassword(
          fb.auth,
          email.trim(),
          password,
        );
        const name = displayName.trim();
        if (name) await m.updateProfile(cred.user, { displayName: name });
        await ensureUserProfile({
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: name || cred.user.email,
          photoURL: cred.user.photoURL,
        });
        // The auth listener may have created the doc first from the (still
        // empty) Firebase displayName — force the chosen name in afterwards.
        if (name) await writeProfile(cred.user.uid, { displayName: name });
        await m.sendEmailVerification(cred.user).catch(() => undefined);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    [requireFb],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const fb = await requireFb();
      const m = await import("firebase/auth");
      try {
        await m.signInWithEmailAndPassword(fb.auth, email.trim(), password);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    [requireFb],
  );

  const signInWithGoogle = useCallback(async () => {
    const fb = await requireFb();
    const m = await import("firebase/auth");
    try {
      const provider = new m.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await m.signInWithPopup(fb.auth, provider);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, [requireFb]);

  const sendReset = useCallback(
    async (email: string) => {
      const fb = await requireFb();
      const m = await import("firebase/auth");
      try {
        await m.sendPasswordResetEmail(fb.auth, email.trim());
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    [requireFb],
  );

  const resendVerification = useCallback(async () => {
    const fb = await requireFb();
    const m = await import("firebase/auth");
    if (!fb.auth.currentUser) return;
    try {
      await m.sendEmailVerification(fb.auth.currentUser);
    } catch (err) {
      throw new Error(friendlyAuthError(err));
    }
  }, [requireFb]);

  const signOut = useCallback(async () => {
    const fb = await getFirebase();
    if (!fb) return;
    const m = await import("firebase/auth");
    await m.signOut(fb.auth);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!user) return;
      setProfile((p) => (p ? { ...p, ...patch } : p));
      await writeProfile(user.uid, patch);
    },
    [user],
  );

  const reauth = useCallback(
    async (password: string) => {
      const fb = await requireFb();
      const m = await import("firebase/auth");
      const current = fb.auth.currentUser;
      if (!current?.email) throw new Error("You need to sign in again first.");
      const cred = m.EmailAuthProvider.credential(current.email, password);
      await m.reauthenticateWithCredential(current, cred);
      return { fb, m, current };
    },
    [requireFb],
  );

  const updateDisplayName = useCallback(
    async (name: string) => {
      const fb = await requireFb();
      const m = await import("firebase/auth");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Display name can't be empty.");
      if (fb.auth.currentUser) {
        await m.updateProfile(fb.auth.currentUser, { displayName: trimmed });
      }
      setUser((u) => (u ? { ...u, displayName: trimmed } : u));
      await updateProfile({ displayName: trimmed });
    },
    [requireFb, updateProfile],
  );

  const updateAvatar = useCallback(
    async (dataUrl: string) => {
      await updateProfile({ photoURL: dataUrl });
    },
    [updateProfile],
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      try {
        const { m, current: fbUser } = await reauth(current);
        await m.updatePassword(fbUser, next);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    [reauth],
  );

  const deleteAccount = useCallback(
    async (currentPassword?: string) => {
      const fb = await requireFb();
      const m = await import("firebase/auth");
      const fbUser = fb.auth.currentUser;
      if (!fbUser) throw new Error("You need to sign in again first.");
      try {
        if (currentPassword) await reauth(currentPassword);
        await deleteUserData(fbUser.uid);
        await m.deleteUser(fbUser);
      } catch (err) {
        throw new Error(friendlyAuthError(err));
      }
    },
    [requireFb, reauth],
  );

  const value = useMemo<AuthState>(
    () => ({
      loading,
      configured,
      user,
      profile,
      signUp,
      signIn,
      signInWithGoogle,
      sendReset,
      resendVerification,
      signOut,
      updateProfile,
      updateDisplayName,
      updateAvatar,
      changePassword,
      deleteAccount,
    }),
    [
      loading,
      configured,
      user,
      profile,
      signUp,
      signIn,
      signInWithGoogle,
      sendReset,
      resendVerification,
      signOut,
      updateProfile,
      updateDisplayName,
      updateAvatar,
      changePassword,
      deleteAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
