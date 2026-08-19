import { cn } from "@/lib/utils";

type Tone = "success" | "muted" | "warning" | "accent";

const toneMap: Record<Tone, string> = {
  success: "bg-success",
  muted: "bg-muted-foreground/50",
  warning: "bg-warning",
  accent: "bg-primary",
};

export function StatusIndicator({
  tone = "muted",
  pulse = false,
  label,
  className,
}: {
  tone?: Tone | undefined;
  pulse?: boolean | undefined;
  label?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative flex h-2 w-2 shrink-0">
        {pulse ? (
          <span
            className={cn("animate-halo absolute inset-0 rounded-full opacity-60", toneMap[tone])}
          />
        ) : null}
        <span className={cn("relative h-2 w-2 rounded-full", toneMap[tone])} />
      </span>
      {label ? <span className="text-[0.8125rem] font-medium tracking-tight">{label}</span> : null}
    </span>
  );
}
