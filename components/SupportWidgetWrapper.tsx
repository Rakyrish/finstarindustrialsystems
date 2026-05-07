"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const SupportWidget = dynamic(() => import("@/components/SupportWidget"), {
  ssr: false,
});

/**
 * Wrapper that renders the support widget.
 */
export default function SupportWidgetWrapper() {
    const pathname = usePathname();

    if (pathname.startsWith("/admin")) return null;

    return <SupportWidget />;
}
