import type { ReactNode } from "react";

export const FormSection = ({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <section className={`rounded-3xl border border-slate-200/80 bg-slate-50/70 p-5 ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
};
