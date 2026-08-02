import { supabase } from "@/integrations/supabase/client";
import { resolveMemberEntry } from "@/lib/memberRouting";
import { isStaffRole } from "@/lib/membership";

/** One place a signed-in account can go after the shared sign-in. */
export type Space =
  | { kind: "member"; label: string; sublabel: string }
  | { kind: "admin"; label: string; sublabel: string; slug: string }
  | { kind: "console"; label: string; sublabel: string };

const LAST_SPACE_KEY = "nuvo:last-space";

export function rememberSpace(key: string) {
  try {
    localStorage.setItem(LAST_SPACE_KEY, key);
  } catch {
    /* storage unavailable */
  }
}

export function lastSpace(): string | null {
  try {
    return localStorage.getItem(LAST_SPACE_KEY);
  } catch {
    return null;
  }
}

export function spaceKey(s: Space) {
  return s.kind === "admin" ? `admin:${s.slug}` : s.kind;
}

type Row = {
  role: string;
  gyms: { slug: string; name: string; status: string } | null;
};

/**
 * Everyone signs in through the same page, so we derive which spaces the
 * account belongs to: the member app, one gym admin per staff role, and the
 * platform console for platform admins.
 */
export async function resolveSpaces(userId: string): Promise<Space[]> {
  const [{ data: profile }, { data }] = await Promise.all([
    supabase.from("profiles").select("is_platform_admin").eq("id", userId).maybeSingle(),
    supabase.from("gym_members").select("role, gyms!inner(slug, name, status)").eq("user_id", userId),
  ]);

  const rows = ((data as unknown as Row[]) ?? []).filter(
    (r) => r.gyms && r.gyms.status !== "suspended",
  );

  const spaces: Space[] = [];

  if (profile?.is_platform_admin) {
    spaces.push({
      kind: "console",
      label: "Platform console",
      sublabel: "Manage every gym on Nuvo",
    });
  }

  for (const r of rows) {
    if (isStaffRole(r.role)) {
      spaces.push({
        kind: "admin",
        label: r.gyms!.name,
        sublabel: "Gym admin dashboard",
        slug: r.gyms!.slug,
      });
    }
  }

  const hasMemberRole = rows.some((r) => r.role === "member");
  if (hasMemberRole || rows.length === 0) {
    spaces.push({
      kind: "member",
      label: "Member app",
      sublabel: hasMemberRole ? "Book classes and manage your membership" : "Find and join your gym",
    });
  }

  return spaces;
}

/** The URL a space opens at. */
export async function spaceDestination(space: Space, userId: string): Promise<string> {
  if (space.kind === "console") return "/platform-owner/dashboard";
  if (space.kind === "admin") return `/gym/${space.slug}/admin`;
  return resolveMemberEntry(userId);
}

/**
 * Where a signed-in account lands: straight into its only space, the space it
 * used last, or the picker when there is a real choice to make.
 */
export async function resolveEntry(userId: string): Promise<string> {
  const spaces = await resolveSpaces(userId);
  if (spaces.length === 0) return "/app/join";
  if (spaces.length === 1) {
    rememberSpace(spaceKey(spaces[0]));
    return spaceDestination(spaces[0], userId);
  }
  return "/spaces";
}
