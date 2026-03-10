import clsx from "clsx";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

export const Textarea = ({ label, className, ...props }: TextareaProps) => {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-slate-700">
      {label ? <span className="font-medium">{label}</span> : null}
      <textarea
        className={clsx(
          "min-h-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none ring-brand-500 focus:ring-2",
          className,
        )}
        {...props}
      />
    </label>
  );
};
