import { Link } from "@tanstack/react-router";
import { ChevronRight, CircleDot } from "lucide-react";
import type { Dock } from "@/lib/pebble/types";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";

export function DockCard({
  dock,
  active = false,
  className,
}: {
  dock: Dock;
  active?: boolean | undefined;
  className?: string | undefined;
}) {
  const count = dock.actions.length;
  return (
    <Link
      to="/docks/$dockId"
      params={{ dockId: String(dock.id) }}
      className={cn(
        "press group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-4 hover:bg-accent/60 sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[38%] transition-colors",
            active ? "bg-primary/15" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "h-5 w-5 rounded-[40%] transition-colors",
              active ? "bg-primary" : "bg-foreground/25",
            )}
          />
          {active ? (
            <span className="bg-primary/25 animate-halo pointer-events-none absolute inset-0 rounded-[38%]" />
          ) : null}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[0.9375rem] font-medium">{dock.name}</p>
            {active ? (
              <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 text-[0.6875rem] font-medium">
                Active
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-[0.8125rem]">
            {count === 0 ? "No actions yet" : `${count} action${count === 1 ? "" : "s"}`}
            {!dock.enabled ? " · Paused" : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden items-center -space-x-2 xs:flex sm:flex">
          {dock.actions.slice(0, 3).map((a) => (
            <AppIcon
              key={a.id}
              name={a.target}
              size="sm"
              className="ring-elevated ring-2 ring-[var(--color-elevated)]"
            />
          ))}
          {count === 0 ? <CircleDot className="text-muted-foreground/50 h-4 w-4" /> : null}
        </div>
        <ChevronRight className="text-muted-foreground/60 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
