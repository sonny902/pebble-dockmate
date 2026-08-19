import { useEffect, useState } from "react";
import { isNativeRuntime } from "@/lib/pebble/hardware";
import { PREVIEW_DOCKS, preview } from "@/lib/pebble/preview";
import { cn } from "@/lib/utils";

/**
 * Only rendered in a plain browser, where no Bluetooth adapter exists. It makes
 * the stand-in hardware explicit instead of silently faking real readings.
 */
export function PreviewBar() {
  const [native, setNative] = useState(true);
  const [dock, setDock] = useState(0);

  useEffect(() => {
    setNative(isNativeRuntime());
    setDock(preview.dock);
    return preview.subscribe(() => setDock(preview.dock));
  }, []);

  if (native) return null;

  return (
    <div className="border-hairline bg-elevated/90 fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 shadow-[var(--shadow-2)] backdrop-blur lg:bottom-4">
      <span className="text-muted-foreground pl-1 text-[0.6875rem] font-semibold tracking-wide uppercase">
        Preview
      </span>
      <button
        type="button"
        onClick={() => preview.setDock(0)}
        className={cn(
          "press rounded-full px-2.5 py-1 text-[0.75rem] font-medium",
          dock === 0 ? "bg-primary text-primary-foreground" : "hover:bg-accent",
        )}
      >
        Off dock
      </button>
      {PREVIEW_DOCKS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => preview.setDock(id)}
          className={cn(
            "press rounded-full px-2.5 py-1 text-[0.75rem] font-medium",
            dock === id ? "bg-primary text-primary-foreground" : "hover:bg-accent",
          )}
        >
          {id}
        </button>
      ))}
    </div>
  );
}
