import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (prof?.role !== "staff") throw redirect({ to: "/home" });
  },
  component: AdminPage,
});

type Tab = "announcements" | "classes" | "coaches" | "members";

function AdminPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("announcements");
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "announcements", label: t.manageAnnouncements },
    { key: "classes", label: t.manageClasses },
    { key: "coaches", label: t.manageCoaches },
    { key: "members", label: t.membersList },
  ];
  return (
    <div>
      <PageHeader title={t.admin} />
      <div className="px-5">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3">
          {tabs.map(x => (
            <button key={x.key} onClick={()=>setTab(x.key)}
              className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium ${tab===x.key ? "border-primary bg-primary text-primary-foreground" : "hairline bg-card"}`}>
              {x.label}
            </button>
          ))}
        </div>
        {tab === "announcements" && <AnnouncementsAdmin />}
        {tab === "classes" && <ClassesAdmin />}
        {tab === "coaches" && <CoachesAdmin />}
        {tab === "members" && <MembersAdmin />}
      </div>
    </div>
  );
}

function AnnouncementsAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [tag, setTag] = useState("News");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({ tag, title, body, author_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setBody(""); toast.success("Posted"); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); qc.invalidateQueries({ queryKey: ["announcements"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("announcements").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-announcements"] }),
  });
  return (
    <div className="space-y-4">
      <div className="card-surface space-y-2 p-4">
        <div className="flex gap-2">
          <select value={tag} onChange={(e)=>setTag(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
            <option>News</option><option>Event</option><option>Update</option>
          </select>
          <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        </div>
        <textarea placeholder="Body" value={body} onChange={(e)=>setBody(e.target.value)} rows={3}
          className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm outline-none focus:border-primary" />
        <button onClick={()=>create.mutate()} disabled={!title || !body || create.isPending}
          className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">
          <Plus size={14} className="inline"/> Post
        </button>
      </div>
      <div className="space-y-2">
        {data.map((a: any) => (
          <div key={a.id} className="card-surface flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{a.tag}</p>
              <p className="font-display text-lg leading-tight">{a.title}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{a.body}</p>
            </div>
            <button onClick={()=>del.mutate(a.id)} className="shrink-0 text-destructive"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClassesAdmin() {
  const qc = useQueryClient();
  const [type, setType] = useState<"pt"|"women_only"|"mixed"|"kids">("mixed");
  const [coachId, setCoachId] = useState("");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(15);

  const { data: classes = [] } = useQuery({
    queryKey: ["admin-classes"],
    queryFn: async () => (await supabase.from("classes")
      .select("id, type, title, starts_at, capacity, coaches(name), bookings(id, status, child_id, profiles(name), children(name))")
      .order("starts_at")).data ?? [],
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches"], queryFn: async () => (await supabase.from("coaches").select("*").order("sort_order")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("classes").insert({ type, coach_id: coachId || null, title, starts_at: startsAt, capacity });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setStartsAt(""); toast.success("Class added"); qc.invalidateQueries({ queryKey: ["admin-classes"] }); qc.invalidateQueries({ queryKey: ["classes"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("classes").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-classes"] }),
  });
  const removeAttendee = useMutation({
    mutationFn: async (bid: string) => { await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bid); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-classes"] }),
  });

  return (
    <div className="space-y-4">
      <div className="card-surface space-y-2 p-4">
        <div className="grid grid-cols-2 gap-2">
          <select value={type} onChange={(e)=>setType(e.target.value as any)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
            <option value="mixed">Mixed</option><option value="women_only">Women Only</option><option value="pt">PT</option><option value="kids">Kids</option>
          </select>
          <select value={coachId} onChange={(e)=>setCoachId(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm">
            <option value="">Coach…</option>
            {coaches.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <input placeholder="Title" value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <div className="grid grid-cols-2 gap-2">
          <input type="datetime-local" value={startsAt} onChange={(e)=>setStartsAt(e.target.value)} className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
          <input type="number" placeholder="Capacity" value={capacity} onChange={(e)=>setCapacity(Number(e.target.value))} className="rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        </div>
        <button onClick={()=>create.mutate()} disabled={!title || !startsAt}
          className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"><Plus size={14} className="inline"/> Add class</button>
      </div>
      <div className="space-y-2">
        {classes.map((c: any) => {
          const active = (c.bookings ?? []).filter((b:any)=>b.status==="upcoming");
          return (
            <div key={c.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg leading-none">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(c.starts_at).toLocaleString()} • {c.coaches?.name || "—"} • {active.length}/{c.capacity}</p>
                </div>
                <button onClick={()=>del.mutate(c.id)} className="text-destructive"><Trash2 size={16}/></button>
              </div>
              {active.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {active.map((b: any) => (
                    <li key={b.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                      <span>
                        {b.child_id
                          ? <>{b.children?.name ?? "Child"} <span className="text-muted-foreground">(child of {b.profiles?.name ?? "member"})</span></>
                          : (b.profiles?.name ?? "Member")}
                      </span>
                      <button onClick={()=>removeAttendee.mutate(b.id)} className="text-destructive text-[10px]">Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoachesAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState(""); const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState(""); const [photoUrl, setPhotoUrl] = useState("");
  const { data = [] } = useQuery({ queryKey: ["coaches"], queryFn: async () => (await supabase.from("coaches").select("*").order("sort_order")).data ?? [] });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("coaches").insert({ name, specialty, bio, photo_url: photoUrl || null });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setSpecialty(""); setBio(""); setPhotoUrl(""); toast.success("Added"); qc.invalidateQueries({ queryKey: ["coaches"] }); },
  });
  const del = useMutation({ mutationFn: async (id: string) => { await supabase.from("coaches").delete().eq("id", id); }, onSuccess: () => qc.invalidateQueries({ queryKey: ["coaches"] }) });
  return (
    <div className="space-y-4">
      <div className="card-surface space-y-2 p-4">
        <input placeholder="Name" value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <input placeholder="Specialty" value={specialty} onChange={(e)=>setSpecialty(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <textarea placeholder="Bio" value={bio} onChange={(e)=>setBio(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm" rows={2}/>
        <input placeholder="Photo URL (optional)" value={photoUrl} onChange={(e)=>setPhotoUrl(e.target.value)} className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"/>
        <button onClick={()=>create.mutate()} disabled={!name || !specialty} className="w-full rounded-pill bg-primary py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">Add coach</button>
      </div>
      <div className="space-y-2">
        {data.map((c: any) => (
          <div key={c.id} className="card-surface flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-display text-lg leading-none">{c.name}</p>
              <p className="text-[10px] uppercase tracking-widest text-primary">{c.specialty}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{c.bio}</p>
            </div>
            <button onClick={()=>del.mutate(c.id)} className="shrink-0 text-destructive"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersAdmin() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => (await supabase.from("profiles")
      .select("id, name, membership_status, classes_remaining, role, children(id, name, classes_remaining)")
      .order("name")).data ?? [],
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addFor, setAddFor] = useState<string | null>(null);
  const [childId, setChildId] = useState<string>("");
  const [classes, setClasses] = useState<number>(10);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [note, setNote] = useState("");

  const addCredit = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("transactions").insert({
        member_id: memberId,
        child_id: childId || null,
        classes,
        type: "credit",
        payment_method: method,
        description: note || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Classes added");
      setAddFor(null); setChildId(""); setClasses(10); setMethod("cash"); setNote("");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      {data.map((m: any) => {
        const kids = m.children ?? [];
        const hasKids = kids.length > 0;
        const isOpen = !!expanded[m.id];
        const isAdding = addFor === m.id;
        return (
          <div key={m.id} className="card-surface p-4">
            <button
              type="button"
              onClick={() => hasKids && setExpanded(s => ({ ...s, [m.id]: !s[m.id] }))}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display text-lg leading-none">{m.name || "—"}</p>
                  {hasKids && (
                    <span className="rounded-pill bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {kids.length} {kids.length === 1 ? "child" : "children"}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">{m.role} • {m.membership_status} • {m.classes_remaining ?? 0} classes left</p>
              </div>
              {hasKids && (
                <span className="shrink-0 text-muted-foreground">
                  {isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </span>
              )}
            </button>
            {hasKids && isOpen && (
              <ul className="mt-3 space-y-1">
                {kids.map((k: any) => (
                  <li key={k.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-1.5 text-xs">
                    <span>{k.name}</span>
                    <span className="text-muted-foreground">{k.classes_remaining ?? 0} classes left</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              {!isAdding ? (
                <button
                  onClick={() => { setAddFor(m.id); setChildId(""); }}
                  className="rounded-pill bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground"
                >
                  <Plus size={12} className="inline"/> Add classes
                </button>
              ) : (
                <div className="space-y-2 rounded-xl border hairline p-3">
                  {hasKids && (
                    <select
                      value={childId}
                      onChange={(e)=>setChildId(e.target.value)}
                      className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                    >
                      <option value="">Credit to {m.name || "member"}</option>
                      {kids.map((k: any) => <option key={k.id} value={k.id}>Credit to {k.name}</option>)}
                    </select>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" min={1} value={classes}
                      onChange={(e)=>setClasses(Math.max(1, Number(e.target.value)))}
                      className="rounded-xl border hairline bg-card px-3 py-2 text-sm"
                      placeholder="# classes"
                    />
                    <select
                      value={method} onChange={(e)=>setMethod(e.target.value as "cash"|"card")}
                      className="rounded-xl border hairline bg-card px-3 py-2 text-sm"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                    </select>
                  </div>
                  <input
                    placeholder="Note (optional)"
                    value={note} onChange={(e)=>setNote(e.target.value)}
                    className="w-full rounded-xl border hairline bg-card px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={()=>addCredit.mutate(m.id)}
                      disabled={addCredit.isPending || classes < 1}
                      className="flex-1 rounded-pill bg-primary py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      Add {classes} {classes === 1 ? "class" : "classes"}
                    </button>
                    <button
                      onClick={()=>setAddFor(null)}
                      className="rounded-pill border hairline px-3 py-2 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

