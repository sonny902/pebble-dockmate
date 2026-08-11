import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ActivityEvent, DeviceState, Dock, DockAction, NearbyPebble } from "./types";
import { hardware } from "./hardware";

const STORAGE_KEY = "pebble.state.v2";
const UNPAIRED_DEVICE: DeviceState = { id: null, connected: false, battery: 0, charging: false, dock: null, name: "Pebble", firmware: "—", identifier: "", signal: "weak" };
export type DockActivationPhase = "idle" | "detected" | "activating" | "active";
type PersistedState = { pebbleId: number | null; pebbleIdentifier: string; onboarded: boolean; dockId: number | null; docks: Dock[] };
type PebbleContextValue = {
  hydrated: boolean; onboarded: boolean; device: DeviceState; docks: Dock[]; activity: ActivityEvent[]; activeDock: Dock | null; unconfiguredDockId: number | null; phase: DockActivationPhase; ranActions: number;
  discoverPebbles: () => Promise<NearbyPebble[]>; pairPebble: (pebble: NearbyPebble) => Promise<void>; completeOnboarding: () => void; forgetPebble: () => void;
  getDock: (id: number) => Dock | undefined; saveDock: (dock: { id: number; name: string; actions: DockAction[] }) => void; updateDock: (id: number, patch: Partial<Omit<Dock, "id">>) => void; removeDock: (id: number) => void;
  setDeviceConnected: (connected: boolean) => Promise<void>; placeOnDock: (id: number | null) => void; detectDockPlacement: () => number | null;
};
const PebbleContext = createContext<PebbleContextValue | null>(null);
let actionSeq = 100;
export function newActionId() { actionSeq += 1; return `a${actionSeq}`; }

export function PebbleProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false), [onboarded, setOnboarded] = useState(false), [device, setDevice] = useState<DeviceState>(UNPAIRED_DEVICE), [docks, setDocks] = useState<Dock[]>([]), [activity, setActivity] = useState<ActivityEvent[]>([]), [phase, setPhase] = useState<DockActivationPhase>("idle"), [ranActions, setRanActions] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]), polling = useRef<ReturnType<typeof setInterval> | null>(null), previousDock = useRef<number | null>(null);
  const log = useCallback((event: Omit<ActivityEvent, "id" | "at">) => setActivity((prev) => [{ ...event, id: `e${Math.random().toString(36).slice(2, 9)}`, at: Date.now() }, ...prev]), []);

  useEffect(() => { try { const raw = window.localStorage.getItem(STORAGE_KEY); if (raw) { const saved = JSON.parse(raw) as PersistedState; setDocks(saved.docks ?? []); setOnboarded(Boolean(saved.onboarded)); if (saved.pebbleIdentifier) setDevice((p) => ({ ...p, id: saved.pebbleId ?? null, name: saved.pebbleId != null ? `Pebble ${saved.pebbleId}` : "Pebble", identifier: saved.pebbleIdentifier })); } } catch (error) { console.warn("Could not restore Pebble state", error); } setHydrated(true); return () => { timers.current.forEach(clearTimeout); if (polling.current) clearInterval(polling.current); }; }, []);
  useEffect(() => { if (!hydrated) return; try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ pebbleId: device.id, pebbleIdentifier: device.identifier, onboarded, dockId: device.dock, docks } satisfies PersistedState)); } catch (error) { console.warn("Could not persist Pebble state", error); } }, [hydrated, device.id, device.identifier, device.dock, onboarded, docks]);

  const activeDock = useMemo(() => device.dock == null ? null : docks.find((d) => d.id === device.dock) ?? null, [device.dock, docks]);
  const unconfiguredDockId = device.dock != null && !docks.some((d) => d.id === device.dock) ? device.dock : null;
  const runSequence = useCallback((dock: Dock) => { timers.current.forEach(clearTimeout); timers.current = []; setPhase("detected"); setRanActions(0); timers.current.push(setTimeout(() => setPhase("activating"), 700)); dock.actions.forEach((action, i) => timers.current.push(setTimeout(() => void hardware.runAction(action.type, action.target).then(() => setRanActions(i + 1)).catch((e) => console.error("Pebble action failed", e)), 1100 + i * 650))); timers.current.push(setTimeout(() => { setPhase("active"); log({ kind: "activated", title: dock.name, detail: "Workspace activated" }); }, 1200 + dock.actions.length * 650)); }, [log]);
  const applyDeviceState = useCallback((next: DeviceState) => { setDevice((p) => ({ ...p, ...next, name: next.name || p.name, identifier: next.identifier || p.identifier })); const oldDock = previousDock.current, nextDock = next.dock; previousDock.current = nextDock; if (oldDock === nextDock) return; if (nextDock == null) { timers.current.forEach(clearTimeout); setPhase("idle"); setRanActions(0); if (oldDock != null) log({ kind: "removed", title: "Pebble removed", detail: docks.find((d) => d.id === oldDock)?.name ?? "Dock removed" }); return; } const dock = docks.find((d) => d.id === nextDock); if (dock?.enabled) runSequence(dock); else setPhase("detected"); }, [docks, log, runSequence]);
  const refreshStatus = useCallback(async () => { if (!device.identifier) return; try { applyDeviceState(await hardware.getStatus()); } catch (error) { console.warn("Could not refresh Pebble status", error); setDevice((p) => ({ ...p, connected: false, dock: null, charging: false })); } }, [applyDeviceState, device.identifier]);

  useEffect(() => { if (!hydrated || !device.identifier) return; void (async () => { try { const next = await hardware.reconnectPebble(device.identifier); previousDock.current = next.dock; setDevice(next); if (next.dock != null) { const dock = docks.find((d) => d.id === next.dock); if (dock?.enabled) runSequence(dock); else setPhase("detected"); } } catch (error) { console.warn("Could not reconnect to Pebble", error); } })(); polling.current = setInterval(() => void refreshStatus(), 1500); return () => { if (polling.current) clearInterval(polling.current); polling.current = null; }; }, [hydrated, device.identifier]);

  const discoverPebbles = useCallback(() => hardware.scanPebbles(), []);
  const pairPebble = useCallback(async (pebble: NearbyPebble) => { const next = await hardware.connectPebble(pebble); previousDock.current = next.dock; setDevice(next); setPhase(next.dock == null ? "idle" : "detected"); setRanActions(0); log({ kind: "connected", title: next.name, detail: "Bluetooth link established" }); }, [log]);
  const completeOnboarding = useCallback(() => setOnboarded(true), []);
  const forgetPebble = useCallback(() => { void hardware.disconnectPebble(); timers.current.forEach(clearTimeout); setDevice(UNPAIRED_DEVICE); setDocks([]); setActivity([]); setPhase("idle"); setRanActions(0); setOnboarded(false); previousDock.current = null; window.localStorage.removeItem(STORAGE_KEY); }, []);
  const saveDock = useCallback(({ id, name, actions }: { id: number; name: string; actions: DockAction[] }) => { setDocks((prev) => prev.some((d) => d.id === id) ? prev.map((d) => d.id === id ? { ...d, name, actions } : d) : [...prev, { id, name, actions, enabled: true, createdAt: Date.now() }]); log({ kind: "configured", title: name, detail: "Dock configured" }); if (device.dock === id) { setPhase("active"); setRanActions(99); } }, [device.dock, log]);
  const updateDock = useCallback((id: number, patch: Partial<Omit<Dock, "id">>) => setDocks((prev) => prev.map((d) => d.id === id ? { ...d, ...patch } : d)), []);
  const removeDock = useCallback((id: number) => setDocks((prev) => prev.filter((d) => d.id !== id)), []);
  const setDeviceConnected = useCallback(async (connected: boolean) => { if (!connected) { await hardware.disconnectPebble(); setDevice((p) => ({ ...p, connected: false, dock: null, charging: false })); log({ kind: "disconnected", title: "Pebble disconnected", detail: "Bluetooth link closed" }); return; } if (!device.identifier) return; try { const next = await hardware.reconnectPebble(device.identifier); previousDock.current = next.dock; setDevice(next); log({ kind: "connected", title: next.name, detail: "Bluetooth link established" }); } catch (error) { console.error(error); } }, [device.identifier, log]);
  const placeOnDock = useCallback((id: number | null) => { previousDock.current = id; setDevice((p) => ({ ...p, dock: id, charging: id != null })); }, []);
  const detectDockPlacement = useCallback(() => device.dock, [device.dock]);
  const value = useMemo<PebbleContextValue>(() => ({ hydrated, onboarded, device, docks, activity, activeDock, unconfiguredDockId, phase, ranActions, discoverPebbles, pairPebble, completeOnboarding, forgetPebble, getDock: (id) => docks.find((d) => d.id === id), saveDock, updateDock, removeDock, setDeviceConnected, placeOnDock, detectDockPlacement }), [hydrated, onboarded, device, docks, activity, activeDock, unconfiguredDockId, phase, ranActions, discoverPebbles, pairPebble, completeOnboarding, forgetPebble, saveDock, updateDock, removeDock, setDeviceConnected, placeOnDock, detectDockPlacement]);
  return <PebbleContext.Provider value={value}>{children}</PebbleContext.Provider>;
}
export function usePebble() { const ctx = useContext(PebbleContext); if (!ctx) throw new Error("usePebble must be used inside PebbleProvider"); return ctx; }
