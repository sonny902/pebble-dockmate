import { createFileRoute } from "@tanstack/react-router";
import { DockSetup } from "@/components/pebble/DockSetup";

export const Route = createFileRoute("/docks/new")({
  head: () => ({
    meta: [
      { title: "Add a dock — Pebble" },
      {
        name: "description",
        content: "Place your Pebble on a dock — it’s detected automatically, then name it and choose what happens.",
      },
      { property: "og:title", content: "Add a dock — Pebble" },
      {
        property: "og:description",
        content: "Place your Pebble on a dock — it’s detected automatically, then name it and choose what happens.",
      },
    ],
  }),
  component: NewDock,
});

function NewDock() {
  return <DockSetup />;
}
