import clsx from "clsx";
import { buildAssetUrl } from "../../utils/branding";

type BrandLogoProps = {
  logoPath?: string | null;
  version?: string | number | null;
  hospitalName?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  imageClassName?: string;
};

export const BrandLogo = ({
  logoPath,
  version,
  hospitalName,
  alt,
  className,
  fallbackClassName,
  imageClassName,
}: BrandLogoProps) => {
  const logoSrc = buildAssetUrl(logoPath, version);
  const fallback = (hospitalName || "H").trim().slice(0, 1).toUpperCase() || "H";

  return (
    <div className={clsx("flex items-center justify-center overflow-hidden", className)}>
      {logoSrc ? (
        <img src={logoSrc} alt={alt} className={clsx("h-full w-full object-contain", imageClassName)} />
      ) : (
        <span className={clsx("text-sm font-semibold", fallbackClassName)}>{fallback}</span>
      )}
    </div>
  );
};
