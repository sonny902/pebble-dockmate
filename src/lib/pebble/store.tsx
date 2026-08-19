import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { hardware, isBusyError } from "./hardware";
import type { ActivityEvent, DeviceState, Dock, DockAction, NearbyPebble } from "./types";

const STORAGE_KEY = "pebble.state.v3";
const POLL_MS = 2500;
const MAX_ACTIVITY = 60;

const UNPAIRED_DEVICE: DeviceState = {
  id: null,
  connected: false,
  battery: 0,
  charging: false,
  dock: null,
  name: "Pebble",
  firmware: "—",
  identifier: "",
  signal: "weak",
};

export type DockActivationPhase = "idle" | "detected" | "activating" | "active";

type PersistedState = {
  version: 3;
  pebbleId: number | null;
  pebbleName: string;
  pebbleIdentifier: string;
  onboarded: boolean;
  docks: Dock[];
  activity: ActivityEvent[];
};

type PebbleContextValue = {
  hydrated: boolean;
  onboarded: boolean;
  device: DeviceState;
  docks: Dock[];
  activity: ActivityEvent[];
  activeDock: Dock | null;
  unconfiguredDockId: number | null;
  phase: DockActivationPhase;
  ranActions: number;
  /** Last native error surfaced to the UI, or null. */
  lastError: string | null;
  discoverPebbles: () => Promise<NearbyPebble[]>;
  pairPebble: (pebble: NearbyPebble) => Promise<void>;
  completeOnboarding: () => void;
  forgetPebble: () => void;
  getDock: (id: number) => Dock | undefined;
  saveDock: (dock: { id: number; name: string; actions: DockAction[] }) => void;
  updateDock: (id: number, patch: Partial<Omit<Dock, "id">>) => void;
  removeDock: (id: number) => void;
  setDeviceConnected: (connected: boolean) => Promise<void>;
  runDockNow: (id: number) => void;
};

const PebbleContext = createContext<PebbleContextValue | null>(null);

let actionSeq = 100;
export function newActionId() {
  actionSeq += 1;
  return `a${actionSeq}-${Date.now().toString(36)}`;
}

function isDock(value: unknown): value is Dock {
  const d = value as Dock | null;
  return (
    !!d &&
    typeof d.id === "number" &&
    typeof d.name === "string" &&
    Array.isArray(d.actions) &&
    d.actions.every((a) => a && typeof a.id === "string" && typeof a.type === "string")
  );
}

function readPersisted(): Partial<PersistedState> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      pebbleId: typeof parsed.pebbleId === "number" ? parsed.pebbleId : null,
      pebbleName: typeof parsed.pebbleName === "string" ? parsed.pebbleName : "Pebble",
      pebbleIdentifier:
        typeof parsed.pebbleIdentifier === "string" ? parsed.pebbleIdentifier : "",
      onboarded: Boolean(parsed.onboarded),
      docks: Array.isArray(parsed.docks)
        ? parsed.docks.filter(isDock).map((d) => ({ ...d, enabled: d.enabled !== false }))
        : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity.slice(0, MAX_ACTIVITY) : [],
    };
  } catch (error) {
    console.warn("Could not restore Pebble state", error);
    return null;
  }
}

export function PebbleProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [device, setDevice] = useState<DeviceState>(UNPAIRED_DEVICE);
  const [docks, setDocks] = useState<Dock[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [phase, setPhase] = useState<DockActivationPhase>("idle");
  const [ranActions, setRanActions] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const poller = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousDock = useRef<number | null>(null);
  const pollInFlight = useRef(false);
  /** Set while onboarding scans/connects own the BLE adapter. */
  const adapterBusy = useRef(false);
  const docksRef = useRef<Dock[]>([]);
  docksRef.current = docks;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const log = useCallback((event: Omit<ActivityEvent, "id" | "at">) => {
    setActivity((prev) =>
      [
        { ...event, id: `e${Math.random().toString(36).slice(2, 9)}`, at: Date.now() },
        ...prev,
      ].slice(0, MAX_ACTIVITY),
    );
  }, []);

  // Restore persisted state once, after the first paint.
  useEffect(() => {
    const saved = readPersisted();
    if (saved) {
      setDocks(saved.docks ?? []);
      setActivity(saved.activity ?? []);
      setOnboarded(Boolean(saved.onboarded));
      if (saved.pebbleIdentifier) {
        setDevice((prev) => ({
          ...prev,
          id: saved.pebbleId ?? null,
          name: saved.pebbleName || "Pebble",
          identifier: saved.pebbleIdentifier ?? "",
        }));
      }
    }
    setHydrated(true);
  }, []);

  // Tear everything down exactly once on unmount.
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (poller.current) clearInterval(poller.current);
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    const payload: PersistedState = {
      version: 3,
      pebbleId: device.id,
      pebbleName: device.name,
      pebbleIdentifier: device.identifier,
      onboarded,
      docks,
      activity,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("Could not persist Pebble state", error);
    }
  }, [hydrated, device.id, device.name, device.identifier, onboarded, docks, activity]);

  const activeDock = useMemo(
    () => (device.dock == null ? null : (docks.find((d) => d.id === device.dock) ?? null)),
    [device.dock, docks],
  );
  const unconfiguredDockId =
    device.dock != null && !docks.some((d) => d.id === device.dock) ? device.dock : null;

  /** Runs a dock's actions through the native layer, one at a time. */
  const runSequence = useCallback(
    (dock: Dock) => {
      clearTimers();
      setPhase("detected");
      setRanActions(0);
      timers.current.push(setTimeout(() => setPhase("activating"), 600));
      dock.actions.forEach((action, i) => {
        timers.current.push(
          setTimeout(
            () => {
              void hardware
                .runAction(action.type, action.target)
                .catch((error) => {
                  console.error("Pebble action failed", error);
                  setLastError(error instanceof Error ? error.message : String(error));
                })
                .finally(() => setRanActions(i + 1));
            },
            900 + i * 500,
          ),
        );
      });
      timers.current.push(
        setTimeout(
          () => {
            setPhase("active");
            log({ kind: "activated", title: dock.name, detail: "Workspace activated" });
          },
          1000 + dock.actions.length * 500,
        ),
      );
    },
    [clearTimers, log],
  );

  /** Applies a status read and reacts to dock transitions. */
  const applyStatus = useCallback(
    (next: DeviceState) => {
      setDevice((prev) => ({
        ...prev,
        ...next,
        name: next.name || prev.name,
        identifier: next.identifier || prev.identifier,
      }));

      const from = previousDock.current;
      const to = next.dock;
      if (from === to) return;
      previousDock.current = to;

      if (to == null) {
        clearTimers();
        setPhase("idle");
        setRanActions(0);
        if (from != null) {
          log({
            kind: "removed",
            title: "Pebble removed",
            detail: docksRef.current.find((d) => d.id === from)?.name ?? `Dock ${from}`,
          });
        }
        return;
      }

      const dock = docksRef.current.find((d) => d.id === to);
      if (dock?.enabled) runSequence(dock);
      else setPhase("detected");
    },
    [clearTimers, log, runSequence],
  );

  /** Background poll — always yields to onboarding scans/connects. */
  const refreshStatus = useCallback(async () => {
    if (adapterBusy.current || pollInFlight.current) return;
    pollInFlight.current = true;
    try {
      applyStatus(await hardware.getStatus());
      setLastError(null);
    } catch (error) {
      if (isBusyError(error)) return;
      setDevice((prev) => ({ ...prev, connected: false, charging: false }));
    } finally {
      pollInFlight.current = false;
    }
  }, [applyStatus]);

  // Single status poller for the whole app.
  useEffect(() => {
    if (poller.current) {
      clearInterval(poller.current);
      poller.current = null;
    }
    if (!hydrated || !device.identifier) return;
    poller.current = setInterval(() => void refreshStatus(), POLL_MS);
    return () => {
      if (poller.current) clearInterval(poller.current);
      poller.current = null;
    };
  }, [hydrated, device.identifier, refreshStatus]);

  // Reconnect to the remembered Pebble on launch.
  const reconnectAttempted = useRef(false);
  useEffect(() => {
    if (!hydrated || !onboarded || !device.identifier || device.connected) return;
    if (reconnectAttempted.current) return;
    reconnectAttempted.current = true;
    let cancelled = false;
    void (async () => {
      adapterBusy.current = true;
      try {
        const next = await hardware.reconnectPebble(device.identifier);
        if (!cancelled) applyStatus(next);
      } catch (error) {
        console.warn("Could not reconnect to Pebble", error);
      } finally {
        adapterBusy.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, onboarded, device.identifier, device.connected, applyStatus]);

  const discoverPebbles = useCallback(async () => {
    adapterBusy.current = true;
    try {
      const found = await hardware.scanPebbles();
      setLastError(null);
      return found;
    } finally {
      adapterBusy.current = false;
    }
  }, []);

  const pairPebble = useCallback(
    async (pebble: NearbyPebble) => {
      adapterBusy.current = true;
      try {
        const next = await hardware.connectPebble(pebble);
        reconnectAttempted.current = true;
        previousDock.current = next.dock;
        setDevice(next);
        setPhase(next.dock == null ? "idle" : "detected");
        setRanActions(0);
        setLastError(null);
        log({ kind: "connected", title: next.name, detail: "Bluetooth link established" });
      } finally {
        adapterBusy.current = false;
      }
    },
    [log],
  );

  const completeOnboarding = useCallback(() => setOnboarded(true), []);

  const forgetPebble = useCallback(() => {
    void hardware.disconnectPebble().catch(() => undefined);
    clearTimers();
    reconnectAttempted.current = false;
    previousDock.current = null;
    setDevice(UNPAIRED_DEVICE);
    setDocks([]);
    setActivity([]);
    setPhase("idle");
    setRanActions(0);
    setOnboarded(false);
    setLastError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — in-memory reset is enough */
    }
  }, [clearTimers]);

  const saveDock = useCallback(
    ({ id, name, actions }: { id: number; name: string; actions: DockAction[] }) => {
      let saved: Dock | null = null;
      setDocks((prev) => {
        const existing = prev.find((d) => d.id === id);
        if (existing) {
          saved = { ...existing, name, actions };
          return prev.map((d) => (d.id === id ? saved! : d));
        }
        saved = { id, name, actions, enabled: true, createdAt: Date.now() };
        return [...prev, saved];
      });
      log({ kind: "configured", title: name, detail: "Dock configured" });
      // If the Pebble is sitting on this dock right now, run it for real.
      if (device.dock === id && saved) runSequence(saved);
    },
    [device.dock, log, runSequence],
  );

  const updateDock = useCallback(
    (id: number, patch: Partial<Omit<Dock, "id">>) =>
      setDocks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d))),
    [],
  );

  const removeDock = useCallback(
    (id: number) => setDocks((prev) => prev.filter((d) => d.id !== id)),
    [],
  );

  const setDeviceConnected = useCallback(
    async (connected: boolean) => {
      if (!connected) {
        adapterBusy.current = true;
        try {
          await hardware.disconnectPebble();
        } finally {
          adapterBusy.current = false;
        }
        clearTimers();
        previousDock.current = null;
        reconnectAttempted.current = false;
        setPhase("idle");
        setDevice((prev) => ({ ...prev, connected: false, dock: null, charging: false }));
        log({ kind: "disconnected", title: "Pebble disconnected", detail: "Bluetooth link closed" });
        return;
      }
      if (!device.identifier) return;
      adapterBusy.current = true;
      try {
        const next = await hardware.reconnectPebble(device.identifier);
        previousDock.current = null;
        applyStatus(next);
        setLastError(null);
        log({ kind: "connected", title: next.name, detail: "Bluetooth link established" });
      } catch (error) {
        setLastError(error instanceof Error ? error.message : String(error));
      } finally {
        adapterBusy.current = false;
      }
    },
    [applyStatus, clearTimers, device.identifier, log],
  );

  const runDockNow = useCallback(
    (id: number) => {
      const dock = docksRef.current.find((d) => d.id === id);
      if (dock) runSequence(dock);
    },
    [runSequence],
  );

  const getDock = useCallback((id: number) => docks.find((d) => d.id === id), [docks]);

  const value = useMemo<PebbleContextValue>(
    () => ({
      hydrated,
      onboarded,
      device,
      docks,
      activity,
      activeDock,
      unconfiguredDockId,
      phase,
      ranActions,
      lastError,
      discoverPebbles,
      pairPebble,
      completeOnboarding,
      forgetPebble,
      getDock,
      saveDock,
      updateDock,
      removeDock,
      setDeviceConnected,
      runDockNow,
    }),
    [
      hydrated,
      onboarded,
      device,
      docks,
      activity,
      activeDock,
      unconfiguredDockId,
      phase,
      ranActions,
      lastError,
      discoverPebbles,
      pairPebble,
      completeOnboarding,
      forgetPebble,
      getDock,
      saveDock,
      updateDock,
      removeDock,
      setDeviceConnected,
      runDockNow,
    ],
  );

  return <PebbleContext.Provider value={value}>{children}</PebbleContext.Provider>;
}

export function usePebble() {
  const ctx = useContext(PebbleContext);
  if (!ctx) throw new Error("usePebble must be used inside PebbleProvider");
  return ctx;
}
