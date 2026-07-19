import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { useLang, useTheme } from "@/lib/providers";
import { ChevronLeft, ChevronRight, Moon, Sun, Languages, Bell, FileText, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const nav = useNavigate();
  const [notif, setNotif] = useState(true);

  const del = async () => {
    if (!confirm("Delete your account permanently?")) return;
    await supabase.auth.signOut();
    toast.info("Contact support to complete deletion.");
    nav({ to: "/auth" });
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-3 pt-4">
        <Link to="/profile" className="grid h-9 w-9 place-items-center rounded-pill hover:bg-muted"><ChevronLeft size={20} className="flip-rtl" /></Link>
      </div>
      <PageHeader title={t.settings} />
      <div className="space-y-4 px-5">
        <Link to="/profile/edit" className="card-surface flex items-center gap-3 p-4 hover:bg-muted/40">
          <UserCog size={18} className="text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">Edit Profile</p>
            <p className="text-xs text-muted-foreground">Name, phone, email, password</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground flip-rtl" />
        </Link>
        <div className="card-surface divide-y hairline overflow-hidden">

          <div className="flex items-center gap-3 p-4">
            {theme === "dark" ? <Moon size={18} className="text-muted-foreground"/> : <Sun size={18} className="text-muted-foreground"/>}
            <span className="flex-1 text-sm font-medium">{t.theme}</span>
            <div className="flex rounded-pill border hairline p-0.5 text-xs">
              <button onClick={()=>setTheme("dark")} className={`rounded-pill px-3 py-1 ${theme==="dark"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>{t.dark}</button>
              <button onClick={()=>setTheme("light")} className={`rounded-pill px-3 py-1 ${theme==="light"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>{t.lightMode}</button>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Languages size={18} className="text-muted-foreground"/>
            <span className="flex-1 text-sm font-medium">{t.language}</span>
            <div className="flex rounded-pill border hairline p-0.5 text-xs">
              <button onClick={()=>setLang("en")} className={`rounded-pill px-3 py-1 ${lang==="en"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>{t.english}</button>
              <button onClick={()=>setLang("ar")} className={`rounded-pill px-3 py-1 ${lang==="ar"?"bg-primary text-primary-foreground":"text-muted-foreground"}`}>{t.arabic}</button>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Bell size={18} className="text-muted-foreground"/>
            <span className="flex-1 text-sm font-medium">{t.notifications}</span>
            <button onClick={()=>setNotif(!notif)} className={`h-6 w-11 rounded-pill p-0.5 transition ${notif ? "bg-primary":"bg-muted"}`}>
              <span className={`block h-5 w-5 rounded-pill bg-white transition ${notif ? "translate-x-5" : ""}`}/>
            </button>
          </div>
        </div>

        <div className="card-surface divide-y hairline overflow-hidden">
          <button className="flex w-full items-center gap-3 p-4 text-start">
            <FileText size={18} className="text-muted-foreground"/>
            <span className="flex-1 text-sm font-medium">{t.legal}</span>
          </button>
          <button onClick={del} className="flex w-full items-center gap-3 p-4 text-start text-destructive">
            <Trash2 size={18}/>
            <span className="flex-1 text-sm font-medium">{t.deleteAccount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
