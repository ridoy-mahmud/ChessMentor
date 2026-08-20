// Route guard for account-gated features. Instead of a silent redirect it
// renders an on-brand sign-up prompt explaining what an account unlocks.

import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/firebase/AuthProvider";

export function AuthGate({
  children,
  feature = "this feature",
  perks = [
    "Your rating, streak and weakness profile saved across devices",
    "Full game history with one-click analysis",
    "Lesson and puzzle progress that never resets",
  ],
}: {
  children: ReactNode;
  feature?: string;
  perks?: string[];
}) {
  const { loading, configured, user } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="h-40 animate-pulse rounded-2xl border bg-card" />
      </div>
    );
  }

  if (user) return <>{children}</>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="relative overflow-hidden rounded-2xl border bg-card p-7 shadow-e2 sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-2xl"
        />
        <div className="label-caps inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-muted-foreground">
          <Lock className="h-3 w-3 text-primary" /> Account needed
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold sm:text-4xl">
          Create a free account to unlock {feature}.
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          {configured
            ? "It takes about ten seconds, and everything you've played so far stays right where it is."
            : "Accounts aren't configured for this app yet, so this area is unavailable."}
        </p>

        <ul className="mt-6 space-y-2.5 text-sm">
          {perks.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>

        {configured && (
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="group inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground shadow-e2 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Create free account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="inline-flex h-12 items-center gap-2 rounded-lg border bg-background px-6 text-sm font-medium transition-colors hover:bg-secondary"
            >
              I already have one
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
