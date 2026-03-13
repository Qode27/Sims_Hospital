import clsx from "clsx";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string | null;
  hint?: string | null;
};

export const Select = ({ label, className, children, error, hint, ...props }: SelectProps) => {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm text-slate-700">
      {label ? <span className="font-medium leading-5">{label}</span> : null}
      <select
        className={clsx(
          "h-11 rounded-xl border bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:ring-4",
          error
            ? "border-red-300 ring-red-100 focus:border-red-400 focus:ring-red-100"
            : "border-slate-300 ring-brand-100 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-100",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
};
