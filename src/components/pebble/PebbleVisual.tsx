import { cn } from "@/lib/utils";

/**
 * An original, abstract rendering of the Pebble hardware:
 * a soft rounded stone with a light-catching sheen, sitting on a dock plate.
 */
export function PebbleVisual({
  state = "ready",
  size = "md",
  className,
}: {
  state?: "ready" | "docked" | "offline" | "searching" | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}) {
  const dims = {
    sm: "h-16 w-16",
    md: "h-28 w-28",
    lg: "h-36 w-36",
  }[size];

  const offline = state === "offline";

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* halo */}
      {state === "docked" || state === "searching" ? (
        <span
          className={cn(
            "bg-primary/12 pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[62%] rounded-full [will-change:transform,opacity]",
            size === "lg" ? "h-44 w-44" : size === "md" ? "h-36 w-36" : "h-20 w-20",
            state === "searching" ? "animate-halo" : "animate-pulse",
          )}
        />
      ) : null}

      <div
        className={cn(
          "relative isolate overflow-hidden rounded-[42%] transition-all duration-700",
          dims,
          state === "ready" && "animate-breathe",
          offline ? "opacity-45 saturate-0" : "",
        )}
        style={{
          background:
            "radial-gradient(120% 100% at 30% 20%, color-mix(in oklab, var(--color-primary) 26%, var(--color-elevated)) 0%, color-mix(in oklab, var(--color-primary) 62%, var(--color-foreground) 8%) 58%, color-mix(in oklab, var(--color-foreground) 65%, var(--color-primary)) 100%)",
          boxShadow: state === "docked" ? "var(--shadow-3)" : "var(--shadow-2)",
        }}
      >
        <span
          className="animate-sheen pointer-events-none absolute -inset-x-6 top-0 h-1/2 rounded-[50%] [will-change:transform,opacity]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.10) 55%, rgba(255,255,255,0) 100%)",
          }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-[42%] ring-1 ring-white/15 ring-inset"
          aria-hidden
        />
      </div>

      {/* dock plate */}
      <div
        className={cn(
          "mt-4 rounded-full transition-all duration-500",
          size === "lg" ? "h-2.5 w-32" : size === "md" ? "h-2 w-24" : "h-1.5 w-14",
          state === "docked" ? "bg-primary/35" : "bg-foreground/8",
        )}
      />
      <div
        className={cn(
          "mt-1 rounded-full blur-md transition-all duration-500",
          size === "lg" ? "h-3 w-28" : "h-2.5 w-20",
          state === "docked" ? "bg-primary/25" : "bg-foreground/6",
        )}
      />
    </div>
  );
}
