import nuvoLogo from "@/assets/nuvo-logo.png";

export function NuvoLogo({ size = 72, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={nuvoLogo}
      alt="Nuvo"
      width={size}
      height={size}
      loading="lazy"
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
