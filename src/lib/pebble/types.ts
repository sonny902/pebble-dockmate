export type DeviceState = {
  /** Physical Pebble ID, when the firmware advertises one (e.g. Pebble 3020). */
  id: number | null;
  connected: boolean;
  battery: number;
  charging: boolean;
  /** Raw dock identifier reported by the hardware, or null when undocked. */
  dock: number | null;
  name: string;
  firmware: string;
  /** Stable native BLE identifier used by the Tauri bridge. */
  identifier: string;
  signal: "strong" | "fair" | "weak";
};

/** A real Pebble returned by the native Bluetooth scan. */
export type NearbyPebble = {
  /** Numeric product ID if the advertised name contains one; otherwise null. */
  id: number | null;
  /** Advertised Bluetooth name, e.g. "Pebble 3020" or "Pebble". */
  name: string;
  /** Native BLE identifier used when connecting. */
  identifier: string;
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
