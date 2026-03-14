import clsx from "clsx";
import { buildPublicAssetPath } from "../../utils/branding";

type PoweredByKansaltProps = {
  className?: string;
  labelClassName?: string;
  logoClassName?: string;
  stacked?: boolean;
};

export const PoweredByKansalt = ({
  className,
  labelClassName,
  logoClassName,
  stacked = false,
}: PoweredByKansaltProps) => {
  return (
    <div className={clsx("powered-by-kansalt", stacked && "powered-by-kansalt--stacked", className)}>
      <span className={clsx("powered-by-kansalt__label", labelClassName)}>Powered by</span>
      <img
        src={buildPublicAssetPath("assets/branding/kansalt-logo.svg")}
        alt="Kansalt logo"
        className={clsx("powered-by-kansalt__logo", logoClassName)}
      />
    </div>
  );
};
