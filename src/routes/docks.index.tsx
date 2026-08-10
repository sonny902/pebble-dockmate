import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, SquareStack } from "lucide-react";
import { Page } from "@/components/pebble/AppShell";
import { DockCard } from "@/components/pebble/DockCard";
import { EmptyState, Group, PageHeader } from "@/components/pebble/primitives";
import { Button } from "@/components/ui/button";
import { usePebble } from "@/lib/pebble/store";

export const Route = createFileRoute("/docks/")({
  head: () => ({
    meta: [
      { title: "Docks — Pebble" },
      { name: "description", content: "Every dock you've set up and what each one does." },
      { property: "og:title", content: "Docks — Pebble" },
      { property: "og:description", content: "Every dock you've set up and what each one does." },
    ],
  }),
  component: Docks,
});

function Docks() {
  const { docks, activeDock } = usePebble();

  return (
    <Page className="space-y-7">
      <PageHeader
        title="Your Docks"
        subtitle={docks.length ? `${docks.length} configured` : undefined}
        action={
          <Button asChild className="rounded-full">
            <Link to="/docks/new">
              <Plus className="h-4 w-4" /> Add Dock
            </Link>
          </Button>
        }
      />

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
          {docks.map((dock) => (
            <DockCard key={dock.id} dock={dock} active={activeDock?.id === dock.id} />
          ))}
        </Group>
      )}
    </Page>
  );
}
