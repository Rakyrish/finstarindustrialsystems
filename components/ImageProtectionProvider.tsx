"use client";

import { createContext, useContext, useMemo } from "react";
import type { ApiPublicImageProtectionSettings } from "@/lib/api";

export interface ImageProtectionState {
  watermarkEnabled: boolean;
  rightClickProtectionEnabled: boolean;
  dragProtectionEnabled: boolean;
  longPressProtectionEnabled: boolean;
}

// Fail open — if the settings fetch fails, nothing on the public site should break.
const DEFAULT_STATE: ImageProtectionState = {
  watermarkEnabled: false,
  rightClickProtectionEnabled: false,
  dragProtectionEnabled: false,
  longPressProtectionEnabled: false,
};

const ImageProtectionContext = createContext<ImageProtectionState>(DEFAULT_STATE);

export function ImageProtectionProvider({
  settings,
  children,
}: {
  settings: ApiPublicImageProtectionSettings | null;
  children: React.ReactNode;
}) {
  const value = useMemo<ImageProtectionState>(
    () => ({
      watermarkEnabled: settings?.watermark_enabled ?? false,
      rightClickProtectionEnabled: settings?.right_click_protection_enabled ?? false,
      dragProtectionEnabled: settings?.drag_protection_enabled ?? false,
      longPressProtectionEnabled: settings?.long_press_protection_enabled ?? false,
    }),
    [settings],
  );

  return (
    <ImageProtectionContext.Provider value={value}>{children}</ImageProtectionContext.Provider>
  );
}

export function useImageProtection() {
  return useContext(ImageProtectionContext);
}
