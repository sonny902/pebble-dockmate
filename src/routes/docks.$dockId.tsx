import { useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { ActionPicker } from "@/components/pebble/ActionPicker";
import { ActionRow } from "@/components/pebble/ActionRow";
import { EmptyState, Group, Row, Section } from "@/components/pebble/primitives";
import { Page } from "@/components/pebble/AppShell";
import { StatusIndicator } from "@/components/pebble/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { usePebble } from "@/lib/pebble/store";
import type { DockAction } from "@/lib/pebble/types";
import { toast } from "sonner";

export const Route = createFileRoute("/docks/$dockId")({
  head: () => ({
    meta: [
      { title: "Dock — Pebble" },
      { name: "description", content: "Configure what happens when Pebble is placed on this dock." },
      { property: "og:title", content: "Dock — Pebble" },
      {
        property: "og:description",
        content: "Configure what happens when Pebble is placed on this dock.",
      },
    ],
  }),
  component: DockDetail,
});

function DockDetail() {
  const { dockId } = useParams({ from: "/docks/$dockId" });
  const navigate = useNavigate();
  const { getDock, updateDock, removeDock, activeDock, runDockNow } = usePebble();
  const dock = getDock(Number(dockId));
  const [picking, setPicking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(dock?.name ?? "");

  if (!dock) {
    return (
      <Page width="narrow">
        <EmptyState
          icon={<Trash2 className="h-5 w-5" />}
          title="Dock not found"
          description="This dock may have been removed."
          action={
            <Button className="rounded-full" onClick={() => navigate({ to: "/docks" })}>
              Back to docks
            </Button>
          }
        />
      </Page>
    );
  }

  const isActive = activeDock?.id === dock.id;

  const setActions = (next: DockAction[]) => updateDock(dock.id, { actions: next });

  return (
    <Page width="narrow" className="space-y-7 pb-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/docks" })}
          className="press hover:bg-accent -ml-2 flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Back to docks"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                if (draftName.trim()) updateDock(dock.id, { name: draftName.trim() });
                setRenaming(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="border-hairline bg-elevated focus:ring-ring/40 w-full rounded-[var(--radius-lg)] border px-3 py-1.5 text-xl font-semibold outline-none focus:ring-2"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraftName(dock.name);
                setRenaming(true);
              }}
              className="block min-w-0 text-left"
            >
              <h1 className="text-balance-tight truncate text-2xl font-semibold">{dock.name}</h1>
            </button>
          )}
          <div className="mt-1">
            <StatusIndicator
              tone={isActive ? "success" : "muted"}
              pulse={isActive}
              label={isActive ? "Pebble is docked" : dock.enabled ? "Waiting for Pebble" : "Paused"}
              className="text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <Section title="When Pebble is placed here">
        <Group>
          {dock.actions.length === 0 ? (
            <EmptyState
              icon={<Plus className="h-5 w-5" />}
              title="Make this dock useful."
              description="Choose what should happen when Pebble arrives."
              action={
                <Button className="rounded-full" onClick={() => setPicking(true)}>
                  Add action
                </Button>
              }
            />
          ) : (
            <>
              {dock.actions.map((a, i) => (
                <ActionRow
                  key={a.id}
                  action={a}
                  index={i}
                  reorderable
                  onRemove={() => setActions(dock.actions.filter((x) => x.id !== a.id))}
                />
              ))}
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="press text-primary hover:bg-accent/60 flex w-full items-center gap-2 px-5 py-3.5 text-[0.9375rem] font-medium"
              >
                <Plus className="h-4 w-4" /> Add action
              </button>
            </>
          )}
        </Group>
      </Section>

      <Section title="Dock">
        <Group>
          <Row
            title="Enabled"
            subtitle="Run actions when Pebble arrives"
            trailing={
              <Switch
                checked={dock.enabled}
                onCheckedChange={(v) => updateDock(dock.id, { enabled: v })}
              />
            }
          />
          <Row
            title="Test this dock"
            subtitle="Run these actions on this computer now"
            trailing={
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                disabled={dock.actions.length === 0}
                onClick={() => {
                  runDockNow(dock.id);
                  toast.success(`Running ${dock.name}`, {
                    description: `${dock.actions.length} action${dock.actions.length === 1 ? "" : "s"}`,
                  });
                }}
              >
                Run now
              </Button>
            }
          />

          <Row title="Identifier" subtitle="Used by your Pebble" trailing={<span className="text-[0.8125rem]">Dock {dock.id}</span>} />
        </Group>
      </Section>

      <Group>
        <Row
          title={<span className="text-destructive">Delete dock</span>}
          onClick={() => {
            removeDock(dock.id);
            toast.success(`${dock.name} deleted`);
            navigate({ to: "/docks" });
          }}
          trailing={<Trash2 className="text-destructive h-4 w-4" />}
        />
      </Group>

      <Sheet open={picking} onOpenChange={setPicking}>
        <SheetContent side="bottom" className="rounded-t-[var(--radius-3xl)] px-4 pb-8 sm:px-6">
          <SheetHeader className="px-0">
            <SheetTitle>Add actions</SheetTitle>
          </SheetHeader>
          <ActionPicker selected={dock.actions} onChange={setActions} />
          <Button
            className="mt-4 h-12 w-full rounded-[var(--radius-xl)]"
            onClick={() => setPicking(false)}
          >
            Done
          </Button>
        </SheetContent>
      </Sheet>
    </Page>
  );
}
