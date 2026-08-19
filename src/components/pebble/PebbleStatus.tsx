import { BatteryCharging, Battery, Bluetooth, BluetoothOff } from "lucide-react";
import { PebbleVisual } from "./PebbleVisual";
import { StatusIndicator } from "./StatusIndicator";
import type { DeviceState, Dock } from "@/lib/pebble/types";
import { cn } from "@/lib/utils";

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode | undefined;
}) {
  return (
    <div className="min-w-0 flex-1 px-4 py-3.5 text-center sm:py-4">
      <div className="text-muted-foreground text-[0.75rem] font-medium tracking-wide uppercase">
        {label}
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5 text-[0.9375rem] font-semibold">
        {icon}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

export function PebbleStatus({
  device,
  dock,
  className,
}: {
  device: DeviceState;
  dock: Dock | null;
  className?: string | undefined;
}) {
  const docked = device.connected && dock != null;

  const headline = !device.connected ? device.name : docked ? dock.name : device.name;

  const sub = !device.connected ? "Bring it closer to reconnect" : docked ? "Active" : "Ready";

  return (
    <div
      className={cn(
        "surface animate-settle relative overflow-hidden rounded-[var(--radius-3xl)] px-6 pt-10 pb-0",
        className,
      )}
    >
      <div className="flex flex-col items-center">
        <PebbleVisual
          size="lg"
          state={!device.connected ? "offline" : docked ? "docked" : "ready"}
        />

        <div className="mt-7 flex flex-col items-center gap-2 text-center">
          <StatusIndicator
            tone={device.connected ? "success" : "muted"}
            pulse={docked}
            label={device.connected ? "Connected" : "Not connected"}
            className="text-muted-foreground"
          />
          <h2 className="text-balance-tight text-2xl font-semibold transition-all duration-500">
            {headline}
          </h2>
          <p
            className={cn("text-sm font-medium", docked ? "text-primary" : "text-muted-foreground")}
          >
            {sub}
          </p>
        </div>
      </div>

      <div className="border-hairline mt-8 flex divide-x divide-[var(--color-hairline)] border-t">
        <Metric
          label="Battery"
          value={device.connected ? `${device.battery}%` : "—"}
          icon={
            device.charging ? (
              <BatteryCharging className="text-success h-4 w-4" />
            ) : (
              <Battery className="text-muted-foreground h-4 w-4" />
            )
          }
        />
        <Metric label="Charging" value={device.charging && device.connected ? "Yes" : "No"} />
        <Metric
          label="Signal"
          value={device.connected ? capitalize(device.signal) : "None"}
          icon={
            device.connected ? (
              <Bluetooth className="text-muted-foreground h-4 w-4" />
            ) : (
              <BluetoothOff className="text-muted-foreground h-4 w-4" />
            )
          }
        />
      </div>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
