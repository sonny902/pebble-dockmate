import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Page } from "@/components/pebble/AppShell";
import { Group, Section } from "@/components/pebble/primitives";
import { AccentPicker, AppearanceSegmented, ThemePicker } from "@/components/pebble/ThemePicker";
import { PebbleVisual } from "@/components/pebble/PebbleVisual";
import { StatusIndicator } from "@/components/pebble/StatusIndicator";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/settings/appearance")({
  head: () => ({
    meta: [
      { title: "Appearance — Pebble" },
      {
        name: "description",
        content: "Choose light or dark, an accent colour and a Pebble theme.",
      },
      { property: "og:title", content: "Appearance — Pebble" },
      {
        property: "og:description",
        content: "Choose light or dark, an accent colour and a Pebble theme.",
      },
    ],
  }),
  component: Appearance,
});

function Appearance() {
  const navigate = useNavigate();
  return (
    <Page width="narrow" className="space-y-8 pb-6">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="press hover:bg-accent -ml-2 flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Back to settings"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-balance-tight truncate text-2xl font-semibold">Appearance</h1>
      </div>

      <Section title="Preview">
        <div className="surface flex flex-col items-center gap-5 px-6 py-8">
          <PebbleVisual size="md" state="ready" />
          <div className="flex flex-col items-center gap-1.5">
            <StatusIndicator tone="success" label="Connected" className="text-muted-foreground" />
            <p className="text-lg font-semibold">Desk Dock</p>
          </div>
          <div className="flex items-center gap-3">
            <Button className="rounded-full" size="sm">
              Primary
            </Button>
            <Button variant="secondary" className="rounded-full" size="sm">
              Secondary
            </Button>
            <Switch defaultChecked />
          </div>
        </div>
      </Section>

      <Section title="Appearance">
        <AppearanceSegmented />
      </Section>

      <Section title="Accent colour">
        <Group className="px-4 py-4">
          <AccentPicker />
        </Group>
      </Section>

      <Section title="Themes" description="Themes adjust surfaces, contrast and accent together.">
        <ThemePicker />
      </Section>
    </Page>
  );
}
