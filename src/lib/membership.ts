import { supabase } from "@/integrations/supabase/client";

/**
 * One account can belong to several gyms. A membership row holds everything
 * gym-specific (role, credits, status); profiles holds identity only.
 */
export type MembershipRow = {
  id: string;
  user_id: string;
  gym_id: string;
  role: "member" | "staff" | "admin" | "owner";
  member_code: string;
  membership_status: string;
  streak: number;
  classes_attended: number;
  pt_sessions_remaining: number;
  group_subscription_until: string | null;
  group_subscription_started_at: string | null;
  group_track: string | null;
  membership_paused_at: string | null;
  membership_pause_days_used: number;
  referral_code: string;
  created_at: string;
};

/** The signed-in user's membership at the gym with this slug, if any. */
export async function fetchMembershipBySlug(
  userId: string,
  slug: string,
): Promise<MembershipRow | null> {
  const { data, error } = await supabase
    .from("gym_members")
    .select("*, gyms!inner(id, slug)")
    .eq("user_id", userId)
    .eq("gyms.slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as MembershipRow) ?? null;
}

/**
 * Membership at this gym, joining the gym first when the account has none yet
 * (email-confirmed signups and social sign-in land here without one).
 */
export async function ensureMembershipBySlug(
  userId: string,
  slug: string,
  referral?: string | null,
): Promise<MembershipRow | null> {
  const existing = await fetchMembershipBySlug(userId, slug);
  if (existing) return existing;
  const { error } = await supabase.rpc("join_gym", {
    _slug: slug,
    _referral: referral || undefined,
  });
  if (error) throw error;
  return fetchMembershipBySlug(userId, slug);
}

export const STAFF_ROLES = ["staff", "admin", "owner"];

export function isStaffRole(role?: string | null) {
  return !!role && STAFF_ROLES.includes(role);
}
