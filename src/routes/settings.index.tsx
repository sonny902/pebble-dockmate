import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bluetooth,
  ChevronRight,
  CircleHelp,
  Cpu,
  FileText,
  Palette,
  Plus,
  Shield,
  SquareStack,
  Sparkles,
  Wrench,
} from "lucide-react";
import { Page } from "@/components/pebble/AppShell";
import { Group, PageHeader, Row, Section } from "@/components/pebble/primitives";
import { StatusIndicator } from "@/components/pebble/StatusIndicator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ACTION_DEFINITIONS, ACTION_ICONS } from "@/lib/pebble/catalog";
import { usePebble } from "@/lib/pebble/store";
import { useTheme, PRESETS } from "@/lib/theme";

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — Pebble" },
      { name: "description", content: "Manage your Pebble, docks, actions and appearance." },
      { property: "og:title", content: "Settings — Pebble" },
      { property: "og:description", content: "Manage your Pebble, docks, actions and appearance." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { device, docks, setDeviceConnected } = usePebble();
  const { preset } = useTheme();
  const [advanced, setAdvanced] = useState(false);
  const presetName = PRESETS.find((p) => p.id === preset)?.name ?? "Pebble";

  return (
    <Page width="narrow" className="space-y-8">
      <PageHeader title="Settings" />

      <Section title="Pebble">
        <Group>
          <Row
            title={device.name}
            subtitle={device.connected ? "Connected over Bluetooth" : "Not nearby"}
            trailing={<StatusIndicator tone={device.connected ? "success" : "muted"} />}
          />
          <Row title="Battery" trailing={<span className="text-[0.8125rem]">{device.battery}%</span>} />
          <Row
            title="Charging"
            trailing={<span className="text-[0.8125rem]">{device.charging ? "Yes" : "No"}</span>}
          />
          <Row
            title="Firmware"
            trailing={<span className="text-[0.8125rem]">{device.firmware}</span>}
          />
          <Row
            title="Bluetooth"
            subtitle="Keep Pebble linked to this device"
            trailing={<Switch checked={device.connected} onCheckedChange={setDeviceConnected} />}
          />
        </Group>
      </Section>

      <Section title="Docks">
        <Group>
          <Row
            icon={<SquareStack className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
            title="Manage docks"
            subtitle={`${docks.length} configured`}
            trailing={<ChevronRight className="h-4 w-4" />}
            onClick={() => {}}
            className="p-0"
            as="div"
          />
        </Group>
        <Group>
          <Link to="/docks" className="press hover:bg-accent/60 flex items-center justify-between px-5 py-3.5">
            <span className="text-[0.9375rem] font-medium">All docks</span>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
          <Link to="/docks/new" className="press hover:bg-accent/60 flex items-center justify-between px-5 py-3.5">
            <span className="text-[0.9375rem] font-medium">Add dock</span>
            <Plus className="text-muted-foreground h-4 w-4" />
          </Link>
        </Group>
      </Section>

      <Section title="Appearance">
        <Group>
          <Link
            to="/settings/appearance"
            className="press hover:bg-accent/60 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 px-5 py-3.5"
          >
            <Palette className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-medium">Theme & accent</span>
              <span className="text-muted-foreground block truncate text-[0.8125rem]">
                {presetName}
              </span>
            </span>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
        </Group>
      </Section>

      <Section title="Actions" description="More action types are on the way.">
        <Group>
          {ACTION_DEFINITIONS.map((def) => {
            const Icon = ACTION_ICONS[def.type];
            return (
              <Row
                key={def.type}
                icon={<Icon className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
                title={def.label}
                subtitle={def.description}
                trailing={
                  <span className="text-[0.75rem]">{def.available ? "Available" : "Soon"}</span>
                }
                className={def.available ? "" : "opacity-55"}
              />
            );
          })}
        </Group>
      </Section>

      <Section title="Advanced">
        <Group>
          <Row
            icon={<Wrench className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
            title="Developer information"
            subtitle={advanced ? "Visible" : "Hidden"}
            trailing={<Switch checked={advanced} onCheckedChange={setAdvanced} />}
          />
          {advanced ? (
            <>
              <Row
                icon={<Cpu className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
                title="Device identifier"
                trailing={
                  <span className="font-mono text-[0.75rem]">{device.identifier}</span>
                }
              />
              <Row
                icon={<Bluetooth className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
                title="Bluetooth"
                subtitle={`GATT · signal ${device.signal}`}
                trailing={<span className="font-mono text-[0.75rem]">0x2A19</span>}
              />
              <Row
                icon={<Sparkles className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
                title="Docked dock ID"
                trailing={
                  <span className="font-mono text-[0.75rem]">{device.dock ?? "none"}</span>
                }
              />
            </>
          ) : null}
        </Group>
      </Section>

      <Section title="About">
        <Group>
          <Row title="Pebble" trailing={<span className="text-[0.8125rem]">Version 1.4.2</span>} />
          <Row
            icon={<CircleHelp className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
            title="Support"
            trailing={<ChevronRight className="h-4 w-4" />}
          />
          <Row
            icon={<Shield className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
            title="Privacy"
            trailing={<ChevronRight className="h-4 w-4" />}
          />
          <Row
            icon={<FileText className="text-muted-foreground h-[1.15rem] w-[1.15rem]" />}
            title="Terms"
            trailing={<ChevronRight className="h-4 w-4" />}
          />
        </Group>
      </Section>

      <div className="pt-2 pb-4">
        <Button
          variant="ghost"
          className="text-muted-foreground w-full rounded-full"
          onClick={() => setDeviceConnected(!device.connected)}
        >
          {device.connected ? "Disconnect Pebble" : "Reconnect Pebble"}
        </Button>
      </div>
    </Page>
  );
}
