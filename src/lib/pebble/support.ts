import { useEffect, useState } from "react";
import { hardware } from "./hardware";
import type { ActionType } from "./types";

let cached: Set<string> | null = null;
let inFlight: Promise<Set<string>> | null = null;

async function load(): Promise<Set<string>> {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = hardware
      .supportedActions()
      .then((list) => {
        cached = new Set(list);
        return cached;
      })
      .catch(() => new Set<string>())
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/**
 * Action types the current machine can actually perform, reported by the
 * native layer. Unknown types are rendered as explicitly unsupported.
 */
export function useActionSupport() {
  const [supported, setSupported] = useState<Set<string>>(() => cached ?? new Set());
  const [ready, setReady] = useState(cached != null);

  useEffect(() => {
    let cancelled = false;
    void load().then((set) => {
      if (cancelled) return;
      setSupported(new Set(set));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    ready,
    isSupported: (type: ActionType) => supported.has(type),
  };
}
