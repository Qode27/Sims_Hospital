import clsx from "clsx";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string | null;
  hint?: string | null;
};

export const Textarea = ({ label, className, error, hint, ...props }: TextareaProps) => {
  return (
    <label className="flex w-full flex-col gap-1.5 text-sm text-slate-700">
      {label ? <span className="font-medium leading-5">{label}</span> : null}
      <textarea
        className={clsx(
          "min-h-28 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4",
          error
            ? "border-red-300 ring-red-100 focus:border-red-400 focus:ring-red-100"
            : "border-slate-300 ring-brand-100 hover:border-slate-400 focus:border-brand-500 focus:ring-brand-100",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
};
