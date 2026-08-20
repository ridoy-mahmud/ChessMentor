// Phase 21A — header account affordance: reflects the live session, shows a
// menu with profile/sign-out when signed in, a CTA when signed out.

import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/firebase/AuthProvider";

export function AccountMenu() {
  const { loading, user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (loading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />;
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        search={{ mode: "signin" }}
        className="ml-1 flex h-9 items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Sign in
      </Link>
    );
  }

  const name = profile?.displayName || user.displayName || user.email || "Player";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className="ml-1 grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border bg-secondary text-xs font-semibold transition-colors hover:border-primary/50"
        >
          {profile?.photoURL || user.photoURL ? (
            <img
              src={(profile?.photoURL ?? user.photoURL) as string}
              alt={name}
              width={36}
              height={36}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            initials || <UserIcon className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate font-medium">{name}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">
            {user.email}
          </div>
          {profile && (
            <div className="mt-1 font-data text-xs text-primary">
              {profile.rating} rating
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" /> Your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
