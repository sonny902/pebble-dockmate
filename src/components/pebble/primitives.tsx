import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <header
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 pb-1 sm:flex sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-balance-tight truncate text-[1.75rem] font-semibold sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-[0.9375rem] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title?: string | undefined;
  description?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={cn("space-y-2.5", className)}>
      {title ? (
        <div className="px-1">
          <h2 className="text-[0.8125rem] font-medium tracking-wide text-muted-foreground uppercase">
            {title}
          </h2>
        </div>
      ) : null}
      {children}
      {description ? (
        <p className="px-1 text-[0.8125rem] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </section>
  );
}

/** A grouped list container with hairline dividers — the core surface of Pebble. */
export function Group({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return <div className={cn("surface hairline-y overflow-hidden", className)}>{children}</div>;
}

export function Row({
  icon,
  title,
  subtitle,
  trailing,
  onClick,
  className,
  as = "div",
}: {
  icon?: ReactNode | undefined;
  title: ReactNode;
  subtitle?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
  as?: "div" | "button" | undefined;
}) {
  const Comp = onClick ? "button" : as;
  return (
    <Comp
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3.5 text-left sm:px-5",
        onClick && "press hover:bg-accent/60",
        className,
      )}
    >
      {icon ? <span className="flex shrink-0 items-center">{icon}</span> : <span />}
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] font-medium">{title}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-[0.8125rem] text-muted-foreground">
            {subtitle}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-2 text-muted-foreground">{trailing}</span>
    </Comp>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="animate-settle flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="bg-muted text-muted-foreground mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
        {icon}
      </div>
      <h3 className="text-balance-tight text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-xs text-sm leading-relaxed text-pretty">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
