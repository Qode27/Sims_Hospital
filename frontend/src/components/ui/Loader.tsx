export const Loader = ({ text = "Loading..." }: { text?: string }) => {
  return (
    <div className="flex items-center justify-center p-8 text-sm text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="ml-2">{text}</span>
    </div>
  );
};
