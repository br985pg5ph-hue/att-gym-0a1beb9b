import nuvoLogo from "@/assets/nuvo-logo.png";
import { useTheme } from "@/lib/providers";

/**
 * Tenant logo. Falls back to the Nuvo platform mark when a gym has not
 * uploaded its own logo — never to any individual gym's branding.
 */
export function Logo({ size = 72, className = "", logoUrl }: { size?: number; className?: string; logoUrl?: string | null }) {
  useTheme();
  const src = logoUrl ?? nuvoLogo;
  return <img src={src} alt="Gym logo" width={size} height={size} className={className} style={{ width: size, height: size, objectFit: "contain" }} />;
}
