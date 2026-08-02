import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Repeat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveSpaces } from "@/lib/spaces";

/**
 * Everyone signs in through one door, so accounts with more than one space
 * (an owner who also trains, a platform admin with a gym) get a way back to
 * the picker. Hidden for single-space accounts.
 */
export function SwitchSpace({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        const spaces = await resolveSpaces(data.user.id);
        if (!cancelled) setShow(spaces.length > 1);
      } catch {
        /* leave hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  return (
    <Link
      to="/spaces"
      className={className || "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"}
    >
      <Repeat size={18} /> Switch space
    </Link>
  );
}
