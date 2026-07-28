import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGym } from "@/lib/gym";

export type ClassTypeDef = {
  key: string;
  label: string;
  gender_restriction: "none" | "female" | "male";
  credit_source: "group" | "pt";
  kids_only: boolean;
  track_restricted: boolean;
  is_builtin: boolean;
  active: boolean;
  sort_order: number;
};

export function useClassTypeDefs(opts: { onlyActive?: boolean } = {}) {
  const { onlyActive = true } = opts;
  const { gymId } = useGym();
  return useQuery({
    queryKey: ["class-type-defs", gymId, { onlyActive }],
    enabled: !!gymId,
    queryFn: async (): Promise<ClassTypeDef[]> => {
      let q = supabase
        .from("class_type_defs" as any)
        .select("*")
        .eq("gym_id", gymId!)
        .order("sort_order")
        .order("label");
      if (onlyActive) q = q.eq("active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as ClassTypeDef[]) ?? [];
    },
  });
}

export function defsByKey(defs: ClassTypeDef[] | undefined) {
  const m = new Map<string, ClassTypeDef>();
  (defs ?? []).forEach((d) => m.set(d.key, d));
  return m;
}

export function labelOf(defs: ClassTypeDef[] | undefined, key: string): string {
  return defsByKey(defs).get(key)?.label ?? key;
}
