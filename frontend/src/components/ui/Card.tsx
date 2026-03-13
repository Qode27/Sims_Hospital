export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return <div className={`rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-panel ${className}`}>{children}</div>;
};
