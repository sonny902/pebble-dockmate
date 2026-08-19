import { useMemo, useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { APP_CATALOG, ACTION_DEFINITIONS, ACTION_ICONS } from "@/lib/pebble/catalog";
import { newActionId } from "@/lib/pebble/store";
import { useActionSupport } from "@/lib/pebble/support";
import type { ActionType, DockAction } from "@/lib/pebble/types";
import { AppIcon } from "./AppIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PROMPTS: Partial<
  Record<ActionType, { title: string; description: string; placeholder: string }>
> = {
  open_website: {
    title: "Website URL",
    description: "Opened in your default browser when Pebble arrives.",
    placeholder: "https://example.com",
  },
  open_folder: {
    title: "Folder path",
    description: "Revealed in your file manager.",
    placeholder: "C:\\Users\\you\\Documents",
  },
  run_command: {
    title: "Command",
    description: "Run in your default shell.",
    placeholder: "npm run dev",
  },
  change_volume: {
    title: "Volume level",
    description: "A number between 0 and 100.",
    placeholder: "50",
  },
};

export function ActionPicker({
  selected,
  onChange,
  className,
}: {
  selected: DockAction[];
  onChange: (next: DockAction[]) => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<ActionType | null>(null);
  const [draft, setDraft] = useState("");
  const { isSupported } = useActionSupport();

  const apps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? APP_CATALOG.filter(
          (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
        )
      : APP_CATALOG;
  }, [query]);

  const actions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ACTION_DEFINITIONS.filter(
      (d) =>
        d.type !== "open_app" &&
        (!q || d.label.toLowerCase().includes(q) || d.description.toLowerCase().includes(q)),
    );
  }, [query]);

  const isSelected = (type: ActionType, target: string) =>
    selected.some((s) => s.type === type && s.target === target);

  const toggleApp = (name: string) =>
    onChange(
      isSelected("open_app", name)
        ? selected.filter((s) => !(s.type === "open_app" && s.target === name))
        : [...selected, { id: newActionId(), type: "open_app", target: name }],
    );

  const addAction = (type: ActionType) => {
    if (PROMPTS[type]) {
      setDraft("");
      setPending(type);
      return;
    }
    const target = type === "mute_microphone" ? "Microphone" : "Focus";
    onChange([...selected, { id: newActionId(), type, target }]);
  };

  const confirmPending = () => {
    const value = draft.trim();
    if (!pending || !value) return;
    onChange([...selected, { id: newActionId(), type: pending, target: value }]);
    setPending(null);
    setDraft("");
  };

  const prompt = pending ? PROMPTS[pending] : undefined;

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

      <div className="surface hairline-y max-h-[52vh] overflow-y-auto overscroll-contain">
        {apps.map((app) => {
          const on = isSelected("open_app", app.name);
          const enabled = isSupported("open_app");
          return (
            <button
              key={app.name}
              type="button"
              disabled={!enabled}
              onClick={() => toggleApp(app.name)}
              className="press hover:bg-accent/60 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 text-left disabled:pointer-events-none disabled:opacity-45 sm:px-5"
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
                  "flex h-7 w-7 items-center justify-center rounded-full border",
                  on
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {on ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </span>
            </button>
          );
        })}

        {actions.length > 0 && (
          <div className="bg-muted/40 px-5 py-2.5">
            <p className="text-muted-foreground text-[0.75rem] font-medium tracking-wide uppercase">
              Actions
            </p>
          </div>
        )}

        {actions.map((def) => {
          const Icon = ACTION_ICONS[def.type];
          const enabled = isSupported(def.type);
          return (
            <button
              key={def.type}
              type="button"
              disabled={!enabled}
              onClick={() => addAction(def.type)}
              className="press hover:bg-accent/60 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 text-left disabled:pointer-events-none disabled:opacity-45 sm:px-5"
            >
              <span className="bg-muted flex h-9 w-9 items-center justify-center rounded-[0.65rem]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[0.9375rem] font-medium">{def.label}</span>
                <span className="text-muted-foreground block truncate text-[0.8125rem]">
                  {enabled ? def.description : "Not supported on this computer"}
                </span>
              </span>
              {enabled ? (
                <Plus className="text-muted-foreground h-4 w-4" />
              ) : (
                <span className="text-muted-foreground text-[0.75rem]">Unsupported</span>
              )}
            </button>
          );
        })}

        {apps.length === 0 && actions.length === 0 && (
          <p className="text-muted-foreground px-5 py-10 text-center text-sm">
            Nothing matches “{query}”.
          </p>
        )}
      </div>

      <Dialog open={pending != null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{prompt?.title ?? "Action details"}</DialogTitle>
            <DialogDescription>{prompt?.description}</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmPending();
              }
            }}
            placeholder={prompt?.placeholder}
            aria-label={prompt?.title ?? "Action target"}
            className="bg-elevated border-hairline focus:ring-ring/40 h-12 w-full rounded-[var(--radius-xl)] border px-4 text-[0.9375rem] outline-none transition focus:ring-2"
          />
          <DialogFooter>
            <Button variant="ghost" className="rounded-full" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button className="rounded-full" disabled={!draft.trim()} onClick={confirmPending}>
              Add action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
