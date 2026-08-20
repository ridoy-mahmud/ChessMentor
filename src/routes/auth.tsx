// Phase 21A — sign in / create account / reset password. Single route with
// three modes so the header CTA always lands somewhere useful.

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, Check, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { useAuth } from "@/lib/firebase/AuthProvider";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup", "reset"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — ChessMentor" },
      {
        name: "description",
        content:
          "Sign in to ChessMentor to sync your rating, lesson progress, and game history across every device.",
      },
      { property: "og:title", content: "Sign in — ChessMentor" },
      {
        property: "og:description",
        content: "Create a free account to save your chess progress.",
      },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email address.");
const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Passwords must be under 72 characters.");
const nameSchema = z
  .string()
  .trim()
  .min(2, "Display name needs at least 2 characters.")
  .max(40, "Display name must be under 40 characters.");

function strength(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[score] ?? "Weak" };
}

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (auth.user) navigate({ to: redirect ?? "/profile", replace: true });
  }, [auth.user, navigate, redirect]);

  const pw = strength(password);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.issues[0]?.message ?? "Invalid email.");
      return;
    }

    if (mode === "reset") {
      setBusy(true);
      try {
        await auth.sendReset(emailResult.data);
        setNotice("Password reset link sent — check your inbox.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not send email.");
      } finally {
        setBusy(false);
      }
      return;
    }

    const pwResult = passwordSchema.safeParse(password);
    if (!pwResult.success) {
      setError(pwResult.error.issues[0]?.message ?? "Invalid password.");
      return;
    }

    if (mode === "signup") {
      const nameResult = nameSchema.safeParse(name);
      if (!nameResult.success) {
        setError(nameResult.error.issues[0]?.message ?? "Invalid name.");
        return;
      }
      setBusy(true);
      try {
        await auth.signUp(emailResult.data, pwResult.data, nameResult.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not sign up.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setBusy(true);
    try {
      await auth.signIn(emailResult.data, pwResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      await auth.signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create your account"
      : mode === "reset"
        ? "Reset your password"
        : "Welcome back";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10 sm:px-6 lg:py-16">
      <header className="mb-6">
        <div className="label-caps mb-2 text-muted-foreground">ChessMentor account</div>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "reset"
            ? "We'll email you a secure link to choose a new password."
            : "Sync your rating, lesson stars, and game history everywhere."}
        </p>
      </header>

      {!auth.configured && (
        <div className="mb-5 flex gap-2 rounded-xl border border-amber/40 bg-amber/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
          <p>
            Accounts aren't configured for this app yet. Everything else works
            locally — progress is kept on this device until sign-in is enabled.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-2xl border bg-card p-5 shadow-e1 sm:p-6">
        {mode === "signup" && (
          <Field
            label="Display name"
            value={name}
            onChange={setName}
            type="text"
            autoComplete="nickname"
            placeholder="Magnus C."
            maxLength={40}
          />
        )}

        <Field
          label="Email"
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={255}
        />

        {mode !== "reset" && (
          <>
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="••••••••"
              maxLength={72}
            />
            {mode === "signup" && password.length > 0 && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < pw.score ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Strength: {pw.label}
                </p>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm text-primary">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signup"
            ? "Create account"
            : mode === "reset"
              ? "Send reset link"
              : "Sign in"}
        </button>

        {mode !== "reset" && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-accent disabled:opacity-60"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </>
        )}
      </form>

      <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">
        {mode === "signin" && (
          <>
            <p>
              New here?{" "}
              <Link
                to="/auth"
                search={{ mode: "signup", redirect }}
                className="font-medium text-primary underline"
              >
                Create an account
              </Link>
            </p>
            <p>
              <Link
                to="/auth"
                search={{ mode: "reset" }}
                className="underline hover:text-foreground"
              >
                Forgot your password?
              </Link>
            </p>
          </>
        )}
        {mode === "signup" && (
          <p>
            Already have an account?{" "}
            <Link
              to="/auth"
              search={{ mode: "signin", redirect }}
              className="font-medium text-primary underline"
            >
              Sign in
            </Link>
          </p>
        )}
        {mode === "reset" && (
          <p>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="font-medium text-primary underline"
            >
              Back to sign in
            </Link>
          </p>
        )}
        <p className="flex items-center justify-center gap-1.5 pt-2 text-xs">
          <Mail className="h-3.5 w-3.5" />
          We only email you about your account.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
  autoComplete,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type: string;
  autoComplete: string;
  placeholder: string;
  maxLength: number;
}) {
  return (
    <label className="mt-4 block first:mt-0">
      <span className="label-caps text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.5a7.2 7.2 0 0 1 0-4.6V6.8H1.4a12 12 0 0 0 0 10.4l4-2.7Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.8l4 3.1A7 7 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
