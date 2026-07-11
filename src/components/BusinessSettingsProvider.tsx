"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getBusinessSettings,
  type BusinessSettings,
} from "@/lib/api";

type BusinessSettingsContextValue = {
  settings: BusinessSettings;
  loading: boolean;
  refresh: () => Promise<void>;
  setSettings: (settings: BusinessSettings) => void;
};

const defaultSettings: BusinessSettings = {
  businessName: "Bakery",
  address: "",
  phone: "",
  email: null,
  ownerName: null,
};

const BusinessSettingsContext =
  createContext<BusinessSettingsContextValue | null>(null);

export function BusinessSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getBusinessSettings();
      setSettings(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refresh,
      setSettings,
    }),
    [settings, loading, refresh],
  );

  return (
    <BusinessSettingsContext.Provider value={value}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);
  if (!context) {
    throw new Error(
      "useBusinessSettings must be used within BusinessSettingsProvider",
    );
  }
  return context;
}

export function useBusinessSettingsOptional() {
  return useContext(BusinessSettingsContext);
}
