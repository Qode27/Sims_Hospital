import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { settingsApi } from "../api/services";
import type { HospitalSettings } from "../types";

type BrandingSnapshot = Pick<HospitalSettings, "hospitalName" | "logoPath" | "kansaltLogoPath" | "updatedAt"> | null;

type BrandingContextValue = {
  branding: BrandingSnapshot;
  refreshBranding: () => Promise<void>;
  updateBranding: (value: BrandingSnapshot) => void;
};

const BRANDING_STORAGE_KEY = "sims_branding_cache";

const BrandingContext = createContext<BrandingContextValue | null>(null);

const readCachedBranding = (): BrandingSnapshot => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as BrandingSnapshot;
  } catch {
    window.localStorage.removeItem(BRANDING_STORAGE_KEY);
    return null;
  }
};

const persistBranding = (value: BrandingSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!value) {
    window.localStorage.removeItem(BRANDING_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(value));
};

export const BrandingProvider = ({ children }: { children: React.ReactNode }) => {
  const [branding, setBranding] = useState<BrandingSnapshot>(() => readCachedBranding());

  const updateBranding = (value: BrandingSnapshot) => {
    setBranding(value);
    persistBranding(value);
  };

  const refreshBranding = async () => {
    try {
      const res = await settingsApi.getPublic();
      updateBranding(res.data.data ?? null);
    } catch {
      updateBranding(null);
    }
  };

  useEffect(() => {
    refreshBranding();
  }, []);

  useEffect(() => {
    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<BrandingSnapshot>;
      updateBranding(customEvent.detail ?? null);
    };

    window.addEventListener("branding:updated", handleBrandingUpdate);
    return () => window.removeEventListener("branding:updated", handleBrandingUpdate);
  }, []);

  const value = useMemo(
    () => ({
      branding,
      refreshBranding,
      updateBranding,
    }),
    [branding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within BrandingProvider");
  }
  return context;
};
