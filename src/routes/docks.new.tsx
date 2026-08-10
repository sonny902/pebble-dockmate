import { createFileRoute } from "@tanstack/react-router";
import { DockSetup } from "@/components/pebble/DockSetup";

export const Route = createFileRoute("/docks/new")({
  head: () => ({
    meta: [
      { title: "Set up a dock — Pebble" },
      {
        name: "description",
        content: "Place Pebble on a dock, name it, and choose what happens when it arrives.",
      },
      { property: "og:title", content: "Set up a dock — Pebble" },
      {
        property: "og:description",
        content: "Place Pebble on a dock, name it, and choose what happens when it arrives.",
      },
    ],
  }),
  component: NewDock,
});

function NewDock() {
  return <DockSetup />;
}
