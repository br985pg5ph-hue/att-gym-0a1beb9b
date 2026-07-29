import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { gp } from "@/lib/gym";
import { AuthBrand } from "@/components/AuthBrand";

export const Route = createFileRoute("/gym/$gymSlug/forgot")({
  ssr: false,
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else setSent(true);
  };
  return (
    <div className="nuvo-site mx-auto flex min-h-screen w-full max-w-md flex-col justify-center bg-background px-6">
      <AuthBrand subtitle="Reset password" size={56} />
      {sent ? (
        <p className="mt-4 text-sm text-muted-foreground">Check your email for a reset link.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input required type="email" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)}
            className="w-full rounded-xl border hairline bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <button className="w-full rounded-pill bg-primary py-3 text-sm font-semibold text-primary-foreground">Send reset link</button>
        </form>
      )}
      <Link to={gp("/auth")} className="mt-6 text-center text-xs text-muted-foreground">← Back to sign in</Link>
    </div>
  );
}
