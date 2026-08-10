import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronRight, Plus, Sparkles } from "lucide-react";
import { ActionPicker } from "./ActionPicker";
import { ActionRow } from "./ActionRow";
import { PebbleVisual } from "./PebbleVisual";
import { EmptyState, Group } from "./primitives";
import { Button } from "@/components/ui/button";
import { DOCK_NAME_SUGGESTIONS, actionLabel } from "@/lib/pebble/catalog";
import { usePebble } from "@/lib/pebble/store";
import type { DockAction } from "@/lib/pebble/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = ["Detect", "Name", "Actions", "Review"];

export function DockSetup({ existingDockId }: { existingDockId?: number | undefined }) {
  const navigate = useNavigate();
  const { detectNewDock, saveDock, getDock, device } = usePebble();

  const existing = existingDockId != null ? getDock(existingDockId) : undefined;

  const [step, setStep] = useState<Step>(existing ? 2 : 0);
  const [dockId, setDockId] = useState<number | null>(existing?.id ?? null);
  const [detecting, setDetecting] = useState(!existing);
  const [name, setName] = useState(existing?.name ?? "");
  const [actions, setActions] = useState<DockAction[]>(existing?.actions ?? []);

  // Simulated hardware detection while the user places the Pebble.
  useEffect(() => {
    if (!detecting) return;
    const t = setTimeout(() => {
      setDockId(detectNewDock());
      setDetecting(false);
    }, 2600);
    return () => clearTimeout(t);
  }, [detecting, detectNewDock]);

  const canContinue = useMemo(() => {
    if (step === 0) return dockId != null;
    if (step === 1) return name.trim().length > 0;
    return true;
  }, [step, dockId, name]);

  const handleSave = () => {
    if (dockId == null) return;
    saveDock({ id: dockId, name: name.trim(), actions });
    setStep(4);
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pt-6 pb-10 sm:px-6 lg:pt-10">
      {/* header */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
        <button
          type="button"
          onClick={() => (step === 0 || step === 4 ? navigate({ to: "/docks" }) : setStep((s) => (s - 1) as Step))}
          className="press hover:bg-accent -ml-2 flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex justify-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <span
              key={label}
              className={cn(
                "h-1 rounded-full transition-all duration-500",
                i <= Math.min(step, 3) ? "bg-primary w-7" : "bg-muted w-4",
              )}
            />
          ))}
        </div>
        <span className="w-10" />
      </div>

      <div key={step} className="animate-rise mt-8">
        {step === 0 ? (
          <StepDetect detecting={detecting} dockId={dockId} onContinue={() => setStep(1)} />
        ) : null}

        {step === 1 ? (
          <StepName name={name} setName={setName} onContinue={() => setStep(2)} canContinue={canContinue} />
        ) : null}

        {step === 2 ? (
          <StepActions
            name={name}
            actions={actions}
            setActions={setActions}
            onContinue={() => setStep(3)}
          />
        ) : null}

        {step === 3 ? (
          <StepReview
            name={name}
            actions={actions}
            onEdit={() => setStep(2)}
            onSave={handleSave}
            dockId={dockId}
          />
        ) : null}

        {step === 4 ? <StepDone name={name} /> : null}
      </div>

      {device.connected ? null : (
        <p className="text-muted-foreground mt-6 text-center text-[0.8125rem]">
          Pebble isn’t nearby — setup will continue when it reconnects.
        </p>
      )}
    </div>
  );
}

function Title({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  return (
    <div className="mb-7 text-center">
      <h1 className="text-balance-tight text-2xl font-semibold">{title}</h1>
      {subtitle ? <p className="text-muted-foreground mt-2 text-[0.9375rem]">{subtitle}</p> : null}
    </div>
  );
}

function StepDetect({
  detecting,
  dockId,
  onContinue,
}: {
  detecting: boolean;
  dockId: number | null;
  onContinue: () => void;
}) {
  const [showId, setShowId] = useState(false);
  return (
    <div>
      <Title
        title={detecting ? "Set up your dock" : "Dock detected"}
        subtitle={
          detecting
            ? "Place Pebble on the dock to continue."
            : "This dock is new. Let’s make it yours."
        }
      />
      <div className="surface flex flex-col items-center px-6 py-12">
        <PebbleVisual size="lg" state={detecting ? "searching" : "docked"} />
        <div className="mt-8 h-6">
          {detecting ? (
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="border-primary/30 border-t-primary h-3.5 w-3.5 animate-spin rounded-full border-2" />
              Listening for a dock…
            </div>
          ) : (
            <div className="text-success animate-check flex items-center gap-2 text-sm font-medium">
              <Check className="h-4 w-4" /> Dock detected
            </div>
          )}
        </div>
      </div>

      <Button
        size="lg"
        className="mt-6 h-12 w-full rounded-[var(--radius-xl)] text-[0.9375rem]"
        disabled={detecting}
        onClick={onContinue}
      >
        Continue
      </Button>

      {!detecting && dockId != null ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowId((s) => !s)}
            className="text-muted-foreground hover:text-foreground text-[0.8125rem]"
          >
            {showId ? `Identifier · Dock ${dockId}` : "Details"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StepName({
  name,
  setName,
  onContinue,
  canContinue,
}: {
  name: string;
  setName: (v: string) => void;
  onContinue: () => void;
  canContinue: boolean;
}) {
  return (
    <div>
      <Title title="Name your dock" subtitle="Choose something you’ll recognise instantly." />
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canContinue) onContinue();
        }}
        placeholder="Desk Dock"
        aria-label="Dock name"
        className="bg-elevated border-hairline focus:ring-ring/40 h-14 w-full rounded-[var(--radius-xl)] border px-5 text-center text-lg font-medium shadow-[var(--shadow-1)] outline-none transition focus:ring-2"
      />
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {DOCK_NAME_SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setName(s === "Desk" ? "Desk Dock" : s)}
            className="press border-hairline bg-elevated hover:bg-accent rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium"
          >
            {s}
          </button>
        ))}
      </div>
      <Button
        size="lg"
        className="mt-8 h-12 w-full rounded-[var(--radius-xl)] text-[0.9375rem]"
        disabled={!canContinue}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}

function StepActions({
  name,
  actions,
  setActions,
  onContinue,
}: {
  name: string;
  actions: DockAction[];
  setActions: (a: DockAction[]) => void;
  onContinue: () => void;
}) {
  return (
    <div>
      <Title
        title="What should happen here?"
        subtitle={`Choose what runs when Pebble is placed on ${name || "this dock"}.`}
      />
      <ActionPicker selected={actions} onChange={setActions} />
      <div className="bg-background/80 sticky bottom-20 mt-5 backdrop-blur lg:bottom-4">
        <Button
          size="lg"
          className="h-12 w-full rounded-[var(--radius-xl)] text-[0.9375rem]"
          onClick={onContinue}
        >
          {actions.length === 0
            ? "Skip for now"
            : `Continue with ${actions.length} action${actions.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}

function StepReview({
  name,
  actions,
  onEdit,
  onSave,
  dockId,
}: {
  name: string;
  actions: DockAction[];
  onEdit: () => void;
  onSave: () => void;
  dockId: number | null;
}) {
  return (
    <div>
      <Title title={name || "New dock"} subtitle="Review before saving." />
      {actions.length === 0 ? (
        <Group>
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Make this dock useful."
            description="Choose what should happen when Pebble arrives."
            action={
              <Button variant="secondary" onClick={onEdit} className="rounded-full">
                <Plus className="h-4 w-4" /> Add action
              </Button>
            }
          />
        </Group>
      ) : (
        <>
          <p className="text-muted-foreground mb-2.5 px-1 text-[0.8125rem] font-medium tracking-wide uppercase">
            When Pebble is placed here
          </p>
          <Group>
            {actions.map((a, i) => (
              <ActionRow key={a.id} action={a} index={i} />
            ))}
            <button
              type="button"
              onClick={onEdit}
              className="press text-primary hover:bg-accent/60 flex w-full items-center gap-2 px-5 py-3.5 text-[0.9375rem] font-medium"
            >
              <Plus className="h-4 w-4" /> Add action
            </button>
          </Group>
        </>
      )}

      <Button
        size="lg"
        className="mt-7 h-12 w-full rounded-[var(--radius-xl)] text-[0.9375rem]"
        onClick={() => {
          onSave();
          toast.success(`${name} saved`, { description: `${actions.length} action${actions.length === 1 ? "" : "s"} configured` });
        }}
      >
        Save Dock
      </Button>
      {dockId != null ? (
        <p className="text-muted-foreground/70 mt-3 text-center text-[0.75rem]">
          Identifier · Dock {dockId}
        </p>
      ) : null}
    </div>
  );
}

function StepDone({ name }: { name: string }) {
  const navigate = useNavigate();
  return (
    <div className="animate-settle flex flex-col items-center pt-6 text-center">
      <div className="bg-success-soft text-success flex h-16 w-16 items-center justify-center rounded-full">
        <Check className="animate-check h-8 w-8" strokeWidth={2.4} />
      </div>
      <h1 className="text-balance-tight mt-6 text-2xl font-semibold">{name} is ready</h1>
      <p className="text-muted-foreground mt-2 max-w-xs text-[0.9375rem] text-pretty">
        Place Pebble here anytime to activate your workspace.
      </p>
      <div className="mt-8 flex w-full flex-col gap-2.5">
        <Button
          size="lg"
          className="h-12 w-full rounded-[var(--radius-xl)]"
          onClick={() => navigate({ to: "/docks" })}
        >
          Done
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="h-12 w-full rounded-[var(--radius-xl)]"
          onClick={() => navigate({ to: "/docks/new" })}
        >
          Set up another dock <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export { actionLabel };
