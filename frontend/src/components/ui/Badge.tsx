import clsx from "clsx";

export const Badge = ({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) => {
  return (
    <span
      className={clsx("rounded-full px-2 py-1 text-xs font-semibold", {
        "bg-slate-100 text-slate-700": tone === "default",
        "bg-green-100 text-green-700": tone === "success",
        "bg-yellow-100 text-yellow-700": tone === "warning",
        "bg-red-100 text-red-700": tone === "danger",
      })}
    >
      {children}
    </span>
  );
};
