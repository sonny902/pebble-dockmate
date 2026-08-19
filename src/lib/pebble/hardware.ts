import { previewBridge } from "./preview";
import type { DeviceState, NearbyPebble } from "./types";

type NativeStatus = {
  battery: number;
  charging: boolean;
  dock: number;
  id: number | null;
  name: string;
  identifier: string;
};
type NativePebble = { id: number | null; name: string; identifier: string; rssi: string };

/** Returned by the native layer when another BLE operation owns the adapter. */
export const BUSY = "BUSY";

export function isBusyError(error: unknown) {
  return error instanceof Error ? error.message.includes(BUSY) : String(error).includes(BUSY);
}

export function isNativeRuntime() {
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
  get isNative() {
    return isNativeRuntime();
  },

  async scanPebbles(): Promise<NearbyPebble[]> {
    if (!isNativeRuntime()) return previewBridge.scanPebbles();
    return invokeNative<NativePebble[]>("scan_pebbles");
  },

  async connectPebble(pebble: NearbyPebble): Promise<DeviceState> {
    if (!isNativeRuntime()) return previewBridge.connectPebble();
    return toDevice(
      await invokeNative<NativeStatus>("connect_pebble", { identifier: pebble.identifier }),
    );
  },

  async reconnectPebble(identifier: string): Promise<DeviceState> {
    if (!isNativeRuntime()) return previewBridge.reconnectPebble();
    return toDevice(await invokeNative<NativeStatus>("reconnect_pebble", { identifier }));
  },

  async disconnectPebble(): Promise<void> {
    if (!isNativeRuntime()) return previewBridge.disconnectPebble();
    await invokeNative<void>("disconnect_pebble");
  },

  async getStatus(): Promise<DeviceState> {
    if (!isNativeRuntime()) return previewBridge.getStatus();
    return toDevice(await invokeNative<NativeStatus>("get_status"));
  },

  async getDockId(): Promise<number | null> {
    if (!isNativeRuntime()) return previewBridge.getDockId();
    const dock = await invokeNative<number>("get_dock_id");
    return dock === 0 ? null : dock;
  },

  async supportedActions(): Promise<string[]> {
    if (!isNativeRuntime()) return previewBridge.supportedActions();
    return invokeNative<string[]>("supported_actions");
  },

  async runAction(type: string, target: string): Promise<void> {
    if (!isNativeRuntime()) return previewBridge.runAction(type, target);
    await invokeNative<void>("execute_action", { actionType: type, target });
  },
};
