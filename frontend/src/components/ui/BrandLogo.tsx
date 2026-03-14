import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { buildAssetUrl, getDefaultHospitalLogoPath } from "../../utils/branding";

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
  const resolvedLogoSrc = useMemo(() => buildAssetUrl(logoPath, version), [logoPath, version]);
  const [imageFailed, setImageFailed] = useState(false);
  const defaultLogoSrc = useMemo(() => getDefaultHospitalLogoPath(), []);
  const fallback = (hospitalName || "H").trim().slice(0, 1).toUpperCase() || "H";

  useEffect(() => {
    setImageFailed(false);
  }, [resolvedLogoSrc]);

  const logoSrc = imageFailed ? defaultLogoSrc : resolvedLogoSrc || defaultLogoSrc;

  return (
    <div className={clsx("flex items-center justify-center overflow-hidden", className)}>
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={alt}
          className={clsx("h-full w-full object-contain", imageClassName)}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={clsx("text-sm font-semibold", fallbackClassName)}>{fallback}</span>
      )}
    </div>
  );
};
