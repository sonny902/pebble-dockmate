import type { DeviceState, NearbyPebble } from "./types";

type NativeStatus = {
  battery: number;
  charging: boolean;
  dock: number;
  id: number | null;
  name: string;
  identifier: string;
};

type NativePebble = {
  id: number | null;
  name: string;
  identifier: string;
  rssi: string;
};

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function invokeNative<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

function toDevice(status: NativeStatus): DeviceState {
  return {
    id: status.id,
    connected: true,
    battery: status.battery,
    charging: status.charging,
    dock: status.dock === 0 ? null : status.dock,
    name: status.name,
    firmware: "—",
    identifier: status.identifier,
    signal: "strong",
  };
}

export const hardware = {
  async scanPebbles(): Promise<NearbyPebble[]> {
    if (!isTauriRuntime()) return [];
    return invokeNative<NativePebble[]>("scan_pebbles");
  },

  async connectPebble(pebble: NearbyPebble): Promise<DeviceState> {
    if (!isTauriRuntime()) {
      throw new Error("Pebble Companion must be running as the desktop app to connect to hardware.");
    }

    const status = await invokeNative<NativeStatus>("connect_pebble", {
      identifier: pebble.identifier,
    });
    return toDevice(status);
  },

  async getStatus(): Promise<DeviceState> {
    if (!isTauriRuntime()) {
      throw new Error("Native Pebble hardware is unavailable in the browser preview.");
    }

    const status = await invokeNative<NativeStatus>("get_status");
    return toDevice(status);
  },

  async runAction(type: string, target: string): Promise<void> {
    if (!isTauriRuntime()) return;
    await invokeNative<void>("execute_action", {
      actionType: type,
      target,
    });
  },
};
