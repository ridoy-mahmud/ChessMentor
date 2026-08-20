// Phase 21A — Firestore data layer. All calls go through the browser SDK and
// are scoped to the signed-in user's own document tree, so Firestore rules can
// be as simple as `request.auth.uid == uid`.

import { getFirebase } from "./client";

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string;
  photoURL: string | null;
  bio: string;
  country: string;
  favouriteOpening: string;
  createdAt: number;
  lastSeenAt: number;
  rating: number;
  peakRating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  puzzlesSolved: number;
  lessonsCompleted: number;
  stars: number;
  puzzleBestStreak: number;
  dayStreak: number;
  lastActiveDay: string;
  notifyProduct: boolean;
  notifyStreak: boolean;
  notifyGameSummary: boolean;
};

export type GameRecord = {
  id?: string;
  playedAt: number;
  result: "win" | "loss" | "draw";
  opponent: string;
  colour: "w" | "b";
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  moves: number;
  rated: boolean;
  ratingAfter: number;
  pgn?: string;
};

export type LessonProgressDoc = {
  lessonId: string;
  completed: boolean;
  stars: number;
  updatedAt: number;
};

/** UTC day key used for streak bookkeeping. */
export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / 86_400_000);
}

export function emptyProfile(
  uid: string,
  email: string | null,
  displayName: string,
  photoURL: string | null,
): UserProfile {
  const now = Date.now();
  return {
    uid,
    email,
    displayName,
    photoURL,
    bio: "",
    country: "",
    favouriteOpening: "",
    createdAt: now,
    lastSeenAt: now,
    rating: 800,
    peakRating: 800,
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    puzzlesSolved: 0,
    lessonsCompleted: 0,
    stars: 0,
    puzzleBestStreak: 0,
    dayStreak: 1,
    lastActiveDay: todayKey(),
    notifyProduct: true,
    notifyStreak: true,
    notifyGameSummary: true,
  };
}

/** Creates the user document on first sign-in; refreshes `lastSeenAt` after. */
export async function ensureUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserProfile | null> {
  const fb = await getFirebase();
  if (!fb) return null;
  const { doc, getDoc, setDoc } = await import("firebase/firestore");
  const ref = doc(fb.db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = emptyProfile(
      user.uid,
      user.email,
      user.displayName?.trim() || (user.email?.split("@")[0] ?? "Player"),
      user.photoURL,
    );
    await setDoc(ref, profile);
    return profile;
  }
  const existing = snap.data() as UserProfile;
  const today = todayKey();
  const last = existing.lastActiveDay ?? today;
  const gap = dayDiff(last, today);
  const dayStreak =
    gap === 0 ? (existing.dayStreak ?? 1) : gap === 1 ? (existing.dayStreak ?? 0) + 1 : 1;
  const patch = { lastSeenAt: Date.now(), lastActiveDay: today, dayStreak };
  await setDoc(ref, patch, { merge: true });
  return { ...existing, ...patch, uid: user.uid };
}

export async function subscribeProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
): Promise<() => void> {
  const fb = await getFirebase();
  if (!fb) return () => undefined;
  const { doc, onSnapshot } = await import("firebase/firestore");
  return onSnapshot(
    doc(fb.db, "users", uid),
    (snap) =>
      onChange(snap.exists() ? ({ ...(snap.data() as UserProfile), uid }) : null),
    (err) => {
      console.error("profile subscribe failed", err);
      onChange(null);
    },
  );
}

export async function updateProfile(
  uid: string,
  patch: Partial<UserProfile>,
): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(fb.db, "users", uid), patch, { merge: true });
}

export async function saveLessonProgress(
  uid: string,
  entry: LessonProgressDoc,
): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(
    doc(fb.db, "users", uid, "progress", entry.lessonId),
    entry,
    { merge: true },
  );
}

export async function fetchLessonProgress(
  uid: string,
): Promise<LessonProgressDoc[]> {
  const fb = await getFirebase();
  if (!fb) return [];
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(fb.db, "users", uid, "progress"));
  return snap.docs.map((d) => d.data() as LessonProgressDoc);
}

export async function recordGame(
  uid: string,
  game: GameRecord,
): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { addDoc, collection, doc, getDoc, setDoc } = await import(
    "firebase/firestore"
  );
  await addDoc(collection(fb.db, "users", uid, "games"), game);

  const ref = doc(fb.db, "users", uid);
  const snap = await getDoc(ref);
  const prev = (snap.data() as UserProfile | undefined) ?? null;
  await setDoc(
    ref,
    {
      gamesPlayed: (prev?.gamesPlayed ?? 0) + 1,
      wins: (prev?.wins ?? 0) + (game.result === "win" ? 1 : 0),
      losses: (prev?.losses ?? 0) + (game.result === "loss" ? 1 : 0),
      draws: (prev?.draws ?? 0) + (game.result === "draw" ? 1 : 0),
      rating: game.rated ? game.ratingAfter : (prev?.rating ?? 800),
      peakRating: Math.max(prev?.peakRating ?? 800, game.ratingAfter),
      lastSeenAt: Date.now(),
    },
    { merge: true },
  );
}

export async function fetchRecentGames(
  uid: string,
  max = 20,
): Promise<GameRecord[]> {
  const fb = await getFirebase();
  if (!fb) return [];
  const { collection, getDocs, limit, orderBy, query } = await import(
    "firebase/firestore"
  );
  const snap = await getDocs(
    query(
      collection(fb.db, "users", uid, "games"),
      orderBy("playedAt", "desc"),
      limit(max),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as GameRecord) }));
}


/** Realtime game history stream (most recent first). */
export async function subscribeGames(
  uid: string,
  onChange: (games: GameRecord[]) => void,
  max = 50,
): Promise<() => void> {
  const fb = await getFirebase();
  if (!fb) return () => undefined;
  const { collection, limit, onSnapshot, orderBy, query } = await import(
    "firebase/firestore"
  );
  return onSnapshot(
    query(
      collection(fb.db, "users", uid, "games"),
      orderBy("playedAt", "desc"),
      limit(max),
    ),
    (snap) =>
      onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as GameRecord) }))),
    (err) => {
      console.error("games subscribe failed", err);
      onChange([]);
    },
  );
}

export async function fetchGame(
  uid: string,
  gameId: string,
): Promise<GameRecord | null> {
  const fb = await getFirebase();
  if (!fb) return null;
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(fb.db, "users", uid, "games", gameId));
  return snap.exists() ? { id: snap.id, ...(snap.data() as GameRecord) } : null;
}

/** Deletes the user's games, progress, and profile documents. */
export async function deleteUserData(uid: string): Promise<void> {
  const fb = await getFirebase();
  if (!fb) return;
  const { collection, deleteDoc, doc, getDocs } = await import(
    "firebase/firestore"
  );
  for (const sub of ["games", "progress"]) {
    const snap = await getDocs(collection(fb.db, "users", uid, sub));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  }
  await deleteDoc(doc(fb.db, "users", uid));
}
