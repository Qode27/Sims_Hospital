export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-panel ${className}`}>{children}</div>;
};
