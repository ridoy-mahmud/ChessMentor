// Phase 19: light page-transition wrapper — soft fade/lift under 250ms on
// route change, keyed on pathname.

import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
