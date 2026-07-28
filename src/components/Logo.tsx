import darkLogo from "@/assets/att-logo-light.asset.json"; // silver logo for dark bg
import lightLogo from "@/assets/att-logo-dark.asset.json"; // black logo for light bg
import { useTheme } from "@/lib/providers";

export function Logo({ size = 72, className = "", logoUrl }: { size?: number; className?: string; logoUrl?: string | null }) {
  const { theme } = useTheme();
  const fallback = theme === "dark" ? darkLogo.url : lightLogo.url;
  const src = logoUrl ?? fallback;
  return <img src={src} alt="ATT Gym Hub" width={size} height={size} className={className} style={{ width: size, height: size, objectFit: "contain" }} />;
}
