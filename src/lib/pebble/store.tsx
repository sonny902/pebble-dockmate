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
import type { ActivityEvent, DeviceState, Dock, DockAction, NearbyPebble } from "./types";
import { hardware } from "./hardware";

const STORAGE_KEY = "pebble.state.v2";

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
  pebbleId: number | null;
  pebbleIdentifier: string;
  onboarded: boolean;
  dockId: number | null;
  docks: Dock[];
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
  discoverPebbles: () => Promise<NearbyPebble[]>;
  pairPebble: (pebble: NearbyPebble) => Promise<void>;
  completeOnboarding: () => void;
  forgetPebble: () => void;
  getDock: (id: number) => Dock | undefined;
  saveDock: (dock: { id: number; name: string; actions: DockAction[] }) => void;
  updateDock: (id: number, patch: Partial<Omit<Dock, "id">>) => void;
  removeDock: (id: number) => void;
  setDeviceConnected: (connected: boolean) => void;
  placeOnDock: (id: number | null) => void;
  detectDockPlacement: () => Promise<number | null>;
};

const PebbleContext = createContext<PebbleContextValue | null>(null);

let actionSeq = 100;
export function newActionId() {
  actionSeq += 1;
  return `a${actionSeq}`;
}

export function PebbleProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [device, setDevice] = useState<DeviceState>(UNPAIRED_DEVICE);
  const [docks, setDocks] = useState<Dock[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [phase, setPhase] = useState<DockActivationPhase>("idle");
  const [ranActions, setRanActions] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousDock = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      if (polling.current) clearInterval(polling.current);
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedState;
        if (saved.pebbleIdentifier) {
          setDevice((prev) => ({
            ...prev,
            id: saved.pebbleId ?? null,
            name: saved.pebbleId != null ? `Pebble ${saved.pebbleId}` : "Pebble",
            identifier: saved.pebbleIdentifier,
          }));
        }
        setDocks(saved.docks ?? []);
        setOnboarded(Boolean(saved.onboarded));
      }
    } catch {
      /* ignore corrupt local state */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: PersistedState = {
        pebbleId: device.id,
        pebbleIdentifier: device.identifier,
        onboarded,
        dockId: device.dock,
        docks,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage unavailable */
    }
  }, [hydrated, device.id, device.identifier, device.dock, onboarded, docks]);

  const log = useCallback((event: Omit<ActivityEvent, "id" | "at">) => {
    setActivity((prev) => [
      { ...event, id: `e${Math.random().toString(36).slice(2, 9)}`, at: Date.now() },
      ...prev,
    ]);
  }, []);

  const activeDock = useMemo(
    () => (device.dock == null ? null : (docks.find((d) => d.id === device.dock) ?? null)),
    [device.dock, docks],
  );

  const unconfiguredDockId =
    device.dock != null && !docks.some((d) => d.id === device.dock) ? device.dock : null;

  const runSequence = useCallback(
    (dock: Dock) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setPhase("detected");
      setRanActions(0);
      timers.current.push(setTimeout(() => setPhase("activating"), 700));
      dock.actions.forEach((_, i) => {
        timers.current.push(setTimeout(() => setRanActions(i + 1), 1100 + i * 420));
      });
      timers.current.push(
        setTimeout(() => {
          setPhase("active");
          log({ kind: "activated", title: dock.name, detail: "Workspace activated" });
        }, 1200 + dock.actions.length * 420),
      );
    },
    [log],
  );

  const applyDeviceState = useCallback(
    (next: DeviceState) => {
      setDevice((prev) => ({
        ...prev,
        ...next,
        name: next.name || prev.name,
        identifier: next.identifier || prev.identifier,
      }));

      const nextDock = next.dock;
      const oldDock = previousDock.current;
      previousDock.current = nextDock;

      if (oldDock === nextDock) return;

      if (nextDock == null) {
        timers.current.forEach(clearTimeout);
        setPhase("idle");
        setRanActions(0);
        if (oldDock != null) {
          const previous = docks.find((d) => d.id === oldDock);
          log({
            kind: "removed",
            title: "Pebble removed",
            detail: previous ? `${previous.name} disconnected` : "Dock removed",
          });
        }
        return;
      }

      const dock = docks.find((d) => d.id === nextDock);
      if (dock?.enabled) runSequence(dock);
      else setPhase("detected");
    },
    [docks, log, runSequence],
  );

  const refreshStatus = useCallback(async () => {
    if (!device.identifier) return;
    try {
      const next = await hardware.getStatus();
      applyDeviceState(next);
    } catch {
      setDevice((prev) => ({ ...prev, connected: false, dock: null, charging: false }));
    }
  }, [applyDeviceState, device.identifier]);

  useEffect(() => {
    if (!hydrated || !device.identifier) return;

    void refreshStatus();
    polling.current = setInterval(() => void refreshStatus(), 1000);

    return () => {
      if (polling.current) {
        clearInterval(polling.current);
        polling.current = null;
      }
    };
  }, [hydrated, device.identifier, refreshStatus]);

  const discoverPebbles = useCallback(async () => hardware.scanPebbles(), []);

  const pairPebble = useCallback(
    async (pebble: NearbyPebble) => {
      const next = await hardware.connectPebble(pebble);
      previousDock.current = next.dock;
      setDevice(next);
      setPhase(next.dock == null ? "idle" : "detected");
      setRanActions(0);
      log({
        kind: "connected",
        title: next.name,
        detail: "Bluetooth link established",
      });
    },
    [log],
  );

  const completeOnboarding = useCallback(() => setOnboarded(true), []);

  const forgetPebble = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setDevice(UNPAIRED_DEVICE);
    setDocks([]);
    setActivity([]);
    setPhase("idle");
    setRanActions(0);
    setOnboarded(false);
    previousDock.current = null;
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const saveDock: PebbleContextValue["saveDock"] = useCallback(
    ({ id, name, actions }) => {
      setDocks((prev) => {
        const exists = prev.some((d) => d.id === id);
        if (exists) return prev.map((d) => (d.id === id ? { ...d, name, actions } : d));
        return [...prev, { id, name, actions, enabled: true, createdAt: Date.now() }];
      });
      log({ kind: "configured", title: name, detail: "Dock configured" });
      if (device.dock === id) {
        setPhase("active");
        setRanActions(99);
      }
    },
    [device.dock, log],
  );

  const updateDock: PebbleContextValue["updateDock"] = useCallback((id, patch) => {
    setDocks((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const removeDock = useCallback((id: number) => {
    setDocks((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const setDeviceConnected = useCallback(
    (connected: boolean) => {
      setDevice((prev) => ({ ...prev, connected, dock: connected ? prev.dock : null }));
      log(
        connected
          ? { kind: "connected", title: "Pebble connected", detail: "Bluetooth link established" }
          : { kind: "disconnected", title: "Pebble disconnected", detail: "Out of range" },
      );
    },
    [log],
  );

  const placeOnDock = useCallback((id: number | null) => {
    // Kept for the UI API, but real dock state is driven by the hardware status.
    if (id == null) {
      previousDock.current = null;
      setDevice((prev) => ({ ...prev, dock: null, charging: false }));
      return;
    }
    setDevice((prev) => ({ ...prev, dock: id, charging: true }));
  }, []);

  const detectDockPlacement = useCallback(async () => {
    if (!device.identifier) return null;

    try {
      const next = await hardware.getStatus();
      applyDeviceState(next);
      return next.dock;
    } catch {
      return null;
    }
  }, [applyDeviceState, device.identifier]);

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
      discoverPebbles,
      pairPebble,
      completeOnboarding,
      forgetPebble,
      getDock: (id: number) => docks.find((d) => d.id === id),
      saveDock,
      updateDock,
      removeDock,
      setDeviceConnected,
      placeOnDock,
      detectDockPlacement,
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
      discoverPebbles,
      pairPebble,
      completeOnboarding,
      forgetPebble,
      saveDock,
      updateDock,
      removeDock,
      setDeviceConnected,
      placeOnDock,
      detectDockPlacement,
    ],
  );

  return <PebbleContext.Provider value={value}>{children}</PebbleContext.Provider>;
}

export function usePebble() {
  const ctx = useContext(PebbleContext);
  if (!ctx) throw new Error("usePebble must be used inside PebbleProvider");
  return ctx;
}
