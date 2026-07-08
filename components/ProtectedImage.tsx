"use client";

import Image, { type ImageProps } from "next/image";
import type { CSSProperties, DragEvent, MouseEvent } from "react";
import { useImageProtection } from "./ImageProtectionProvider";

/**
 * Thin next/image wrapper that enforces the site's global right-click /
 * drag / long-press protection toggles (Features 6, 7, 8). Watermarking
 * itself needs no client-side logic — the public product API already
 * serves the watermarked `src` URL when enabled, so this component only
 * handles interaction blocking.
 */
export default function ProtectedImage({ className, style, onContextMenu, onDragStart, ...props }: ImageProps) {
  const { rightClickProtectionEnabled, dragProtectionEnabled, longPressProtectionEnabled } =
    useImageProtection();

  const handleContextMenu = (event: MouseEvent<HTMLImageElement>) => {
    if (rightClickProtectionEnabled) event.preventDefault();
    onContextMenu?.(event);
  };

  const handleDragStart = (event: DragEvent<HTMLImageElement>) => {
    if (dragProtectionEnabled) event.preventDefault();
    onDragStart?.(event);
  };

  const mergedStyle: CSSProperties = {
    ...style,
    ...(longPressProtectionEnabled ? ({ WebkitTouchCallout: "none" } as CSSProperties) : {}),
  };

  return (
    <Image
      {...props}
      draggable={dragProtectionEnabled ? false : props.draggable}
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
      className={[className, longPressProtectionEnabled ? "select-none" : ""].filter(Boolean).join(" ")}
      style={mergedStyle}
    />
  );
}
