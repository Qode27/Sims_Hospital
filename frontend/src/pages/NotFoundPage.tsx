import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";

export const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="rounded-xl border bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-slate-500">The requested page does not exist.</p>
        <Link to="/dashboard">
          <Button className="mt-4">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
};
