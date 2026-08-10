import { appEntry } from "@/lib/pebble/catalog";
import { cn } from "@/lib/utils";

export function AppIcon({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
}) {
  const entry = appEntry(name);
  const dims = {
    sm: "h-7 w-7 text-[0.5625rem] rounded-[0.5rem]",
    md: "h-9 w-9 text-[0.6875rem] rounded-[0.65rem]",
    lg: "h-11 w-11 text-xs rounded-xl",
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center font-semibold tracking-tight text-white/95 ring-1 ring-black/5 ring-inset",
        dims,
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(145deg, ${entry.tint[0]}, ${entry.tint[1]})`,
        boxShadow: "var(--shadow-1)",
      }}
    >
      {entry.mark}
    </span>
  );
}
