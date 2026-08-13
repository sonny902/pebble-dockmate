import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { ActionPicker } from "./ActionPicker";
import { ActionRow } from "./ActionRow";
import { PebbleVisual } from "./PebbleVisual";
import { EmptyState, Group } from "./primitives";
import { Button } from "@/components/ui/button";
import { DOCK_NAME_SUGGESTIONS, actionLabel } from "@/lib/pebble/catalog";
import { usePebble } from "@/lib/pebble/store";
import { hardware } from "@/lib/pebble/hardware";
import type { Dock, DockAction } from "@/lib/pebble/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Step = "waiting" | "duplicate" | "name" | "actions" | "done";
const PROGRESS: Step[] = ["waiting", "name", "actions", "done"];

export function DockSetup({ onFinish, onExit }: { onFinish?: (() => void) | undefined; onExit?: (() => void) | undefined }) {
  const navigate = useNavigate();
  const { saveDock, getDock, device, docks } = usePebble();
  const [first] = useState(() => docks.length === 0);
  const [step, setStep] = useState<Step>("waiting");
  const [dockId, setDockId] = useState<number | null>(null);
  const [existing, setExisting] = useState<Dock | null>(null);
  const [name, setName] = useState("");
  const [actions, setActions] = useState<DockAction[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step !== "name") return;
    const input = nameInputRef.current;
    if (!input) return;
    const frame = window.requestAnimationFrame(() => {
      input.focus({ preventScroll: true });
      input.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let inFlight = false;

    const detect = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const status = await Promise.race([
          hardware.getStatus(),
          new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error("status timeout")), 2000)),
        ]);
        if (cancelled) return;

        // If the Pebble reports any non-zero dock ID, that is the dock currently
        // under it. Do not compare it with the value from screen entry: during
        // first-run the Pebble can already be sitting on the dock when setup opens.
        const currentDock = status.dock === 0 ? null : status.dock;
        if (currentDock != null) {
          const found = getDock(currentDock) ?? null;
          setDockId(currentDock);
          setExisting(found);
          setStep(found ? "duplicate" : "name");
          return;
        }
      } catch {
        // Bluetooth/status reads can briefly fail while the Pebble is reconnecting.
      } finally {
        inFlight = false;
        if (!cancelled) timer = window.setTimeout(() => void detect(), 1000);
      }
    };

    void detect();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [getDock]);

  const goBack = () => {
    if (step === "waiting" || step === "duplicate" || step === "done") {
      if (onExit) onExit();
      else navigate({ to: "/docks" });
      return;
    }
    setStep(step === "actions" ? "name" : "waiting");
  };

  const finish = () => {
    if (onFinish) onFinish();
    else navigate({ to: "/docks" });
  };

  const handleSave = () => {
    if (dockId == null || !name.trim()) return;
    saveDock({ id: dockId, name: name.trim(), actions });
    toast.success(`${name.trim()} saved`, { description: `${actions.length} action${actions.length === 1 ? "" : "s"} configured` });
    setStep("done");
  };

  const progressIndex = Math.max(0, PROGRESS.indexOf(step === "duplicate" ? "waiting" : step));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-xl px-4 pt-6 pb-10 sm:px-6 lg:pt-10">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
          <button
            type="button"
            onPointerDown={goBack}
            onClick={goBack}
            className="press hover:bg-accent -ml-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex justify-center gap-1.5">
            {PROGRESS.map((s, i) => <span key={s} className={cn("h-1 rounded-full transition-all duration-500", i <= progressIndex ? "bg-primary w-7" : "bg-muted w-4")} />)}
          </div>
          <span className="w-10" />
        </div>

        <div className="mt-8">
          {step === "waiting" ? <StepWaiting first={first} /> : null}
          {step === "duplicate" && existing ? <StepDuplicate dock={existing} onExit={onExit} /> : null}
          {step === "name" ? <StepName inputRef={nameInputRef} name={name} setName={setName} onContinue={() => setStep("actions")} /> : null}
          {step === "actions" ? <StepActions name={name} actions={actions} setActions={setActions} onSave={handleSave} /> : null}
          {step === "done" ? <StepDone name={name} actions={actions} onFinish={finish} /> : null}
        </div>

        {step === "waiting" && !device.connected ? <p className="text-muted-foreground mt-6 text-center text-[0.8125rem]">Pebble isn’t nearby — setup will continue when it reconnects.</p> : null}
      </div>
    </div>
  );
}

function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="mb-7 text-center"><h1 className="text-balance-tight text-2xl font-semibold">{title}</h1>{subtitle ? <p className="text-muted-foreground mt-2 text-[0.9375rem] text-pretty">{subtitle}</p> : null}</div>;
}

function StepWaiting({ first }: { first: boolean }) {
  return <div><Title title={first ? "Now set up your first dock" : "Add a new dock"} subtitle={first ? "Place your Pebble on the dock you want to set up." : "Place your Pebble on the new dock."} /><div className="surface flex flex-col items-center px-6 py-12"><PebbleVisual size="lg" state="searching" /><div className="text-muted-foreground mt-8 flex items-center gap-2 text-sm"><span className="border-primary/30 border-t-primary h-3.5 w-3.5 animate-spin rounded-full border-2" />Waiting for a dock…</div></div></div>;
}

function StepDuplicate({ dock, onExit }: { dock: Dock; onExit?: (() => void) | undefined }) {
  return <div><Title title={`${dock.name} is already set up.`} subtitle="This dock is already connected to your Pebble." /><div className="surface flex flex-col items-center px-6 py-12"><PebbleVisual size="lg" state="docked" /><p className="text-muted-foreground mt-8 text-sm">{dock.actions.length === 0 ? "No actions yet" : `${dock.actions.length} action${dock.actions.length === 1 ? "" : "s"} configured`}</p></div><Button asChild size="lg" className="mt-6 h-12 w-full rounded-[var(--radius-xl)]"><Link to="/docks/$dockId" params={{ dockId: String(dock.id) }} onClick={onExit}>View {dock.name}</Link></Button></div>;
}

function StepName({ inputRef, name, setName, onContinue }: { inputRef: React.RefObject<HTMLInputElement>; name: string; setName: (v: string) => void; onContinue: () => void }) {
  const canContinue = name.trim().length > 0;
  return <div><Title title="What would you like to call this dock?" subtitle="Choose something you’ll recognise instantly." /><input ref={inputRef} autoFocus value={name} onChange={(e) => setName(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter" && canContinue) onContinue(); }} placeholder="Desk Dock" aria-label="Dock name" className="bg-elevated border-hairline focus:ring-ring/40 h-14 w-full rounded-[var(--radius-xl)] border px-5 text-center text-lg font-medium shadow-[var(--shadow-1)] outline-none transition focus:ring-2" /><div className="mt-5 flex flex-wrap justify-center gap-2">{DOCK_NAME_SUGGESTIONS.map((s) => <button key={s} type="button" onClick={() => setName(s === "Desk" ? "Desk Dock" : s)} className="press border-hairline bg-elevated hover:bg-accent rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium">{s}</button>)}</div><Button size="lg" className="mt-8 h-12 w-full rounded-[var(--radius-xl)] text-[0.9375rem]" disabled={!canContinue} onClick={onContinue}>Continue</Button></div>;
}

function StepActions({ name, actions, setActions, onSave }: { name: string; actions: DockAction[]; setActions: (a: DockAction[]) => void; onSave: () => void }) { return <div><Title title="What should happen when your Pebble is placed here?" subtitle={`These run automatically on ${name || "this dock"}.`} /><ActionPicker selected={actions} onChange={setActions} />{actions.length > 0 ? <div className="mt-6"><p className="text-muted-foreground mb-2.5 px-1 text-[0.8125rem] font-medium tracking-wide uppercase">When Pebble is placed on {name || "this dock"}</p><Group>{actions.map((a, i) => <ActionRow key={a.id} action={a} index={i} />)}</Group></div> : <div className="mt-6"><Group><EmptyState icon={<Sparkles className="h-5 w-5" />} title="Make this dock useful." description="Search above to add what should happen when Pebble arrives." /></Group></div>}<div className="bg-background/80 sticky bottom-20 mt-5 backdrop-blur lg:bottom-4"><Button size="lg" className="h-12 w-full rounded-[var(--radius-xl)] text-[0.9375rem]" onClick={onSave}>{actions.length === 0 ? "Skip for now" : "Save Dock"}</Button></div></div>; }

function StepDone({ name, actions, onFinish }: { name: string; actions: DockAction[]; onFinish: () => void }) { return <div className="animate-settle flex flex-col items-center pt-6 text-center"><div className="bg-success-soft text-success flex h-16 w-16 items-center justify-center rounded-full"><Check className="animate-check h-8 w-8" strokeWidth={2.4} /></div><h1 className="text-balance-tight mt-6 text-2xl font-semibold">{name} is ready</h1><p className="text-muted-foreground mt-2 max-w-xs text-[0.9375rem] text-pretty">Whenever you place Pebble here, we’ll activate your workspace.</p>{actions.length > 0 ? <div className="mt-7 w-full text-left"><Group>{actions.map((a) => <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 text-[0.9375rem]"><Check className="text-success h-4 w-4 shrink-0" /><span className="truncate">{actionLabel(a)}</span></div>)}</Group></div> : null}<div className="mt-8 flex w-full flex-col gap-2.5"><Button size="lg" className="h-12 w-full rounded-[var(--radius-xl)]" onClick={onFinish}>Done</Button></div></div>; }

export { actionLabel };
