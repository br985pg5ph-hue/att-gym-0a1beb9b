import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, User, CreditCard } from "lucide-react";
import { useLang } from "@/lib/providers";
import { gp } from "@/lib/gym";

export function BottomNav() {
  const { t } = useLang();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const tabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
    { to: gp("/home"), label: t.home, icon: Home, exact: true },
    { to: gp("/book"), label: t.book, icon: CalendarDays },
    { to: gp("/membership"), label: t.membership, icon: CreditCard },
    { to: gp("/profile"), label: t.profile, icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-background pb-[max(env(safe-area-inset-bottom),8px)] pt-2">
      <ul className="mx-auto flex max-w-md items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = tab.exact ? path === tab.to : path.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <Link
                to={tab.to as any}
                className={`flex flex-col items-center gap-1 rounded-pill px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
