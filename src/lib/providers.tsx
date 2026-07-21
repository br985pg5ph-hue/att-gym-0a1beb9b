import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { dict, type Lang, type Dict } from "./i18n";

// ---------- THEME ----------
type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "dark", setTheme: () => {} });

// ---------- LANG ----------
const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: Dict }>({ lang: "en", setLang: () => {}, t: dict.en });

// ---------- AUTH ----------
type Profile = {
  id: string; name: string; phone: string | null; avatar_url: string | null;
  role: "member" | "staff"; membership_status: string;
  referral_code: string; streak: number; classes_attended: number; classes_remaining: number; interests: string[];
  is_parent: boolean;
};

export type Child = {
  id: string; parent_id: string; name: string; date_of_birth: string | null; gender: string | null;
  experience_level: string | null; injuries_notes: string | null;
  emergency_contact_name: string | null; emergency_contact_phone: string | null;
  classes_remaining: number; streak: number; classes_attended: number; avatar_url: string | null;
};

const AuthCtx = createContext<{ user: User | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void> }>({
  user: null, profile: null, loading: true, refresh: async () => {},
});

// ---------- CHILD (selected child in parent mode) ----------
const ChildCtx = createContext<{
  children: Child[]; selectedChildId: string | null; setSelectedChildId: (id: string | null) => void;
  selectedChild: Child | null; refreshChildren: () => Promise<void>;
}>({ children: [], selectedChildId: null, setSelectedChildId: () => {}, selectedChild: null, refreshChildren: async () => {} });

export function AppProviders({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [lang, setLangState] = useState<Lang>("en");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [childList, setChildList] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(null);

  const setSelectedChildId = (id: string | null) => {
    setSelectedChildIdState(id);
    if (id) localStorage.setItem("selectedChildId", id);
    else localStorage.removeItem("selectedChildId");
  };

  // hydrate from localStorage
  useEffect(() => {
    const t = (localStorage.getItem("theme") as Theme | null) ?? "dark";
    const l = (localStorage.getItem("lang") as Lang | null) ?? "en";
    setThemeState(t);
    setLangState(l);
    const saved = localStorage.getItem("selectedChildId");
    if (saved) setSelectedChildIdState(saved);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("dark", "light");
    html.classList.add(theme);
    html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    html.setAttribute("lang", lang);
    localStorage.setItem("theme", theme);
    localStorage.setItem("lang", lang);
  }, [theme, lang]);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
  };

  const loadChildren = async (uid: string) => {
    const { data } = await supabase.from("children").select("*").eq("parent_id", uid).order("created_at");
    const list = (data ?? []) as Child[];
    setChildList(list);
    // Preserve current selection if still valid; otherwise default to "Myself" (null).
    setSelectedChildIdState((prev) => {
      if (prev && list.some((c) => c.id === prev)) return prev;
      localStorage.removeItem("selectedChildId");
      return null;
    });

  };

  const refresh = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    if (data.user) {
      await loadProfile(data.user.id);
      await loadChildren(data.user.id);
    } else {
      setProfile(null); setChildList([]); setSelectedChildIdState(null);
    }
  };

  const refreshChildren = async () => {
    if (user) await loadChildren(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        Promise.all([loadProfile(data.session.user.id), loadChildren(data.session.user.id)])
          .finally(() => setLoading(false));
      } else setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadChildren(session.user.id);
      } else {
        setProfile(null); setChildList([]); setSelectedChildIdState(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const selectedChild = childList.find((c) => c.id === selectedChildId) ?? null;

  return (
    <ThemeCtx.Provider value={{ theme, setTheme: setThemeState }}>
      <LangCtx.Provider value={{ lang, setLang: setLangState, t: dict[lang] }}>
        <AuthCtx.Provider value={{ user, profile, loading, refresh }}>
          <ChildCtx.Provider value={{ children: childList, selectedChildId, setSelectedChildId, selectedChild, refreshChildren }}>
            {children}
          </ChildCtx.Provider>
        </AuthCtx.Provider>
      </LangCtx.Provider>
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
export const useLang = () => useContext(LangCtx);
export const useAuth = () => useContext(AuthCtx);
export const useChildren = () => useContext(ChildCtx);
