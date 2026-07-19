import darkLogo from "@/assets/att-logo-light.asset.json"; // silver logo for dark bg
import lightLogo from "@/assets/att-logo-dark.asset.json"; // black logo for light bg
import { useTheme } from "@/lib/providers";

export function Logo({ size = 72, className = "" }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const src = theme === "dark" ? darkLogo.url : lightLogo.url;
  return <img src={src} alt="ATT Academy" width={size} height={size} className={className} style={{ width: size, height: size, objectFit: "contain" }} />;
}
