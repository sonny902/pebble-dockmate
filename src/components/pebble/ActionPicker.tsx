import { useMemo, useState } from "react";
import { Check, Lock, Plus, Search } from "lucide-react";
import { APP_CATALOG, ACTION_DEFINITIONS, ACTION_ICONS } from "@/lib/pebble/catalog";
import { newActionId } from "@/lib/pebble/store";
import type { DockAction } from "@/lib/pebble/types";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";

/**
 * Search-first picker for actions. Today only `open_app` is selectable; other
 * action types are listed as coming soon so the model is visibly extensible.
 */
export function ActionPicker({
  selected,
  onChange,
  className,
}: {
  selected: DockAction[];
  onChange: (next: DockAction[]) => void;
  className?: string | undefined;
}) {
  const [query, setQuery] = useState("");

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return APP_CATALOG;
    return APP_CATALOG.filter(
      (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
    );
  }, [query]);

  const otherTypes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTION_DEFINITIONS.filter(
      (d) => !d.available && (!q || d.label.toLowerCase().includes(q)),
    );
  }, [query]);

  const isSelected = (name: string) =>
    selected.some((s) => s.type === "open_app" && s.target === name);

  const toggle = (name: string) => {
    if (isSelected(name)) {
      onChange(selected.filter((s) => !(s.type === "open_app" && s.target === name)));
    } else {
      onChange([...selected, { id: newActionId(), type: "open_app", target: name }]);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps and actions..."
          aria-label="Search apps and actions"
          className="bg-elevated border-hairline focus:ring-ring/40 h-12 w-full rounded-[var(--radius-xl)] border pr-4 pl-11 text-[0.9375rem] shadow-[var(--shadow-1)] outline-none transition focus:ring-2"
        />
      </div>

      <div className="surface hairline-y max-h-[46vh] overflow-y-auto overscroll-contain sm:max-h-[52vh]">
        {apps.map((app) => {
          const on = isSelected(app.name);
          return (
            <button
              key={app.name}
              type="button"
              onClick={() => toggle(app.name)}
              className="press hover:bg-accent/60 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 text-left sm:px-5"
            >
              <AppIcon name={app.name} size="md" />
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-medium">{app.name}</span>
                <span className="text-muted-foreground block truncate text-[0.8125rem]">
                  {app.category}
                </span>
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-200",
                  on
                    ? "bg-primary border-primary text-primary-foreground scale-100"
                    : "border-border text-muted-foreground",
                )}
              >
                {on ? (
                  <Check className="animate-check h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </span>
            </button>
          );
        })}

        {apps.length === 0 && otherTypes.length === 0 ? (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            Nothing matches “{query}”.
          </p>
        ) : null}

        {otherTypes.length > 0 ? (
          <div className="bg-muted/40 px-5 py-2.5">
            <p className="text-muted-foreground text-[0.75rem] font-medium tracking-wide uppercase">
              Coming soon
            </p>
          </div>
        ) : null}

        {otherTypes.map((def) => {
          const Icon = ACTION_ICONS[def.type];
          return (
            <div
              key={def.type}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 opacity-55 sm:px-5"
            >
              <span className="bg-muted flex h-9 w-9 items-center justify-center rounded-[0.65rem]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-medium">{def.label}</span>
                <span className="text-muted-foreground block truncate text-[0.8125rem]">
                  {def.description}
                </span>
              </span>
              <Lock className="text-muted-foreground h-4 w-4" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
