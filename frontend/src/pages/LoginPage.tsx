import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { settingsApi } from "../api/services";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin@12345");
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState<{ hospitalName?: string; logoPath?: string | null; kansaltLogoPath?: string | null } | null>(null);

  const uploadBaseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || window.location.origin;
  const logoSrc = useMemo(() => branding?.logoPath ? `${uploadBaseUrl}${branding.logoPath}` : null, [branding?.logoPath, uploadBaseUrl]);
  const kansaltSrc = useMemo(() => branding?.kansaltLogoPath ? `${uploadBaseUrl}${branding.kansaltLogoPath}` : null, [branding?.kansaltLogoPath, uploadBaseUrl]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success(`Welcome to ${branding?.hospitalName || "SIMS Hospital"}`);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await settingsApi.getPublic();
        if (res.data.data) {
          setBranding(res.data.data);
        }
      } catch {
        setBranding(null);
      }
    };

    loadBranding();
  }, []);

  useEffect(() => {
    if (logoSrc) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = logoSrc;
    }
  }, [logoSrc]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-gradient-to-b from-brand-700 via-brand-600 to-slateblue p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {logoSrc ? <img src={logoSrc} alt="SIMS logo" className="h-14 w-14 rounded bg-white object-contain p-1" /> : null}
            <h1 className="text-4xl font-bold">{branding?.hospitalName || "SIMS Hospital"}</h1>
          </div>
          <p className="mt-4 max-w-md text-blue-100">
            Unified patient registration, OPD/IPD workflow, doctor prescription, billing, and print-ready documents.
          </p>
        </div>

        <div className="flex items-center gap-2 text-blue-100">
          {kansaltSrc ? <img src={kansaltSrc} alt="Kansalt" className="h-5 w-auto object-contain" /> : null}
          <span>Powered by Kansalt</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-panel">
          <div className="mb-4 flex items-center gap-3">
            {logoSrc ? <img src={logoSrc} alt="SIMS logo" className="h-12 w-12 rounded object-contain" /> : null}
            <div>
              <h2 className="text-2xl font-semibold text-slate-800">Sign In</h2>
              <p className="text-sm text-slate-500">Use your hospital credentials</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <Input label="Username" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>Default admin login: admin / Admin@12345</p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 lg:hidden">
            {kansaltSrc ? <img src={kansaltSrc} alt="Kansalt" className="h-4 w-auto object-contain" /> : null}
            <span>Powered by Kansalt</span>
          </div>
        </form>
      </div>
    </div>
  );
};
