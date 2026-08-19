import { Check, Monitor, Moon, Sun } from "lucide-react";
import { ACCENTS, PRESETS, useTheme, type Appearance } from "@/lib/theme";
import { cn } from "@/lib/utils";

const APPEARANCES: { id: Appearance; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

export function AppearanceSegmented() {
  const { appearance, setAppearance } = useTheme();
  return (
    <div className="bg-muted relative grid grid-cols-3 gap-1 rounded-[var(--radius-xl)] p-1">
      {APPEARANCES.map(({ id, label, icon: Icon }) => {
        const on = appearance === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setAppearance(id)}
            aria-pressed={on}
            className={cn(
              "press flex items-center justify-center gap-2 rounded-[var(--radius-lg)] py-2.5 text-[0.875rem] font-medium transition-all duration-200",
              on
                ? "bg-elevated text-foreground shadow-[var(--shadow-1)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function AccentPicker() {
  const { accent, setAccent } = useTheme();
  return (
    <div className="flex flex-wrap gap-3 px-1">
      {ACCENTS.map((a) => {
        const on = accent === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => setAccent(a.id)}
            aria-label={a.name}
            aria-pressed={on}
            className={cn(
              "press relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
              on
                ? "ring-foreground/60 ring-2 ring-offset-2 ring-offset-[var(--color-elevated)]"
                : "",
            )}
            style={{ backgroundColor: a.color }}
          >
            {on ? <Check className="animate-check h-4 w-4 text-white" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function ThemePicker() {
  const { preset, setPreset } = useTheme();
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {PRESETS.map((p) => {
        const on = preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPreset(p.id)}
            aria-pressed={on}
            className={cn(
              "press surface flex flex-col gap-3 p-3.5 text-left transition-all duration-200",
              on ? "ring-primary/70 ring-2" : "hover:shadow-[var(--shadow-2)]",
            )}
          >
            <div className="flex h-14 overflow-hidden rounded-[var(--radius-md)]">
              {p.swatch.map((c) => (
                <span key={c} className="flex-1" style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[0.875rem] font-medium">{p.name}</p>
              <p className="text-muted-foreground truncate text-[0.75rem]">{p.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
