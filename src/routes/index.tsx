import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Sparkles, SquareStack } from "lucide-react";
import { Page } from "@/components/pebble/AppShell";
import { PebbleStatus } from "@/components/pebble/PebbleStatus";
import { DockCard } from "@/components/pebble/DockCard";
import { EmptyState, Group, Section } from "@/components/pebble/primitives";
import { ActionRow } from "@/components/pebble/ActionRow";
import { Button } from "@/components/ui/button";
import { usePebble } from "@/lib/pebble/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pebble — Your dock, your workspace" },
      {
        name: "description",
        content:
          "See your Pebble at a glance: battery, connection and the dock it's resting on right now.",
      },
      { property: "og:title", content: "Pebble — Your dock, your workspace" },
      {
        property: "og:description",
        content: "The calm companion app for your Pebble and its docks.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { device, docks, activeDock, phase, ranActions, unconfiguredDockId } = usePebble();

  return (
    <Page className="space-y-9 pb-6">
      <div className="flex items-center justify-between lg:hidden">
        <h1 className="text-balance-tight text-[1.75rem] font-semibold">Pebble</h1>
      </div>

      {!device.connected && docks.length === 0 ? (
        <Group>
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="Welcome to Pebble"
            description="Connect your Pebble to get started."
          />
        </Group>
      ) : (
        <PebbleStatus device={device} dock={activeDock} />
      )}

      {unconfiguredDockId != null ? (
        <Group>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] font-medium">New dock detected</p>
              <p className="text-muted-foreground truncate text-[0.8125rem]">
                Set it up to give it a name and actions.
              </p>
            </div>
            <Button asChild size="sm" className="shrink-0 rounded-full">
              <Link to="/docks/new">Set up</Link>
            </Button>
          </div>
        </Group>
      ) : null}

      {activeDock ? (
        <Section title={phase === "active" ? "Workspace active" : "Activating workspace…"}>
          <Group>
            {activeDock.actions.map((a, i) => (
              <ActionRow key={a.id} action={a} index={i} done={phase === "active" || i < ranActions} />
            ))}
            {activeDock.actions.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="h-5 w-5" />}
                title="Make this dock useful."
                description="Choose what should happen when Pebble arrives."
                action={
                  <Button asChild variant="secondary" className="rounded-full">
                    <Link to="/docks/$dockId" params={{ dockId: String(activeDock.id) }}>
                      Add actions
                    </Link>
                  </Button>
                }
              />
            ) : null}
          </Group>
        </Section>
      ) : null}

      <Section title="Your Docks">
        {docks.length === 0 ? (
          <Group>
            <EmptyState
              icon={<SquareStack className="h-5 w-5" />}
              title="Your docks will appear here."
              description="Place Pebble on a dock to set one up."
              action={
                <Button asChild className="rounded-full">
                  <Link to="/docks/new">
                    <Plus className="h-4 w-4" /> Add Dock
                  </Link>
                </Button>
              }
            />
          </Group>
        ) : (
          <Group>
            {docks.slice(0, 3).map((dock) => (
              <DockCard key={dock.id} dock={dock} active={activeDock?.id === dock.id} />
            ))}
            <Link
              to="/docks"
              className="press text-muted-foreground hover:bg-accent/60 hover:text-foreground flex items-center justify-between px-5 py-3.5 text-[0.875rem] font-medium"
            >
              All docks
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Group>
        )}
      </Section>
    </Page>
  );
}
