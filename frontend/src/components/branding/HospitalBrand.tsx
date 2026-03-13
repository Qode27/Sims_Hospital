import clsx from "clsx";

type HospitalBrandProps = {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  logoClassName?: string;
  compact?: boolean;
};

export const HospitalBrand = ({
  className,
  titleClassName,
  subtitleClassName,
  logoClassName,
  compact = false,
}: HospitalBrandProps) => {
  return (
    <div className={clsx("hospital-brand", compact && "hospital-brand--compact", className)}>
      <img
        src="/assets/branding/sims-logo.jpg"
        alt="SIMS Hospital logo"
        className={clsx("hospital-brand__logo", logoClassName)}
      />
      <div className="hospital-brand__copy">
        <h1 className={clsx("hospital-brand__title", titleClassName)}>{compact ? "SIMS Hospital" : "SIMS Hospital"}</h1>
        <p className={clsx("hospital-brand__subtitle", subtitleClassName)}>Hospital Management System</p>
      </div>
    </div>
  );
};
