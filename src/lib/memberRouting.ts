import { supabase } from "@/integrations/supabase/client";
import { gymPath } from "@/lib/gym";

/** True when the signed-in profile is missing details we require of every member. */
export function profileNeedsDetails(
  p: { name?: string | null; phone?: string | null; gender?: string | null } | null,
) {
  if (!p) return true;
  return !p.name?.trim() || !p.phone?.trim() || !p.gender?.trim();
}

/**
 * The member app is only for gym members. Gym staff/admin/owner accounts belong
 * in the gym portal, so they are turned away here (unless they are also a member
 * of some gym, e.g. an owner who trains at their own gym).
 */
export async function isStaffOnlyAccount(userId: string) {
  const { data } = await supabase.from("gym_members").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as string);
  return roles.length > 0 && roles.every((r) => r !== "member");
}


type MembershipLite = {
  gym_id: string;
  waiver_signed_at: string | null;
  gyms: { slug: string; status: string } | null;
};

/**
 * The Nuvo app is gym-agnostic until a member joins a gym.
 * This decides where a signed-in account belongs right now:
 * missing details -> complete profile, no gym -> gym search,
 * otherwise straight into that gym's branded app.
 */
export async function resolveMemberEntry(userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, phone, gender, onboarded, is_parent, active_gym_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileNeedsDetails(profile)) return "/app/complete-profile";

  const { data } = await supabase
    .from("gym_members")
    .select("gym_id, waiver_signed_at, gyms!inner(slug, status)")
    .eq("user_id", userId);

  const memberships = ((data as unknown as MembershipLite[]) ?? []).filter(
    (m) => m.gyms && m.gyms.status !== "suspended",
  );
  if (memberships.length === 0) return "/app/join";

  const active =
    memberships.find((m) => m.gym_id === profile?.active_gym_id) ?? memberships[0];
  const slug = active.gyms!.slug;

  if (active.gym_id !== profile?.active_gym_id) {
    await supabase.from("profiles").update({ active_gym_id: active.gym_id }).eq("id", userId);
  }

  if (!active.waiver_signed_at || !profile?.onboarded) return gymPath(slug, "/onboarding");
  return gymPath(slug, "/home");
}
