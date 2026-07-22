import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./AppTour.css";
import { useAuth, useLang } from "@/lib/providers";
import { supabase } from "@/integrations/supabase/client";

const START_KEY = "att.startTour";

type TourStep = {
  route?: "/home" | "/book" | "/membership" | "/profile";
  selector?: string; // if omitted, centered modal
  title: string;
  description: string;
};

function waitForEl(selector: string, timeoutMs = 2500): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);
    const obs = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { obs.disconnect(); resolve(el); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { obs.disconnect(); resolve(document.querySelector(selector)); }, timeoutMs);
  });
}

export function AppTour() {
  const { profile, user, refresh } = useAuth();
  const { lang } = useLang();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const driverRef = useRef<Driver | null>(null);
  const startedRef = useRef(false);

  const shouldOffer =
    !!profile &&
    profile.role !== "staff" &&
    !profile.tour_completed_at &&
    typeof window !== "undefined" &&
    sessionStorage.getItem(START_KEY) === "1";

  useEffect(() => {
    if (shouldOffer && !startedRef.current) {
      startedRef.current = true;
      setWelcomeOpen(true);
    }
  }, [shouldOffer]);

  const markDone = async () => {
    sessionStorage.removeItem(START_KEY);
    if (user) {
      await supabase.from("profiles").update({ tour_completed_at: new Date().toISOString() }).eq("id", user.id);
      await refresh();
    }
  };

  const steps: TourStep[] = [
    { route: "/home", title: "Next Session", description: "Your upcoming class appears here. Tap View Details to see the booking.", selector: '[data-tour="next-session"]' },
    { route: "/home", title: "Group Membership", description: "Shows your group class subscription status — Active, Expired, or Paused.", selector: '[data-tour="group-card"]' },
    { route: "/home", title: "Private Sessions", description: "How many PT (private) sessions you have left. Renew any time at the gym.", selector: '[data-tour="pt-card"]' },
    { route: "/home", title: "News & Coaches", description: "Latest announcements and the coaching team live here.", selector: '[data-tour="news-widget"]' },
    { route: "/book", title: "Pick a Day", description: "Grey dots mark days with classes. A red dot means you already have a booking.", selector: '[data-tour="calendar"]' },
    { route: "/book", title: "Filter Classes", description: "Switch between Muay Thai, Women only, PT, Yoga and more.", selector: '[data-tour="filters"]' },
    { route: "/book", title: "Book a Slot", description: "Tap a slot to select it, then confirm using the button at the bottom.", selector: '[data-tour="slots"]' },
    { route: "/membership", title: "Membership", description: "See your credits, expiry date and history. You can pause your group membership for up to 45 days.", selector: '[data-tour="membership-group"]' },
    { route: "/profile", title: "Profile & Referral", description: "Edit your info, invite friends with your referral link, and manage settings — including replaying this tour.", selector: '[data-tour="profile-menu"]' },
    { title: "You're all set", description: "Enjoy training at ATT Academy. You can replay this tour any time from Settings." },
  ];

  const runTour = async () => {
    setWelcomeOpen(false);
    // Ensure we start from /home
    if (path !== "/home") {
      await navigate({ to: "/home" });
      await new Promise((r) => setTimeout(r, 250));
    }

    const d = driver({
      showProgress: true,
      allowClose: false,
      overlayOpacity: 0.7,
      stagePadding: 6,
      stageRadius: 14,
      popoverClass: "att-tour-popover",
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Finish",
      onCloseClick: () => { d.destroy(); markDone(); },
      onDestroyStarted: () => { if (!d.hasNextStep()) markDone(); },
      steps: steps.map((s, i) => ({
        element: s.selector,
        popover: {
          title: s.title,
          description: s.description + `<div class="att-tour-skip"><button type="button" data-att-skip>Skip tour</button></div>`,
          side: "top",
          align: "center",
        },
        onHighlightStarted: async () => {
          if (s.route && path !== s.route) {
            await navigate({ to: s.route });
          }
          if (s.selector) await waitForEl(s.selector);
        },
      })),
    });
    driverRef.current = d;
    d.drive();

    // Delegate skip button clicks inside popovers
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest("[data-att-skip]")) {
        d.destroy();
        markDone();
      }
    };
    document.addEventListener("click", onClick);
    // cleanup when destroyed
    const orig = d.destroy;
    d.destroy = () => { document.removeEventListener("click", onClick); orig.call(d); };
  };

  const skip = () => { setWelcomeOpen(false); markDone(); };

  if (!welcomeOpen) return null;

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Welcome</p>
        <h2 className="font-display mt-2 text-2xl leading-tight">Take a quick tour of ATT Academy?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll show you how to book classes, track your membership, and find everything you need. Takes about a minute.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={skip} className="flex-1 rounded-pill hairline border px-4 py-3 text-sm font-medium text-muted-foreground">
            Skip
          </button>
          <button onClick={runTour} className="flex-1 rounded-pill bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            Start tour
          </button>
        </div>
      </div>
    </div>
  );
}
