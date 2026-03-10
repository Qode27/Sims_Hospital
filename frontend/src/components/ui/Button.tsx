import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const Button = ({ variant = "primary", className, ...props }: ButtonProps) => {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        {
          "bg-brand-600 text-white hover:bg-brand-700": variant === "primary",
          "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50": variant === "secondary",
          "bg-transparent text-slate-700 hover:bg-slate-100": variant === "ghost",
          "bg-red-600 text-white hover:bg-red-700": variant === "danger",
        },
        className,
      )}
      {...props}
    />
  );
};
