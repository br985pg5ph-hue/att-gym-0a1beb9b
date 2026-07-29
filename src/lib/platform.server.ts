/** Server-only helpers for the platform / gym-owner portals. */

type AnyClient = any;

/** The platform gym row (non-operational tenant that owns platform admins). */
export async function getPlatformGymId(adminClient: AnyClient): Promise<string> {
  const { data, error } = await adminClient.from("gyms").select("id").eq("slug", "platform").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Platform gym not found");
  return data.id as string;
}

/** True when the signed-in account is a Nuvo platform admin. */
export async function isPlatformAdmin(client: AnyClient, userId: string): Promise<boolean> {
  const { data, error } = await client
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data?.is_platform_admin);
}

/**
 * The caller's membership at the gym they are currently using.
 * Roles now live on gym_members, not on the identity profile.
 */
export async function getActiveMembership(
  client: AnyClient,
  userId: string,
): Promise<{ gymId: string; role: string } | null> {
  const { data: prof, error: profErr } = await client
    .from("profiles")
    .select("active_gym_id")
    .eq("id", userId)
    .maybeSingle();
  if (profErr) throw profErr;

  const q = client.from("gym_members").select("gym_id, role").eq("user_id", userId);
  const { data: rows, error } = prof?.active_gym_id
    ? await q.eq("gym_id", prof.active_gym_id).maybeSingle()
    : await q.order("created_at").limit(1).maybeSingle();
  if (error) throw error;
  if (!rows) return null;
  return { gymId: rows.gym_id as string, role: rows.role as string };
}

/** Membership at the caller's active gym, restricted to the given roles. */
export async function requireGymRole(
  client: AnyClient,
  userId: string,
  roles: string[],
): Promise<{ gymId: string; role: string }> {
  const m = await getActiveMembership(client, userId);
  if (!m || !roles.includes(m.role)) throw new Error("Forbidden");
  return m;
}
