import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BedDouble,
  ClipboardPlus,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Stethoscope,
  Users,
  UserSquare2,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { settingsApi } from "../../api/services";
import { useAuth } from "../../context/AuthContext";

type NavItem = {
  to: string;
  label: string;
  roles: Array<"ADMIN" | "RECEPTION" | "DOCTOR">;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", roles: ["ADMIN", "RECEPTION", "DOCTOR"], icon: <LayoutDashboard size={18} /> },
  { to: "/patients", label: "Patients", roles: ["ADMIN", "RECEPTION", "DOCTOR"], icon: <Users size={18} /> },
  { to: "/visits", label: "OPD", roles: ["ADMIN", "RECEPTION"], icon: <Activity size={18} /> },
  { to: "/ipd", label: "IPD", roles: ["ADMIN", "RECEPTION", "DOCTOR"], icon: <BedDouble size={18} /> },
  { to: "/invoices", label: "Billing", roles: ["ADMIN", "RECEPTION", "DOCTOR"], icon: <CreditCard size={18} /> },
  { to: "/prescriptions", label: "Prescription", roles: ["ADMIN", "RECEPTION", "DOCTOR"], icon: <ClipboardPlus size={18} /> },
  { to: "/doctor", label: "Doctor Portal", roles: ["DOCTOR"], icon: <Stethoscope size={18} /> },
  { to: "/doctors", label: "Doctors", roles: ["ADMIN"], icon: <Stethoscope size={18} /> },
  { to: "/admin/users", label: "Users", roles: ["ADMIN"], icon: <UserSquare2 size={18} /> },
  { to: "/admin/settings", label: "Settings", roles: ["ADMIN"], icon: <Settings size={18} /> },
];

export const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [branding, setBranding] = useState<{ logoPath?: string | null; kansaltLogoPath?: string | null; hospitalName?: string } | null>(null);

  const uploadBaseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || window.location.origin;
  const logoSrc = useMemo(() => branding?.logoPath ? `${uploadBaseUrl}${branding.logoPath}` : null, [branding?.logoPath, uploadBaseUrl]);
  const kansaltSrc = useMemo(() => branding?.kansaltLogoPath ? `${uploadBaseUrl}${branding.kansaltLogoPath}` : null, [branding?.kansaltLogoPath, uploadBaseUrl]);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const res = await settingsApi.get();
        setBranding(res.data.data);
      } catch {
        setBranding(null);
      }
    };
    loadBranding();
  }, []);

  useEffect(() => {
    if (!logoSrc) return;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = logoSrc;
  }, [logoSrc]);

  const allowedItems = navItems.filter((item) => item.roles.includes(user!.role));

  return (
    <div className="flex min-h-screen bg-transparent">
      <aside className="w-64 border-r border-slate-200 bg-white/95 p-4 backdrop-blur-sm">
        <div className="mb-6 rounded-xl bg-brand-600 p-4 text-white">
          <div className="flex items-center gap-3">
            {logoSrc ? <img src={logoSrc} alt="SIMS logo" className="h-10 w-10 rounded bg-white object-contain p-1" /> : null}
            <div>
              <p className="text-xs uppercase tracking-wider text-blue-100">{branding?.hospitalName || "SIMS Hospital"}</p>
              <h1 className="mt-1 text-xl font-semibold">Operations Panel</h1>
            </div>
          </div>
        </div>

        <nav className="space-y-1">
          {allowedItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100",
                ].join(" ")
              }
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {logoSrc ? <img src={logoSrc} alt="SIMS logo" className="h-9 w-9 rounded object-contain" /> : null}
            <div>
              <p className="text-sm text-slate-500">Signed in as</p>
              <p className="font-semibold text-slate-800">
                {user?.name} <span className="text-xs text-slate-500">({user?.role})</span>
              </p>
            </div>
          </div>
          <button
            className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        </header>

        <section className="flex-1 p-6">
          <Outlet />
        </section>

        <footer className="border-t border-slate-200 bg-white/90 px-6 py-3 text-sm text-slate-600">
          <div className="flex items-center justify-center gap-2">
            {kansaltSrc ? <img src={kansaltSrc} alt="Kansalt" className="h-5 w-auto object-contain" /> : null}
            <span>Powered by Kansalt</span>
          </div>
        </footer>
      </main>
    </div>
  );
};
