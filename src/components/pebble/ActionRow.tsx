import { GripVertical, X, Check } from "lucide-react";
import { ACTION_ICONS, actionLabel } from "@/lib/pebble/catalog";
import type { DockAction } from "@/lib/pebble/types";
import { AppIcon } from "./AppIcon";
import { cn } from "@/lib/utils";

/**
 * A single configured action. Rendering is driven entirely by `action.type`,
 * so new action types only need a catalog entry + icon.
 */
export function ActionRow({
  action,
  onRemove,
  reorderable = false,
  done = false,
  index,
  className,
}: {
  action: DockAction;
  onRemove?: (() => void) | undefined;
  reorderable?: boolean | undefined;
  done?: boolean | undefined;
  index?: number | undefined;
  className?: string | undefined;
}) {
  const Icon = ACTION_ICONS[action.type];
  return (
    <div
      className={cn(
        "animate-rise grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3 sm:px-5",
        className,
      )}
      style={index != null ? { animationDelay: `${index * 45}ms` } : undefined}
    >
      <div className="flex shrink-0 items-center gap-2">
        {reorderable ? (
          <GripVertical className="text-muted-foreground/40 hidden h-4 w-4 cursor-grab sm:block" />
        ) : null}
        {action.type === "open_app" ? (
          <AppIcon name={action.target} size="md" />
        ) : (
          <span className="bg-muted flex h-9 w-9 items-center justify-center rounded-[0.65rem]">
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-medium">{actionLabel(action)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {done ? <Check className="text-success animate-check h-4 w-4" /> : null}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${actionLabel(action)}`}
            className="press hover:bg-muted hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
