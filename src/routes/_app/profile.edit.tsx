import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useAuth, useLang } from "@/lib/providers";
import { ChevronLeft, User, Mail, Phone, Lock, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

async function fileToAvatarDataUrl(file: File, size = 256): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(size / bmp.width, size / bmp.height, 1);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const side = Math.min(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = side; canvas.height = side;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, (w - side) / 2 / scale * -1 + 0, 0, w, h);
  // recentre crop
  ctx.clearRect(0, 0, side, side);
  ctx.drawImage(bmp, (bmp.width - Math.min(bmp.width, bmp.height)) / 2, (bmp.height - Math.min(bmp.width, bmp.height)) / 2, Math.min(bmp.width, bmp.height), Math.min(bmp.width, bmp.height), 0, 0, side, side);
  return canvas.toDataURL("image/jpeg", 0.85);
}

import { COUNTRIES } from "@/lib/countries";
import { CountrySelect } from "@/components/CountrySelect";


export const Route = createFileRoute("/_app/profile/edit")({
  component: EditProfilePage,
});

function EditProfilePage() {
  const { t } = useLang();
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [cc, setCc] = useState("+962");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [avatarSaving, setAvatarSaving] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    try {
      setAvatarSaving(true);
      const dataUrl = await fileToAvatarDataUrl(file);
      const { error } = await supabase.from("profiles").update({ avatar_url: dataUrl }).eq("id", user.id);
      if (error) throw error;
      await refresh();
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Photo updated");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setAvatarSaving(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setAvatarSaving(true);
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    setAvatarSaving(false);
    if (error) return toast.error(error.message);
    await refresh();
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Photo removed");
  };

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      const full = profile.phone || "";
      const matched = COUNTRIES.slice().sort((a, b) => b.code.length - a.code.length).find((c) => full.startsWith(c.code));
      if (matched) {
        setCc(matched.code);
        setPhone(full.slice(matched.code.length));
      } else {
        setPhone(full);
      }
    }
    if (user) setEmail(user.email || "");
  }, [profile, user]);

  const fullPhone = `${cc}${phone}`.trim();

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("profiles").update({ name: name.trim(), phone: fullPhone || null }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Profile updated"); await refresh(); qc.invalidateQueries({ queryKey: ["profile"] }); },
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
        {/* Avatar */}
        <section className="card-surface flex items-center gap-4 p-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-pill bg-primary/15 text-primary">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={32} />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarSaving}
              className="flex w-full items-center justify-center gap-2 rounded-pill bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Camera size={14} />
              {avatarSaving ? "Saving…" : profile?.avatar_url ? "Change Photo" : "Upload Photo"}
            </button>
            {profile?.avatar_url && (
              <button
                onClick={handleAvatarRemove}
                disabled={avatarSaving}
                className="flex w-full items-center justify-center gap-2 rounded-pill border hairline py-2 text-xs font-medium text-muted-foreground"
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </section>

        {/* Personal info */}
        <section className="card-surface p-4 space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Personal Info</h2>
          <Field icon={<User size={16} />} label={t.name}>
            <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-transparent text-sm outline-none" />
          </Field>
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <Phone size={16} />{t.phone}
            </span>
            <div className="flex items-end gap-2">
              <CountrySelect value={cc} onChange={setCc} />
              <div className="flex-1 rounded-2xl border hairline bg-background px-3 py-2.5">
                <input value={phone} onChange={(e)=>setPhone(e.target.value)} inputMode="tel" className="w-full bg-transparent text-sm outline-none" placeholder="7xxxxxxx" />
              </div>
            </div>
          </label>
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

function Field({ icon, label, children, className = "" }: { icon: React.ReactNode; label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        {icon}{label}
      </span>
      <div className="rounded-2xl border hairline bg-background px-3 py-2.5">
        {children}
      </div>
    </label>
  );
}
