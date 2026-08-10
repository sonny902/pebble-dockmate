/**
 * Domain model for Pebble.
 *
 * The UI only ever talks to these types, never to a transport. When real
 * Bluetooth arrives, swap the mock provider in `store.tsx` for a real one that
 * emits the same `DeviceState` shape — no screen needs to change.
 */

export type DeviceState = {
  /** Physical Pebble ID, printed on the packaging. Null until paired. */
  id: number | null;
  connected: boolean;
  battery: number;
  charging: boolean;
  /** Raw dock identifier reported by the hardware, or null when undocked. */
  dock: number | null;
  name: string;
  firmware: string;
  identifier: string;
  signal: "strong" | "fair" | "weak";
};

/** A Pebble seen during a Bluetooth scan. */
export type NearbyPebble = {
  id: number;
  rssi: string;
};

export type ActionType =
  | "open_app"
  | "open_website"
  | "open_folder"
  | "run_command"
  | "change_volume"
  | "mute_microphone"
  | "focus_mode"
  | "open_workspace";

export type DockAction = {
  id: string;
  type: ActionType;
  /** Human label of the target, e.g. "Spotify" or "notion.so". */
  target: string;
};

export type Dock = {
  id: number;
  name: string;
  actions: DockAction[];
  enabled: boolean;
  createdAt: number;
};

export type ActivityEvent = {
  id: string;
  at: number;
  kind: "activated" | "removed" | "connected" | "disconnected" | "configured";
  title: string;
  detail: string;
};

export type ActionDefinition = {
  type: ActionType;
  label: string;
  /** Sentence used in review screens, e.g. "Open Spotify". */
  verb: string;
  available: boolean;
  description: string;
};
