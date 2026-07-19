import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-md pb-28 pt-[max(env(safe-area-inset-top),16px)]">{children}</main>
      <BottomNav />
    </div>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-4">
      <div className="min-w-0">
        <h1 className="font-display truncate text-3xl leading-none">{title}</h1>
        {subtitle && <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
