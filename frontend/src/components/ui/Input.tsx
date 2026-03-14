import clsx from "clsx";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string | null;
  hint?: string | null;
  prefix?: string;
};

export const Input = ({ label, className, error, hint, prefix, ...props }: InputProps) => {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm text-slate-700">
      {label ? <span className="font-medium leading-5">{label}</span> : null}
      <div
        className={clsx(
          "flex h-11 items-center rounded-xl border bg-white transition focus-within:ring-4",
          error
            ? "border-red-300 ring-red-100 focus-within:border-red-400 focus-within:ring-red-100"
            : "border-slate-300 ring-brand-100 hover:border-slate-400 focus-within:border-brand-500 focus-within:ring-brand-100",
        )}
      >
        {prefix ? <span className="border-r border-slate-200 px-3 text-sm font-medium text-slate-500">{prefix}</span> : null}
        <input
          className={clsx(
            "h-full w-full rounded-xl bg-transparent px-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400",
            prefix ? "rounded-l-none pl-3" : "",
            className,
          )}
          {...props}
        />
      </div>
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
};
