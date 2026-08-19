import type { ReactNode } from "react";
import { DesktopSidebar, MobileNavigation } from "./Navigation";
import { Onboarding } from "./Onboarding";
import { PreviewBar } from "./PreviewBar";
import { usePebble } from "@/lib/pebble/store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { hydrated, onboarded } = usePebble();

  // Avoid a hydration mismatch: local state is restored after first paint.
  if (!hydrated) return <div className="bg-background min-h-screen" />;

  if (!onboarded)
    return (
      <>
        <Onboarding />
        <PreviewBar />
      </>
    );

  return (
    <div className="min-h-screen">
      <DesktopSidebar />
      <MobileNavigation />
      <main className="pb-24 lg:pb-12 lg:pl-[16.5rem]">{children}</main>
      <PreviewBar />
    </div>
  );
}


export function Page({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string | undefined;
  width?: "default" | "narrow" | undefined;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pt-8 sm:px-6 lg:px-10 lg:pt-12",
        width === "narrow" ? "max-w-2xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
