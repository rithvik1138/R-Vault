import { useState, useEffect } from "react";

interface PrivacySettings {
  showLastSeen: boolean;
  notificationsEnabled: boolean;
}

const DEFAULT_SETTINGS: PrivacySettings = {
  showLastSeen: true,
  notificationsEnabled: true,
};

export const usePrivacySettings = () => {
  const [settings, setSettings] = useState<PrivacySettings>(() => {
    const stored = localStorage.getItem("securehub-privacy");
    return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("securehub-privacy", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return { settings, updateSetting };
};
