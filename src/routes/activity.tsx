import { createFileRoute } from "@tanstack/react-router";
import { Activity as ActivityIcon, BluetoothOff, Bluetooth, CircleСheckPlaceholder } from "lucide-react";
import { Page } from "@/components/pebble/AppShell";
import { EmptyState, Group, PageHeader, Section } from "@/components/pebble/primitives";
import { usePebble } from "@/lib/pebble/store";
import type { ActivityEvent } from "@/lib/pebble/types";

export const Route = createFileRoute("/activity")({
  head: () => ({
    meta: [
      { title: "Activity — Pebble" },
      { name: "description", content: "A quiet log of everywhere your Pebble has been today." },
      { property: "og:title", content: "Activity — Pebble" },
      {
        property: "og:description",
        content: "A quiet log of everywhere your Pebble has been today.",
      },
    ],
  }),
  component: ActivityScreen,
});

function dayLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400e3);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

function time(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

function EventRow({ event }: { event: ActivityEvent }) {
  const dotTone =
    event.kind === "activated"
      ? "bg-success"
      : event.kind === "disconnected"
        ? "bg-muted-foreground/40"
        : "bg-primary/60";
  return (
    <div className="grid grid-cols-[3.25rem_auto_minmax(0,1fr)] items-start gap-3 px-4 py-3.5 sm:px-5">
      <span className="text-muted-foreground pt-0.5 text-[0.8125rem] tabular-nums">
        {time(event.at)}
      </span>
      <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotTone}`} />
      <span className="min-w-0">
        <span className="block truncate text-[0.9375rem] font-medium">{event.title}</span>
        <span className="text-muted-foreground block truncate text-[0.8125rem]">{event.detail}</span>
      </span>
    </div>
  );
}

function ActivityScreen() {
  const { activity } = usePebble();

  const groups = activity.reduce<Record<string, ActivityEvent[]>>((acc, e) => {
    const key = dayLabel(e.at);
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  return (
    <Page width="narrow" className="space-y-7">
      <PageHeader title="Activity" subtitle="Recent Pebble events" />

      {activity.length === 0 ? (
        <Group>
          <EmptyState
            icon={<ActivityIcon className="h-5 w-5" />}
            title="Nothing yet"
            description="Dock your Pebble and its activity will show up here."
          />
        </Group>
      ) : (
        Object.entries(groups).map(([day, events]) => (
          <Section key={day} title={day}>
            <Group>
              {events.map((e) => (
                <EventRow key={e.id} event={e} />
              ))}
            </Group>
          </Section>
        ))
      )}
    </Page>
  );
}
