// Phase 21A — Firebase web config can come from either browser or server envs.
// The API key is publishable by design; access is controlled by Auth +
// Firestore rules and Authorized Domains.

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId?: string;
  appId?: string;
};

const fallbackFirebaseConfig: FirebaseWebConfig = {
  apiKey: "AIzaSyCuNeIzKqw4rHX61S7YgVL7prDNt5P-qVk",
  authDomain: "clockify-5e97f.firebaseapp.com",
  projectId: "clockify-5e97f",
  storageBucket: "clockify-5e97f.firebasestorage.app",
  messagingSenderId: "42352364028",
  appId: "1:42352364028:web:09b1573f31647b4eb30a79",
};

function readEnv(name: string): string | undefined {
  const processEnv = typeof process !== "undefined" ? process.env : undefined;
  const browserEnv =
    typeof import.meta !== "undefined"
      ? (import.meta.env as Record<string, string | undefined>)
      : undefined;

  return (
    processEnv?.[name] ??
    processEnv?.[`VITE_${name}`] ??
    browserEnv?.[name] ??
    browserEnv?.[`VITE_${name}`] ??
    processEnv?.[`NEXT_PUBLIC_${name}`]
  );
}

export async function getFirebaseConfig(): Promise<FirebaseWebConfig | null> {
  const apiKey = readEnv("FIREBASE_API_KEY") ?? readEnv("GOOGLE_API_KEY");
  const projectId = readEnv("FIREBASE_PROJECT_ID") ?? fallbackFirebaseConfig.projectId;
  if (!apiKey) return fallbackFirebaseConfig;
  return {
    apiKey,
    authDomain: readEnv("FIREBASE_AUTH_DOMAIN") ?? fallbackFirebaseConfig.authDomain,
    projectId,
    storageBucket: readEnv("FIREBASE_STORAGE_BUCKET") ?? fallbackFirebaseConfig.storageBucket,
    messagingSenderId:
      readEnv("FIREBASE_MESSAGING_SENDER_ID") ?? fallbackFirebaseConfig.messagingSenderId,
    appId: readEnv("FIREBASE_APP_ID") ?? fallbackFirebaseConfig.appId,
  };
}
