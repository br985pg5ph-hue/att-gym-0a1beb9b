import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const applySchema = z.object({
  gymName: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(50).regex(slugRegex, "Slug must be lowercase letters, numbers, and hyphens only"),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email().max(255),
  ownerPhone: z.string().trim().min(5).max(30),
  password: z.string().min(8).max(128),
});

const statusSchema = z.object({
  gymId: z.string().uuid(),
  status: z.enum(["pending", "active", "suspended", "trial"]),
});

const setupUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  maps_url: z.string().trim().max(500).optional(),
  instagram_url: z.string().trim().max(500).optional(),
  whatsapp_number: z.string().trim().max(50).optional(),
  primary_color: z.string().trim().max(50).optional(),
  secondary_color: z.string().trim().max(50).optional(),
  hours: z.array(z.object({ day: z.string(), open: z.string(), close: z.string() })).optional(),
  logo_url: z.string().trim().max(500).optional(),
});

/** Resolve the platform gym id (the non-operational gym that owns platform admins). */
async function getPlatformGymId(adminClient: any): Promise<string> {
  const { data, error } = await adminClient.from("gyms").select("id").eq("slug", "platform").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Platform gym not found");
  return data.id as string;
}

export const applyForGym = createServerFn({ method: "POST" })
  .inputValidator((input) => applySchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate unique slug
    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("gyms")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (lookupErr) throw lookupErr;
    if (existing) throw new Error("That gym URL slug is already taken");

    // Create pending gym
    const { data: gym, error: gymErr } = await supabaseAdmin
      .from("gyms")
      .insert({
        slug: data.slug,
        name: data.gymName,
        status: "pending",
        address: "",
        phone: "",
        hours: [],
        theme: {},
      })
      .select("id")
      .single();
    if (gymErr) throw gymErr;
    const gymId = gym.id as string;

    // Create auth user
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.ownerEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.ownerName,
        phone: data.ownerPhone,
        gym_slug: data.slug,
      },
    });
    if (authErr) {
      // Rollback gym creation
      await supabaseAdmin.from("gyms").delete().eq("id", gymId);
      throw new Error(authErr.message);
    }
    const userId = authData.user!.id;

    // handle_new_user trigger already created a profile from user_metadata.
    // Update it to staff / gym owner.
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        name: data.ownerName,
        phone: data.ownerPhone,
        gym_id: gymId,
        role: "admin",
      })
      .eq("id", userId);
    if (profErr) {
      // Rollback
      await supabaseAdmin.auth.admin.deleteUser(userId);
      await supabaseAdmin.from("gyms").delete().eq("id", gymId);
      throw profErr;
    }

    return { success: true, gymId };
  });

export const getPlatformAdminContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const platformGymId = await getPlatformGymId(supabaseAdmin);

    const { data: prof, error } = await context.supabase
      .from("profiles")
      .select("id, role, gym_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;

    const isPlatformAdmin = prof?.role === "owner" && prof.gym_id === platformGymId;
    return { isPlatformAdmin, platformGymId };
  });

export const listGymsForPlatform = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ status: z.enum(["pending", "active", "suspended", "trial", "all"]).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const platformGymId = await getPlatformGymId(supabaseAdmin);

    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("role, gym_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (prof?.role !== "owner" || prof.gym_id !== platformGymId) {
      throw new Error("Forbidden");
    }

    let q = supabaseAdmin.from("gyms").select("*").neq("slug", "platform").order("created_at", { ascending: false });
    if (data.status && data.status !== "all") {
      q = q.eq("status", data.status);
    }
    const { data: gyms, error } = await q;
    if (error) throw error;

    // Fetch owner profiles for each gym
    const gymIds = (gyms ?? []).map((g) => g.id);
    const { data: owners, error: ownersErr } = await supabaseAdmin
      .from("profiles")
      .select("gym_id, name, phone")
      .in("role", ["admin", "staff"])
      .in("gym_id", gymIds);
    if (ownersErr) throw ownersErr;

    const ownerByGym = new Map<string, { name: string | null; phone: string | null }>();
    for (const o of owners ?? []) {
      ownerByGym.set(o.gym_id as string, { name: o.name, phone: o.phone });
    }

    return (gyms ?? []).map((g) => ({
      ...g,
      owner: ownerByGym.get(g.id as string) ?? null,
    }));
  });

export const updateGymStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const platformGymId = await getPlatformGymId(supabaseAdmin);

    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("role, gym_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (prof?.role !== "owner" || prof.gym_id !== platformGymId) {
      throw new Error("Forbidden");
    }

    const { error } = await supabaseAdmin.from("gyms").update({ status: data.status }).eq("id", data.gymId);
    if (error) throw error;
    return { success: true };
  });

export const getGymSetupContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("role, gym_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!prof || (prof.role !== "admin" && prof.role !== "owner") || !prof.gym_id) {
      throw new Error("Forbidden");
    }

    const { data: gym, error } = await context.supabase.from("gyms").select("*").eq("id", prof.gym_id).maybeSingle();
    if (error) throw error;
    if (!gym) throw new Error("Gym not found");
    return { gym };
  });

/** Portal sign-in context: allowed for gym staff, gym admins and platform owners. */
export const getPortalContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("role, gym_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const allowed = ["staff", "admin", "owner"];
    if (!prof || !allowed.includes(prof.role) || !prof.gym_id) {
      throw new Error("Forbidden");
    }

    const { data: gym, error } = await context.supabase
      .from("gyms")
      .select("id, slug, name, status")
      .eq("id", prof.gym_id)
      .maybeSingle();
    if (error) throw error;
    if (!gym) throw new Error("Gym not found");
    return { role: prof.role as string, gym };
  });



export const updateGymSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setupUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("role, gym_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!prof || (prof.role !== "admin" && prof.role !== "owner") || !prof.gym_id) {
      throw new Error("Forbidden");
    }

    const update = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.lat !== undefined && { lat: data.lat }),
      ...(data.lng !== undefined && { lng: data.lng }),
      ...(data.maps_url !== undefined && { maps_url: data.maps_url }),
      ...(data.instagram_url !== undefined && { instagram_url: data.instagram_url }),
      ...(data.whatsapp_number !== undefined && { whatsapp_number: data.whatsapp_number }),
      ...(data.primary_color !== undefined && { primary_color: data.primary_color }),
      ...(data.secondary_color !== undefined && { secondary_color: data.secondary_color }),
      ...(data.hours !== undefined && { hours: data.hours }),
      ...(data.logo_url !== undefined && { logo_url: data.logo_url }),
    };

    const { error } = await context.supabase.from("gyms").update(update as any).eq("id", prof.gym_id);
    if (error) throw error;
    return { success: true };
  });
