import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { PebbleVisual } from "./PebbleVisual";
import { DockSetup } from "./DockSetup";
import { Button } from "@/components/ui/button";
import { usePebble } from "@/lib/pebble/store";
import type { NearbyPebble } from "@/lib/pebble/types";
import { cn } from "@/lib/utils";

type Stage = "scanning" | "found" | "connected" | "dock";

/**
 * First-launch experience. The physical Pebble leads: discover it over
 * Bluetooth, pair it, then let it report the first dock.
 */
export function Onboarding() {
  const { discoverPebbles, pairPebble, completeOnboarding } = usePebble();
  const [stage, setStage] = useState<Stage>("scanning");
  const [found, setFound] = useState<NearbyPebble[]>([]);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (stage !== "scanning") return;
    const t = setTimeout(() => {
      setFound(discoverPebbles());
      setStage("found");
    }, 2400);
    return () => clearTimeout(t);
  }, [stage, discoverPebbles]);

  const select = (id: number) => {
    setSelected(id);
    pairPebble(id);
    setStage("connected");
    setTimeout(() => setStage("dock"), 1800);
  };

  if (stage === "dock") {
    return (
      <div className="bg-background min-h-screen">
        <DockSetup onFinish={completeOnboarding} onExit={completeOnboarding} />
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="animate-rise w-full max-w-md">
        {stage === "connected" && selected != null ? (
          <div className="flex flex-col items-center text-center">
            <PebbleVisual size="lg" state="ready" />
            <div className="bg-success-soft text-success animate-check mt-8 flex h-12 w-12 items-center justify-center rounded-full">
              <Check className="h-6 w-6" strokeWidth={2.4} />
            </div>
            <h1 className="text-balance-tight mt-6 text-2xl font-semibold">Pebble {selected}</h1>
            <p className="text-success mt-1.5 text-[0.9375rem] font-medium">Connected</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="relative flex items-center justify-center">
                {stage === "scanning" ? <ScanRings /> : null}
                <PebbleVisual size="lg" state={stage === "scanning" ? "searching" : "ready"} />
              </div>
              <h1 className="text-balance-tight mt-10 text-[1.75rem] font-semibold">
                Let’s connect your Pebble
              </h1>
              <p className="text-muted-foreground mt-2.5 text-[0.9375rem] text-pretty">
                Turn on your Pebble and keep it nearby.
              </p>
            </div>

            <div className="mt-9">
              {stage === "scanning" ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                  <span className="border-primary/30 border-t-primary h-3.5 w-3.5 animate-spin rounded-full border-2" />
                  Searching for nearby Pebbles…
                </div>
              ) : (
                <div className="animate-rise">
                  <p className="text-muted-foreground mb-2.5 px-1 text-[0.8125rem] font-medium tracking-wide uppercase">
                    Nearby devices
                  </p>
                  <div className="surface divide-y divide-[var(--color-hairline)] overflow-hidden">
                    {found.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => select(p.id)}
                        className="press hover:bg-accent/60 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-5 py-4 text-left"
                      >
                        <span className="bg-muted flex h-10 w-10 items-center justify-center rounded-[38%]">
                          <span className="bg-foreground/30 h-4 w-4 rounded-[40%]" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.9375rem] font-medium">
                            Pebble {p.id}
                          </span>
                          <span className="text-muted-foreground block text-[0.8125rem]">
                            {p.rssi}
                          </span>
                        </span>
                        <ChevronRight className="text-muted-foreground/60 h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground mt-4 text-center text-[0.8125rem] text-pretty">
                    Your Pebble’s number is printed inside the box.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-3 h-11 w-full rounded-[var(--radius-xl)]"
                    onClick={() => {
                      setFound([]);
                      setStage("scanning");
                    }}
                  >
                    Scan again
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ScanRings() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            "border-primary/20 absolute rounded-full border",
            i === 0 ? "h-48 w-48" : i === 1 ? "h-64 w-64" : "h-80 w-80",
          )}
          style={{ animation: `halo 3.2s ease-out ${i * 1}s infinite` }}
        />
      ))}
    </span>
  );
}
