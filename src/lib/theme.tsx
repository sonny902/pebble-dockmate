import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Appearance = "light" | "dark" | "system";
export type PresetId = "pebble" | "midnight" | "arctic" | "forest" | "ocean" | "rose";
export type AccentId = "graphite" | "blue" | "teal" | "green" | "amber" | "rose" | "violet";

export const PRESETS: {
  id: PresetId;
  name: string;
  description: string;
  accent: AccentId;
  prefers?: Appearance;
  swatch: [string, string, string];
}[] = [
  {
    id: "pebble",
    name: "Pebble",
    description: "Clean neutral default",
    accent: "graphite",
    swatch: ["#f7f7f8", "#e6e7ea", "#3a3d44"],
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark and sophisticated",
    accent: "violet",
    prefers: "dark",
    swatch: ["#15151f", "#26263a", "#9b8bff"],
  },
  {
    id: "arctic",
    name: "Arctic",
    description: "Cool, bright and minimal",
    accent: "blue",
    swatch: ["#f3f8fd", "#dbe8f5", "#2f7ae0"],
  },
  {
    id: "forest",
    name: "Forest",
    description: "Subtle green",
    accent: "green",
    swatch: ["#f4f8f3", "#dde9dc", "#2f7d52"],
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep blue",
    accent: "teal",
    swatch: ["#f0f6fa", "#d5e6f0", "#1f7b8c"],
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft warm accent",
    accent: "rose",
    swatch: ["#fcf5f4", "#f2e0dd", "#c8496a"],
  },
];

export const ACCENTS: { id: AccentId; name: string; color: string }[] = [
  { id: "graphite", name: "Graphite", color: "#41454d" },
  { id: "blue", name: "Blue", color: "#2f77e0" },
  { id: "teal", name: "Teal", color: "#22879a" },
  { id: "green", name: "Green", color: "#2c8552" },
  { id: "amber", name: "Amber", color: "#c07615" },
  { id: "rose", name: "Rose", color: "#d1436b" },
  { id: "violet", name: "Violet", color: "#7457e8" },
];

type ThemeContextValue = {
  appearance: Appearance;
  preset: PresetId;
  accent: AccentId;
  resolved: "light" | "dark";
  setAppearance: (a: Appearance) => void;
  setPreset: (p: PresetId) => void;
  setAccent: (a: AccentId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "pebble.theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearanceState] = useState<Appearance>("system");
  const [preset, setPresetState] = useState<PresetId>("pebble");
  const [accent, setAccentState] = useState<AccentId>("graphite");
  const [systemDark, setSystemDark] = useState(false);

  // Hydrate from storage after mount to avoid SSR mismatches.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ThemeContextValue>;
        if (parsed.appearance) setAppearanceState(parsed.appearance);
        if (parsed.preset) setPresetState(parsed.preset);
        if (parsed.accent) setAccentState(parsed.accent);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    appearance === "system" ? (systemDark ? "dark" : "light") : appearance;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.dataset["theme"] = preset;
    root.dataset["accent"] = accent;
    root.style.colorScheme = resolved;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ appearance, preset, accent }));
    } catch {
      /* ignore */
    }
  }, [resolved, preset, accent, appearance]);

  const setPreset = useCallback((p: PresetId) => {
    setPresetState(p);
    const found = PRESETS.find((x) => x.id === p);
    if (found) {
      setAccentState(found.accent);
      if (found.prefers) setAppearanceState(found.prefers);
    }
  }, []);

  const value = useMemo(
    () => ({
      appearance,
      preset,
      accent,
      resolved,
      setAppearance: setAppearanceState,
      setPreset,
      setAccent: setAccentState,
    }),
    [appearance, preset, accent, resolved, setPreset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
