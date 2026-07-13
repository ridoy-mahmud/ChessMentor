import { Link } from "@tanstack/react-router";
import { Moon, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import {
  initSettings,
  toggleMute,
  toggleTheme,
  useSettings,
} from "@/lib/chess/settings";

type NavItem = {
  to: "/" | "/learn" | "/play" | "/puzzles" | "/editor" | "/guess" | "/profile";
  label: string;
  exact?: boolean;
};

const NAV: NavItem[] = [
  { to: "/", label: "Home", exact: true },
  { to: "/learn", label: "Learn" },
  { to: "/play", label: "Play" },
  { to: "/puzzles", label: "Puzzles" },
  { to: "/editor", label: "Editor" },
  { to: "/guess", label: "Guess" },
  { to: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, muted } = useSettings();

  useEffect(() => {
    initSettings();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-lg font-semibold text-primary-foreground shadow-e1">
              ♞
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Chess<span className="text-primary">Mentor</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.exact }}
                activeProps={{ className: "text-foreground bg-secondary" }}
                inactiveProps={{
                  className: "text-muted-foreground hover:text-foreground",
                }}
                className="flex h-11 items-center rounded-md px-3 font-medium transition-colors"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-11 w-11 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 text-sm md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              activeProps={{ className: "text-foreground bg-secondary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex h-11 items-center whitespace-nowrap rounded-md px-3 font-medium transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main>{children}</main>
    </div>
  );
}
