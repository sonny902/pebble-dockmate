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

/* ------------------------------------------------------------------ *
 * Mock hardware layer.
 *
 * The physical Pebble drives everything: it is discovered over Bluetooth,
 * paired once, and from then on it reports the dock it is resting on.
 * Everything below the `PebbleProvider` boundary is replaceable with a real
 * Bluetooth adapter that emits the same DeviceState.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = "pebble.state.v1";

/** Pebbles the app "sees" while scanning. Their IDs are printed on the box. */
const NEARBY_PEBBLES: NearbyPebble[] = [
  { id: 3020, rssi: "Nearby" },
  { id: 1847, rssi: "Nearby" },
];

/** The first dock a brand-new user places their Pebble on. */
const FIRST_DOCK_ID = 3015;

const UNPAIRED_DEVICE: DeviceState = {
  id: null,
  connected: false,
  battery: 96,
  charging: false,
  dock: null,
  name: "Pebble",
  firmware: "1.4.2",
  identifier: "—",
  signal: "strong",
};

export type DockActivationPhase = "idle" | "detected" | "activating" | "active";

type PersistedState = {
  pebbleId: number | null;
  onboarded: boolean;
  /** Last dock the Pebble reported; the hardware re-reports it on connect. */
  dockId: number | null;
  docks: Dock[];
};

type PebbleContextValue = {
  /** False during SSR / first paint, before local state is restored. */
  hydrated: boolean;
  /** True once the user has paired a Pebble and finished first dock setup. */
  onboarded: boolean;
  device: DeviceState;
  docks: Dock[];
  activity: ActivityEvent[];
  activeDock: Dock | null;
  /** Dock reported by hardware that has no configuration yet. */
  unconfiguredDockId: number | null;
  phase: DockActivationPhase;
  /** Index of actions already "run" during the activation sequence. */
  ranActions: number;
  /** Simulated Bluetooth scan for nearby Pebbles. */
  discoverPebbles: () => NearbyPebble[];
  pairPebble: (id: number) => void;
  completeOnboarding: () => void;
  forgetPebble: () => void;
  getDock: (id: number) => Dock | undefined;
  saveDock: (dock: { id: number; name: string; actions: DockAction[] }) => void;
  updateDock: (id: number, patch: Partial<Omit<Dock, "id">>) => void;
  removeDock: (id: number) => void;
  setDeviceConnected: (connected: boolean) => void;
  placeOnDock: (id: number | null) => void;
  /**
   * The Pebble reports the dock it has been placed on, read through its
   * pogo-pin connection. May be a dock that is already configured.
   */
  detectDockPlacement: () => number;
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

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  /* restore ------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedState;
        if (saved.pebbleId != null) {
          setDevice((prev) => ({
            ...prev,
            id: saved.pebbleId,
            name: `Pebble ${saved.pebbleId}`,
            identifier: `PBL-${saved.pebbleId}`,
            connected: true,
            charging: saved.dockId != null,
            dock: saved.dockId ?? null,
          }));
        }
        setDocks(saved.docks ?? []);
        setOnboarded(Boolean(saved.onboarded));
        if (saved.dockId != null && (saved.docks ?? []).some((d) => d.id === saved.dockId)) {
          setPhase("active");
          setRanActions(99);
        }
      }
    } catch {
      /* ignore corrupt local state */
    }
    setHydrated(true);
  }, []);

  /* persist ------------------------------------------------------- */
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: PersistedState = {
        pebbleId: device.id,
        onboarded,
        dockId: device.dock,
        docks,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage unavailable */
    }
  }, [hydrated, device.id, device.dock, onboarded, docks]);

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
        setTimeout(
          () => {
            setPhase("active");
            log({ kind: "activated", title: dock.name, detail: "Workspace activated" });
          },
          1200 + dock.actions.length * 420,
        ),
      );
    },
    [log],
  );

  const placeOnDock = useCallback(
    (id: number | null) => {
      setDevice((prev) => ({
        ...prev,
        dock: id,
        charging: id != null,
        connected: id != null ? true : prev.connected,
      }));
      if (id == null) {
        timers.current.forEach(clearTimeout);
        setPhase("idle");
        setRanActions(0);
        const previous = docks.find((d) => d.id === device.dock);
        log({
          kind: "removed",
          title: "Pebble removed",
          detail: previous ? `${previous.name} disconnected` : "No dock",
        });
        return;
      }
      const dock = docks.find((d) => d.id === id);
      if (dock && dock.enabled) runSequence(dock);
      else setPhase("detected");
    },
    [device.dock, docks, log, runSequence],
  );

  const saveDock: PebbleContextValue["saveDock"] = useCallback(
    ({ id, name, actions }) => {
      setDocks((prev) => {
        const exists = prev.some((d) => d.id === id);
        if (exists) return prev.map((d) => (d.id === id ? { ...d, name, actions } : d));
        return [...prev, { id, name, actions, enabled: true, createdAt: Date.now() }];
      });
      log({ kind: "configured", title: name, detail: "Dock configured" });
      // If the Pebble is resting on this dock, it is live immediately.
      setDevice((prev) => {
        if (prev.dock === id) {
          setPhase("active");
          setRanActions(99);
        }
        return prev;
      });
    },
    [log],
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

  const discoverPebbles = useCallback(() => NEARBY_PEBBLES, []);

  const pairPebble = useCallback(
    (id: number) => {
      setDevice((prev) => ({
        ...prev,
        id,
        name: `Pebble ${id}`,
        identifier: `PBL-${id}`,
        connected: true,
        dock: null,
      }));
      setPhase("idle");
      log({ kind: "connected", title: `Pebble ${id}`, detail: "Paired over Bluetooth" });
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
  }, []);

  const detectDockPlacement = useCallback(() => {
    // Already resting on a dock we know about: the hardware reports the same ID.
    if (device.dock != null && docks.some((d) => d.id === device.dock)) {
      setPhase("detected");
      return device.dock;
    }
    let id = docks.length === 0 ? FIRST_DOCK_ID : 1000 + Math.floor(Math.random() * 8999);
    while (docks.some((d) => d.id === id)) id = 1000 + Math.floor(Math.random() * 8999);
    setDevice((prev) => ({ ...prev, dock: id, connected: true, charging: true }));
    setPhase("detected");
    return id;
  }, [device.dock, docks]);

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
