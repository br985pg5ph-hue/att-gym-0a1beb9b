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
  waiver_signed_at: string | null;
  waiver_name: string | null;
  gyms?: { id: string; slug: string; name: string; waiver_text: string } | null;
};

/** A gym as shown in the onboarding "find your gym" search. */
export type GymSearchResult = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  logo_url: string | null;
  waiver_text: string;
};

const HIDDEN_SLUGS = ["platform", "preview"];

/** Searches the gyms directory by name or city. Empty query returns the first page. */
export async function searchGyms(query: string): Promise<GymSearchResult[]> {
  const q = query.trim().slice(0, 80);
  let req = supabase
    .from("gyms")
    .select("id, slug, name, city, address, logo_url, waiver_text")
    .eq("listed", true)
    .neq("status", "suspended")
    .order("name")
    .limit(20);
  if (q) req = req.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
  const { data, error } = await req;
  if (error) throw error;
  return ((data as unknown as GymSearchResult[]) ?? []).filter((g) => !HIDDEN_SLUGS.includes(g.slug));
}

/** Joins a gym using the private code a gym hands out. Returns the gym slug. */
export async function joinGymByCode(code: string, referral?: string | null): Promise<string> {
  const { data, error } = await supabase.rpc("join_gym_by_code", {
    _code: code.trim(),
    _referral: referral?.trim() || undefined,
  });
  if (error) throw error;
  return data as unknown as string;
}

/** Records the member's signature on this gym's waiver. */
export async function signWaiver(gymId: string, fullName: string): Promise<void> {
  const { error } = await supabase.rpc("sign_waiver", { _gym_id: gymId, _name: fullName.trim() });
  if (error) throw error;
}

/** The signed-in user's membership at the gym with this slug, if any. */
export async function fetchMembershipBySlug(
  userId: string,
  slug: string,
): Promise<MembershipRow | null> {
  const { data, error } = await supabase
    .from("gym_members")
    .select("*, gyms!inner(id, slug, name, waiver_text)")
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
