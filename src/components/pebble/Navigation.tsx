import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, House, Settings, SquareStack } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: House, exact: true },
  { to: "/docks", label: "Docks", icon: SquareStack, exact: false },
  { to: "/activity", label: "Activity", icon: Activity, exact: false },
  { to: "/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

export function MobileNavigation() {
  const pathname = useActivePath();
  // Setup is a focused, full-screen flow.
  if (pathname === "/docks/new") return null;
  return (
    <nav
      aria-label="Primary"
      className="border-hairline bg-elevated/85 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "press flex min-h-[3.75rem] flex-col items-center justify-center gap-1 pt-2 pb-1.5",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-[1.3rem] w-[1.3rem] transition-transform duration-200",
                    active && "scale-105",
                  )}
                  strokeWidth={active ? 2.3 : 1.9}
                />
                <span className="text-[0.6875rem] font-medium tracking-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopSidebar() {
  const pathname = useActivePath();
  return (
    <aside className="border-hairline bg-sidebar fixed inset-y-0 left-0 z-40 hidden w-[16.5rem] border-r px-4 py-7 lg:flex lg:flex-col">
      <Link to="/" className="press mb-8 flex items-center gap-3 px-2">
        <span
          className="h-8 w-8 rounded-[38%]"
          style={{
            background:
              "radial-gradient(120% 100% at 30% 20%, color-mix(in oklab, var(--color-primary) 30%, var(--color-elevated)), var(--color-primary))",
            boxShadow: "var(--shadow-1)",
          }}
        />
        <span className="text-[1.0625rem] font-semibold tracking-tight">Pebble</span>
      </Link>

      <nav aria-label="Primary" className="flex-1">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "press flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-[0.9375rem] font-medium transition-colors",
                    active
                      ? "bg-elevated text-foreground shadow-[var(--shadow-1)]"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                >
                  <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={active ? 2.2 : 1.9} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <p className="text-muted-foreground/70 px-3 text-[0.75rem]">Pebble for Desktop · 1.4.2</p>
    </aside>
  );
}
