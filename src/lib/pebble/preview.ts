/**
 * Browser-preview bridge.
 *
 * The shipped product is the Tauri desktop app talking to real hardware. When
 * the same UI is opened in a plain browser there is no Bluetooth adapter, so
 * this module stands in for the native layer *and the physical Pebble* so the
 * interface can be exercised. It is only ever used when `window.__TAURI_INTERNALS__`
 * is absent, and the app renders a visible "Preview" badge whenever it is active.
 */

import type { DeviceState, NearbyPebble } from "./types";

export const PREVIEW_DOCKS = [3015, 3016, 3017];

type PreviewState = { connected: boolean; dock: number; battery: number; charging: boolean };

const state: PreviewState = { connected: false, dock: 0, battery: 86, charging: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const preview = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get dock() {
    return state.dock;
  },
  get connected() {
    return state.connected;
  },
  /** Simulates lifting the Pebble onto (or off) a magnetic dock. */
  setDock(dock: number) {
    state.dock = dock;
    state.charging = dock !== 0;
    emit();
  },
  reset() {
    state.connected = false;
    state.dock = 0;
    state.charging = false;
    emit();
  },
};

const DEVICE: NearbyPebble = {
  id: 3020,
  name: "Pebble 3020",
  identifier: "preview:3020",
  rssi: "-48 dBm",
};

function toDevice(): DeviceState {
  return {
    id: DEVICE.id,
    connected: true,
    battery: state.battery,
    charging: state.charging,
    dock: state.dock === 0 ? null : state.dock,
    name: DEVICE.name,
    firmware: "preview",
    identifier: DEVICE.identifier,
    signal: "strong",
  };
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const previewBridge = {
  async scanPebbles(): Promise<NearbyPebble[]> {
    await delay(900);
    return [DEVICE];
  },
  async connectPebble(): Promise<DeviceState> {
    await delay(500);
    state.connected = true;
    return toDevice();
  },
  async reconnectPebble(): Promise<DeviceState> {
    await delay(250);
    state.connected = true;
    return toDevice();
  },
  async disconnectPebble(): Promise<void> {
    preview.reset();
  },
  async getStatus(): Promise<DeviceState> {
    if (!state.connected) throw new Error("Pebble is not connected");
    return toDevice();
  },
  async getDockId(): Promise<number | null> {
    return state.dock === 0 ? null : state.dock;
  },
  async supportedActions(): Promise<string[]> {
    return [
      "open_app",
      "open_website",
      "open_folder",
      "run_command",
      "change_volume",
      "mute_microphone",
      "focus_mode",
    ];
  },
  async runAction(type: string, target: string): Promise<void> {
    console.info(`[preview] would run ${type} → ${target}`);
  },
};
