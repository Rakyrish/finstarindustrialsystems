"use client";

import { createContext, useContext, useMemo, useEffect } from "react";
import type { ApiPublicImageProtectionSettings } from "@/lib/api";
import { message } from "antd";

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

  function GlobalProtection() {
    const { rightClickProtectionEnabled } = useImageProtection();

    useEffect(() => {
      if (!rightClickProtectionEnabled) {
        document.body.classList.remove('disable-select');
        return;
      }

      const handleContextMenu = (e: Event) => {
        e.preventDefault();
        message.warning('Right-click is disabled');
      };

      const handleCopy = (e: ClipboardEvent) => {
        e.preventDefault();
        message.warning('Copying is disabled');
      };

      const handleCut = (e: ClipboardEvent) => {
        e.preventDefault();
        message.warning('Cutting is disabled');
      };

      document.body.classList.add('disable-select');
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('copy', handleCopy);
      document.addEventListener('cut', handleCut);

      return () => {
        document.body.classList.remove('disable-select');
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('copy', handleCopy);
        document.removeEventListener('cut', handleCut);
      };
    }, [rightClickProtectionEnabled]);

    return null;
  }

  return (
    <ImageProtectionContext.Provider value={value}>
      {children}
      <GlobalProtection />
    </ImageProtectionContext.Provider>
  );
}

export function useImageProtection() {
  return useContext(ImageProtectionContext);
}