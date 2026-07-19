import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { ChevronLeft, User, Mail, Phone, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile/edit")({
  component: EditProfilePage,
});

function EditProfilePage() {
  const { t } = useLang();
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    if (profile) { setName(profile.name || ""); setPhone(profile.phone || ""); }
    if (user) setEmail(user.email || "");
  }, [profile, user]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("profiles").update({ name: name.trim(), phone: phone.trim() || null }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveEmail = useMutation({
    mutationFn: async () => {
      if (!email.trim()) throw new Error("Email required");
      if (email === user?.email) throw new Error("Email unchanged");
      const { error } = await supabase.auth.updateUser({ email: email.trim() });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Check both inboxes to confirm the change"),
    onError: (e: any) => toast.error(e.message),
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      if (pw.length < 6) throw new Error("Password must be at least 6 characters");
      if (pw !== pw2) throw new Error("Passwords do not match");
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password updated"); setPw(""); setPw2(""); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted"><ChevronLeft size={20} className="flip-rtl" /></Link>
      </div>
      <PageHeader title="Edit Profile" />

      <div className="space-y-5 px-5 pb-8">
        {/* Personal info */}
        <section className="card-surface p-4 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Personal Info</h2>
          <Field icon={<User size={16} />} label={t.name}>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
          </Field>
          <Field icon={<Phone size={16} />} label={t.phone}>
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" className="w-full bg-transparent text-sm outline-none" placeholder="+962 …" />
          </Field>
          <button onClick={()=>saveProfile.mutate()} disabled={saveProfile.isPending} className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground">
            {saveProfile.isPending ? "Saving…" : "Save Changes"}
          </button>
        </section>

        {/* Email */}
        <section className="card-surface p-4 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{t.email}</h2>
          <Field icon={<Mail size={16} />} label={t.email}>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full bg-transparent text-sm outline-none" />
          </Field>
          <p className="text-[11px] text-muted-foreground">You'll receive a confirmation link at both the old and new address.</p>
          <button onClick={()=>saveEmail.mutate()} disabled={saveEmail.isPending} className="w-full rounded-pill border border-primary/40 py-3 text-sm font-semibold text-primary">
            {saveEmail.isPending ? "Updating…" : "Update Email"}
          </button>
        </section>

        {/* Password */}
        <section className="card-surface p-4 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">{t.password}</h2>
          <Field icon={<Lock size={16} />} label="New password">
            <input value={pw} onChange={(e)=>setPw(e.target.value)} type="password" className="w-full bg-transparent text-sm outline-none" placeholder="••••••••" />
          </Field>
          <Field icon={<Lock size={16} />} label={t.confirmPassword}>
            <input value={pw2} onChange={(e)=>setPw2(e.target.value)} type="password" className="w-full bg-transparent text-sm outline-none" placeholder="••••••••" />
          </Field>

          <button onClick={()=>savePassword.mutate()} disabled={savePassword.isPending} className="w-full rounded-pill border border-primary/40 py-3 text-sm font-semibold text-primary">
            {savePassword.isPending ? "Updating…" : "Update Password"}
          </button>
        </section>
      </div>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </span>
      <div className="rounded-2xl border hairline bg-background px-3 py-2.5">
        {children}
      </div>
    </label>
  );
}
