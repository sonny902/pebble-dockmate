import {
  AppWindow,
  FolderOpen,
  Globe,
  Mic,
  Moon,
  Terminal,
  Volume2,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import type { ActionDefinition, ActionType, DockAction } from "./types";

export const ACTION_DEFINITIONS: ActionDefinition[] = [
  {
    type: "open_app",
    label: "Open App",
    verb: "Open",
    available: true,
    description: "Launch an app on your Mac or PC.",
  },
  {
    type: "open_website",
    label: "Open Website",
    verb: "Open",
    available: false,
    description: "Open a page in your default browser.",
  },
  {
    type: "open_folder",
    label: "Open Folder",
    verb: "Open",
    available: false,
    description: "Reveal a folder in the file manager.",
  },
  {
    type: "run_command",
    label: "Run Command",
    verb: "Run",
    available: false,
    description: "Execute a saved shell command.",
  },
  {
    type: "change_volume",
    label: "Change Volume",
    verb: "Set volume to",
    available: false,
    description: "Set system volume to a level.",
  },
  {
    type: "mute_microphone",
    label: "Mute Microphone",
    verb: "Mute",
    available: false,
    description: "Silence your input device.",
  },
  {
    type: "focus_mode",
    label: "Start Focus Mode",
    verb: "Start",
    available: false,
    description: "Turn on Do Not Disturb.",
  },
  {
    type: "open_workspace",
    label: "Open Workspace",
    verb: "Open",
    available: false,
    description: "Restore a saved set of windows.",
  },
];

export const ACTION_ICONS: Record<ActionType, LucideIcon> = {
  open_app: AppWindow,
  open_website: Globe,
  open_folder: FolderOpen,
  run_command: Terminal,
  change_volume: Volume2,
  mute_microphone: Mic,
  focus_mode: Moon,
  open_workspace: LayoutGrid,
};

export type AppEntry = {
  name: string;
  category: string;
  /** Two brand-ish stops used for the app tile. */
  tint: [string, string];
  mark: string;
};

export const APP_CATALOG: AppEntry[] = [
  { name: "Visual Studio Code", category: "Development", tint: ["#3aa0f0", "#1b6fd6"], mark: "VS" },
  { name: "Spotify", category: "Music", tint: ["#4bd67f", "#17a34a"], mark: "Sp" },
  { name: "Google Chrome", category: "Browser", tint: ["#f4c14d", "#e2604a"], mark: "Ch" },
  { name: "Discord", category: "Communication", tint: ["#7f8ff4", "#4d5bd6"], mark: "Ds" },
  { name: "Slack", category: "Communication", tint: ["#c86dd7", "#7b3fe4"], mark: "Sl" },
  { name: "Notion", category: "Productivity", tint: ["#9aa3ad", "#4c5560"], mark: "No" },
  { name: "Terminal", category: "Development", tint: ["#5b6470", "#242a33"], mark: "Tm" },
  { name: "Microsoft Teams", category: "Communication", tint: ["#7b8bef", "#3f51b5"], mark: "Te" },
  { name: "Figma", category: "Design", tint: ["#f78f6d", "#a259ff"], mark: "Fg" },
  { name: "Safari", category: "Browser", tint: ["#6ec7ff", "#1e77d8"], mark: "Sa" },
  { name: "Mail", category: "Productivity", tint: ["#77b8ff", "#2f6fe0"], mark: "Ma" },
  { name: "Calendar", category: "Productivity", tint: ["#ff8f8f", "#e04545"], mark: "Ca" },
  { name: "Xcode", category: "Development", tint: ["#68a8ff", "#2a5fd0"], mark: "Xc" },
  { name: "Obsidian", category: "Productivity", tint: ["#a98cf5", "#6d43c9"], mark: "Ob" },
  { name: "Zoom", category: "Communication", tint: ["#6fb4ff", "#1a72e8"], mark: "Zo" },
  { name: "Linear", category: "Productivity", tint: ["#8e93ff", "#4e51c9"], mark: "Li" },
  { name: "Apple Music", category: "Music", tint: ["#ff8fa8", "#e0355b"], mark: "AM" },
  { name: "Photoshop", category: "Design", tint: ["#5ec2ff", "#0a4c8f"], mark: "Ps" },
];

export function appEntry(name: string): AppEntry {
  return (
    APP_CATALOG.find((a) => a.name === name) ?? {
      name,
      category: "App",
      tint: ["#a5adba", "#5b6470"],
      mark: name.slice(0, 2),
    }
  );
}

export function actionLabel(action: DockAction): string {
  const def = ACTION_DEFINITIONS.find((d) => d.type === action.type);
  return `${def?.verb ?? "Run"} ${action.target}`;
}

export const DOCK_NAME_SUGGESTIONS = [
  "Desk",
  "Office",
  "Bedroom",
  "Living Room",
  "Car",
  "Meeting Room",
];
