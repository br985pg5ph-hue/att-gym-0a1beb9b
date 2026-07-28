import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Plus, User } from "lucide-react";
import { useAuth, useChildren } from "@/lib/providers";
import { gp } from "@/lib/gym";

/** Header pill that lets a parent switch which child the screen is scoped to. Renders nothing unless the user is a parent. */
export function ChildSwitcher() {
  const { profile } = useAuth();
  const { children, selectedChild, setSelectedChildId } = useChildren();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!profile?.is_parent) return null;

  const label = selectedChild ? selectedChild.name.split(" ")[0] : "Me";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-pill border hairline bg-card py-1.5 pl-1.5 pr-3"
      >
        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
          {selectedChild?.avatar_url ? (
            <img src={selectedChild.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={14} />
          )}
        </span>
        <span className="max-w-[80px] truncate text-xs font-semibold">{label}</span>
        <ChevronDown size={14} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border hairline bg-card shadow-lg">
          <div className="max-h-64 overflow-auto">
            <button
              onClick={() => { setSelectedChildId(null); setOpen(false); }}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted ${!selectedChild ? "bg-muted" : ""}`}
            >
              <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={14} />}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">Myself</span>
              {!selectedChild && <span className="text-[10px] font-semibold text-primary">ACTIVE</span>}
            </button>
            {children.map((c) => (
              <button
                key={c.id}
                onClick={() => { setSelectedChildId(c.id); setOpen(false); }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted ${c.id === selectedChild?.id ? "bg-muted" : ""}`}
              >
                <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
                  {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={14} />}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                {c.id === selectedChild?.id && <span className="text-[10px] font-semibold text-primary">ACTIVE</span>}
              </button>
            ))}
          </div>
          <Link
            to={gp("/profile/children")}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 border-t hairline px-3 py-3 text-sm font-semibold text-primary hover:bg-muted"
          >
            <Plus size={14} /> Manage children
          </Link>
        </div>
      )}
    </div>
  );
}

