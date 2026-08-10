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
import type { ActivityEvent, DeviceState, Dock, DockAction } from "./types";

/* ------------------------------------------------------------------ *
 * Mock hardware layer.
 * Everything below the `PebbleProvider` boundary is replaceable with a
 * real Bluetooth adapter that emits the same DeviceState.
 * ------------------------------------------------------------------ */

const INITIAL_DEVICE: DeviceState = {
  connected: true,
  battery: 96,
  charging: true,
  dock: 3015,
  name: "Pebble",
  firmware: "1.4.2",
  identifier: "PBL-9F42-1C08",
  signal: "strong",
};

const INITIAL_DOCKS: Dock[] = [
  {
    id: 3015,
    name: "Desk Dock",
    enabled: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    actions: [
      { id: "a1", type: "open_app", target: "Visual Studio Code" },
      { id: "a2", type: "open_app", target: "Spotify" },
    ],
  },
  {
    id: 4082,
    name: "Meeting Room",
    enabled: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    actions: [
      { id: "a3", type: "open_app", target: "Microsoft Teams" },
      { id: "a4", type: "open_app", target: "Notion" },
      { id: "a5", type: "open_app", target: "Slack" },
    ],
  },
  {
    id: 5127,
    name: "Car Dock",
    enabled: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    actions: [
      { id: "a6", type: "open_app", target: "Spotify" },
      { id: "a7", type: "open_app", target: "Google Chrome" },
    ],
  },
];

const startOfToday = new Date().setHours(0, 0, 0, 0);

const INITIAL_ACTIVITY: ActivityEvent[] = [
  {
    id: "e1",
    at: startOfToday + 12 * 3600e3 + 42 * 60e3,
    kind: "activated",
    title: "Desk Dock",
    detail: "Workspace activated",
  },
  {
    id: "e2",
    at: startOfToday + 12 * 3600e3 + 18 * 60e3,
    kind: "removed",
    title: "Pebble removed",
    detail: "Desk Dock disconnected",
  },
  {
    id: "e3",
    at: startOfToday + 9 * 3600e3 + 6 * 60e3,
    kind: "connected",
    title: "Pebble connected",
    detail: "Bluetooth link established",
  },
  {
    id: "e4",
    at: startOfToday - 6 * 3600e3 + 4 * 60e3,
    kind: "activated",
    title: "Car Dock",
    detail: "Workspace activated",
  },
  {
    id: "e5",
    at: startOfToday - 10 * 3600e3,
    kind: "removed",
    title: "Pebble removed",
    detail: "Car Dock disconnected",
  },
];

export type DockActivationPhase = "idle" | "detected" | "activating" | "active";

type PebbleContextValue = {
  device: DeviceState;
  docks: Dock[];
  activity: ActivityEvent[];
  activeDock: Dock | null;
  /** Dock reported by hardware that has no configuration yet. */
  unconfiguredDockId: number | null;
  phase: DockActivationPhase;
  /** Index of actions already "run" during the activation sequence. */
  ranActions: number;
  getDock: (id: number) => Dock | undefined;
  saveDock: (dock: { id: number; name: string; actions: DockAction[] }) => void;
  updateDock: (id: number, patch: Partial<Omit<Dock, "id">>) => void;
  removeDock: (id: number) => void;
  setDeviceConnected: (connected: boolean) => void;
  placeOnDock: (id: number | null) => void;
  /** Simulates a brand new, never-seen dock being detected during setup. */
  detectNewDock: () => number;
};

const PebbleContext = createContext<PebbleContextValue | null>(null);

let actionSeq = 100;
export function newActionId() {
  actionSeq += 1;
  return `a${actionSeq}`;
}

export function PebbleProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<DeviceState>(INITIAL_DEVICE);
  const [docks, setDocks] = useState<Dock[]>(INITIAL_DOCKS);
  const [activity, setActivity] = useState<ActivityEvent[]>(INITIAL_ACTIVITY);
  const [phase, setPhase] = useState<DockActivationPhase>("active");
  const [ranActions, setRanActions] = useState(99);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

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
      setDevice((prev) => ({ ...prev, dock: id, connected: id != null ? true : prev.connected }));
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

  const detectNewDock = useCallback(() => {
    let id = 1000 + Math.floor(Math.random() * 8999);
    while (docks.some((d) => d.id === id)) id += 1;
    setDevice((prev) => ({ ...prev, dock: id, connected: true }));
    setPhase("detected");
    return id;
  }, [docks]);

  const value = useMemo<PebbleContextValue>(
    () => ({
      device,
      docks,
      activity,
      activeDock,
      unconfiguredDockId,
      phase,
      ranActions,
      getDock: (id: number) => docks.find((d) => d.id === id),
      saveDock,
      updateDock,
      removeDock,
      setDeviceConnected,
      placeOnDock,
      detectNewDock,
    }),
    [
      device,
      docks,
      activity,
      activeDock,
      unconfiguredDockId,
      phase,
      ranActions,
      saveDock,
      updateDock,
      removeDock,
      setDeviceConnected,
      placeOnDock,
      detectNewDock,
    ],
  );

  return <PebbleContext.Provider value={value}>{children}</PebbleContext.Provider>;
}

export function usePebble() {
  const ctx = useContext(PebbleContext);
  if (!ctx) throw new Error("usePebble must be used inside PebbleProvider");
  return ctx;
}
