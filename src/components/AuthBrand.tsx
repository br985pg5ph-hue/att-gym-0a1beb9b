import { NuvoLogo } from "@/components/NuvoLogo";

/**
 * Shared Nuvo brand header for every auth screen (sign in, sign up, staff
 * login, password reset). Auth is always Nuvo-branded — individual gyms are
 * tenants on the platform, not the brand.
 */
export function AuthBrand({ subtitle, size = 64 }: { subtitle?: string; size?: number }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <NuvoLogo size={size} />
      <h1 className="mt-4 font-display text-4xl tracking-tight">
        Nuvo<span className="text-primary">.</span>
      </h1>
      {subtitle ? (
        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
