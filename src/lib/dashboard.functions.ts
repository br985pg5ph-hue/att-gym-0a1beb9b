import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ammanNow, toAmmanDateInput, fromAmmanDateInput } from "@/lib/time";

function startOfDayInAmman(d: Date): Date {
  const key = toAmmanDateInput(d).slice(0, 10);
  return fromAmmanDateInput(`${key}T00:00:00`);
}

function endOfDayInAmman(d: Date): Date {
  const key = toAmmanDateInput(d).slice(0, 10);
  return fromAmmanDateInput(`${key}T23:59:59`);
}

export const getAdminDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isStaff } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "staff",
    });
    if (!isStaff) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = ammanNow();
    const todayStart = startOfDayInAmman(now).toISOString();
    const todayEnd = endOfDayInAmman(now).toISOString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = startOfDayInAmman(tomorrow).toISOString();
    const tomorrowEnd = endOfDayInAmman(tomorrow).toISOString();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [
      { data: todayClasses },
      { data: tomorrowClasses },
      { data: activeProfiles },
      { data: activeChildren },
      { data: ptProfiles },
      { data: ptChildren },
      { data: newThisWeek },
      { data: newThisMonth },
      { data: expiringSoon },
      { data: recentTxns },
      { data: revenueToday },
      { data: revenueWeek },
      { data: signupTrend },
      { data: membershipBreakdown },
    ] = await Promise.all([
      supabaseAdmin
        .from("classes")
        .select("id, title, starts_at, capacity, type, coaches(name), bookings(id, status, child_id, member_id)")
        .gte("starts_at", todayStart)
        .lte("starts_at", todayEnd)
        .is("cancelled_at", null)
        .order("starts_at", { ascending: true }),
      supabaseAdmin
        .from("classes")
        .select("id")
        .gte("starts_at", tomorrowStart)
        .lte("starts_at", tomorrowEnd)
        .is("cancelled_at", null),
      supabaseAdmin
        .from("profiles")
        .select("id")
        .gt("group_subscription_until", now.toISOString()),
      supabaseAdmin
        .from("children")
        .select("id")
        .gt("group_subscription_until", now.toISOString()),
      supabaseAdmin
        .from("profiles")
        .select("pt_sessions_remaining"),
      supabaseAdmin
        .from("children")
        .select("pt_sessions_remaining"),
      supabaseAdmin
        .from("profiles")
        .select("id")
        .gte("created_at", weekAgo.toISOString()),
      supabaseAdmin
        .from("profiles")
        .select("id")
        .gte("created_at", monthAgo.toISOString()),
      supabaseAdmin
        .from("profiles")
        .select("id, name, group_subscription_until")
        .gt("group_subscription_until", now.toISOString())
        .lte("group_subscription_until", weekFromNow.toISOString())
        .order("group_subscription_until", { ascending: true })
        .limit(10),
      supabaseAdmin
        .from("transactions")
        .select("id, type, service, classes, days, description, payment_method, created_at, member_id, profiles(id, name), children(id, name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("transactions")
        .select("payment_method")
        .eq("type", "credit")
        .gte("created_at", todayStart)
        .lte("created_at", todayEnd)
        .not("payment_method", "is", null),
      supabaseAdmin
        .from("transactions")
        .select("payment_method")
        .eq("type", "credit")
        .gte("created_at", weekAgo.toISOString())
        .lte("created_at", todayEnd)
        .not("payment_method", "is", null),
      supabaseAdmin
        .from("profiles")
        .select("created_at")
        .gte("created_at", monthAgo.toISOString())
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("profiles")
        .select("id, group_subscription_until, pt_sessions_remaining, membership_paused_at"),
    ]);

    const todayList = (todayClasses ?? []).map((c: any) => {
      const upcoming = (c.bookings ?? []).filter((b: any) => b.status === "upcoming");
      return {
        id: c.id,
        title: c.title,
        starts_at: c.starts_at,
        capacity: c.capacity,
        type: c.type,
        coach_name: c.coaches?.name ?? null,
        booked: upcoming.length,
        full: upcoming.length >= c.capacity,
      };
    });

    const ptSessionsOnBooks =
      ((ptProfiles ?? []) as any[]).reduce((sum, p) => sum + (p.pt_sessions_remaining ?? 0), 0) +
      ((ptChildren ?? []) as any[]).reduce((sum, c) => sum + (c.pt_sessions_remaining ?? 0), 0);

    const countByMethod = (rows: any[]) => {
      const counts: Record<string, number> = {};
      rows.forEach((r) => {
        const method = r.payment_method ?? "other";
        counts[method] = (counts[method] ?? 0) + 1;
      });
      return counts;
    };

    const revenueTodayCounts = countByMethod(revenueToday ?? []);
    const revenueWeekCounts = countByMethod(revenueWeek ?? []);

    const signupDays: Record<string, number> = {};
    const trendStart = new Date(monthAgo);
    for (let d = new Date(trendStart); d <= now; d.setDate(d.getDate() + 1)) {
      signupDays[toAmmanDateInput(new Date(d)).slice(0, 10)] = 0;
    }
    (signupTrend ?? []).forEach((p: any) => {
      const key = toAmmanDateInput(new Date(p.created_at)).slice(0, 10);
      if (key in signupDays) signupDays[key] += 1;
    });
    const signupTrendList = Object.entries(signupDays).map(([date, count]) => ({ date, count }));

    let active = 0, paused = 0, expired = 0, never = 0;
    (membershipBreakdown ?? []).forEach((p: any) => {
      const groupActive = p.group_subscription_until && new Date(p.group_subscription_until).getTime() > now.getTime();
      const hasPt = (p.pt_sessions_remaining ?? 0) > 0;
      if (p.membership_paused_at) {
        paused += 1;
      } else if (groupActive || hasPt) {
        active += 1;
      } else if (p.group_subscription_until) {
        expired += 1;
      } else {
        never += 1;
      }
    });

    return {
      todayClasses: todayList,
      tomorrowClassesCount: (tomorrowClasses ?? []).length,
      activeGroupMembers: (activeProfiles ?? []).length + (activeChildren ?? []).length,
      ptSessionsOnBooks,
      newSignupsThisWeek: (newThisWeek ?? []).length,
      newSignupsThisMonth: (newThisMonth ?? []).length,
      expiringSoonCount: (expiringSoon ?? []).length,
      expiringSoonList: (expiringSoon ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        group_subscription_until: p.group_subscription_until,
      })),
      recentTransactions: (recentTxns ?? []).map((t: any) => ({
        id: t.id,
        type: t.type,
        service: t.service,
        classes: t.classes,
        days: t.days,
        description: t.description,
        payment_method: t.payment_method,
        created_at: t.created_at,
        member_name: t.profiles?.name ?? null,
        child_name: t.children?.name ?? null,
      })),
      revenueToday: revenueTodayTotal,
      revenueWeek: revenueWeekTotal,
      signupTrend: signupTrendList,
      membershipBreakdown: { active, paused, expired, never },
    };
  });
