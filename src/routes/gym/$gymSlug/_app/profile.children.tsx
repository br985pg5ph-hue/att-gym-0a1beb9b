import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGym, gp } from "@/lib/gym";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useChildren } from "@/lib/providers";
import { ChevronLeft, Plus, Trash2, User, Ticket, Flame } from "lucide-react";
import { toast } from "sonner";
import { CountrySelect } from "@/components/CountrySelect";
import { COUNTRIES as COUNTRY_CODES } from "@/lib/countries";

function splitPhone(raw: string): { cc: string; rest: string } {
  if (!raw) return { cc: "+962", rest: "" };
  const match = COUNTRY_CODES
    .slice()
    .sort((a, b) => b.code.length - a.code.length)
    .find((c) => raw.startsWith(c.code));
  if (match) return { cc: match.code, rest: raw.slice(match.code.length).trim() };
  return { cc: "+962", rest: raw };
}

export const Route = createFileRoute("/gym/$gymSlug/_app/profile/children")({
  validateSearch: (s: Record<string, unknown>) => ({
    new: s.new ? 1 : undefined,
    welcome: s.welcome ? 1 : undefined,
  }),
  component: ChildrenPage,
});

const EXPERIENCE = [
  { id: "none", label: "Complete beginner" },
  { id: "some", label: "Some experience" },
  { id: "intermediate", label: "Intermediate" },
  { id: "advanced", label: "Advanced" },
];

function ChildrenPage() {
  const { user, profile, refresh } = useAuth();
  const { children, refreshChildren, setSelectedChildId } = useChildren();
  const search = useSearch({ from: "/_app/profile/children" });
  const nav = useNavigate();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  useEffect(() => {
    if (search.new) setEditing("new");
  }, [search.new]);


  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        {!search.welcome && (
          <Link to={gp("/profile")} className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted">
            <ChevronLeft size={20} className="flip-rtl" />
          </Link>
        )}
      </div>
      <PageHeader
        title={search.welcome ? (children.length === 0 ? "Add your child" : "Any more kids?") : "My Children"}
        subtitle={
          search.welcome
            ? children.length === 0
              ? "Set up their profile to tailor their experience"
              : `${children.length} added — add another or continue`
            : `${children.length} ${children.length === 1 ? "child" : "children"}`
        }
      />


      <div className="space-y-3 px-5">
        {children.map((c) => (
          <div key={c.id} className="card-surface p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setSelectedChildId(c.id); toast.success(`Viewing ${c.name}`); }}
                className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary"
              >
                {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : <User size={20} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg leading-none">{c.name}</p>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Ticket size={11} /> {(c as any).pt_sessions_remaining ?? 0} left</span>
                  <span className="inline-flex items-center gap-1"><Flame size={11} /> {c.streak}d</span>
                </div>
              </div>
              <button
                onClick={() => setEditing(c.id)}
                className="rounded-pill border hairline px-3 py-1.5 text-xs font-medium"
              >
                Edit
              </button>
            </div>
          </div>
        ))}

        <button
          onClick={() => setEditing("new")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed hairline bg-card/50 py-5 text-sm font-semibold text-primary"
        >
          <Plus size={16} /> Add {children.length === 0 ? "child" : "another child"}
        </button>

        {search.welcome && children.length > 0 && (
          <button
            onClick={() => nav({ to: gp("/home") })}
            className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Continue to app
          </button>
        )}

        {!profile?.is_parent && children.length === 0 && !search.welcome && (
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Adding a child will switch your account into Parent Mode.
          </p>
        )}
      </div>

      {editing && user && (
        <ChildForm
          parentId={user.id}
          child={editing === "new" ? null : children.find((c) => c.id === editing) ?? null}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            await refreshChildren();
            if (!profile?.is_parent) {
              await supabase.from("profiles").update({ is_parent: true }).eq("id", user.id);
              await refresh();
            }
            setEditing(null);
            // In welcome flow, stay on this page so the parent can add more kids or tap Continue.
          }}
        />
      )}
    </div>
  );
}

function ChildForm({ parentId, child, onClose, onSaved }: {
  parentId: string;
  child: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(child?.name ?? "");
  const [dob, setDob] = useState(child?.date_of_birth ?? "");
  const [gender, setGender] = useState(child?.gender ?? "");
  const [experience, setExperience] = useState(child?.experience_level ?? "");
  const [injuries, setInjuries] = useState(child?.injuries_notes ?? "");
  const [emName, setEmName] = useState(child?.emergency_contact_name ?? "");
  const initialPhone = splitPhone(child?.emergency_contact_phone ?? "");
  const [emCc, setEmCc] = useState(initialPhone.cc);
  const [emPhone, setEmPhone] = useState(initialPhone.rest);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { gymId } = useGym();

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    const payload = {
      parent_id: parentId,
      gym_id: gymId!,
      name: name.trim(),
      date_of_birth: dob || null,
      gender: gender || null,
      experience_level: experience || null,
      injuries_notes: injuries.trim() || null,
      emergency_contact_name: emName.trim() || null,
      emergency_contact_phone: emPhone.trim() ? `${emCc} ${emPhone.trim()}` : null,
    };
    const { error } = child
      ? await supabase.from("children").update(payload).eq("id", child.id)
      : await supabase.from("children").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(child ? "Updated" : "Child added");
    onSaved();
  };

  const remove = async () => {
    if (!child) return;
    if (!confirm(`Remove ${child.name}? This deletes all their bookings.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("children").delete().eq("id", child.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl border-t hairline bg-background p-6 pb-10"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{child ? "Edit child" : "Add child"}</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground">Close</button>
        </div>
        <div className="space-y-3">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Child's name" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <input type="date" value={dob ?? ""} onChange={(e) => setDob(e.target.value)} className="input" />
            </Field>
            <Field label="Gender">
              <select value={gender ?? ""} onChange={(e) => setGender(e.target.value)} className="input">
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
          </div>
          <Field label="Experience">
            <div className="grid grid-cols-2 gap-2">
              {EXPERIENCE.map((e) => (
                <button key={e.id} type="button" onClick={() => setExperience(e.id)}
                  className={`rounded-pill border px-3 py-2 text-xs font-medium ${experience === e.id ? "border-primary bg-primary/10 text-primary" : "hairline bg-card"}`}>
                  {e.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Injuries / conditions (optional)">
            <textarea value={injuries ?? ""} onChange={(e) => setInjuries(e.target.value)} rows={3} className="input" placeholder="e.g. asthma, old wrist injury" />
          </Field>
          <Field label="Emergency contact name">
            <input value={emName ?? ""} onChange={(e) => setEmName(e.target.value)} className="input" />
          </Field>
          <Field label="Emergency contact phone">
            <div className="flex items-stretch gap-2">
              <CountrySelect value={emCc} onChange={setEmCc} />
              <input
                value={emPhone ?? ""}
                onChange={(e) => setEmPhone(e.target.value)}
                className="input flex-1"
                type="tel"
                inputMode="tel"
                placeholder="7xxxxxxx"
              />
            </div>
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {child && (
            <button onClick={remove} disabled={deleting} className="grid h-11 w-11 place-items-center rounded-pill border border-destructive/40 text-destructive">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={save} disabled={saving} className="flex-1 rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? "…" : child ? "Save" : "Add child"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
