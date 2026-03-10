import clsx from "clsx";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input = ({ label, className, ...props }: InputProps) => {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-slate-700">
      {label ? <span className="font-medium">{label}</span> : null}
      <input
        className={clsx(
          "h-10 rounded-lg border border-slate-300 bg-white px-3 text-slate-800 outline-none ring-brand-500 focus:ring-2",
          className,
        )}
        {...props}
      />
    </label>
  );
};
