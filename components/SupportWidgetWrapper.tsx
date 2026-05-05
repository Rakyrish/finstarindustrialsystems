"use client";

import { usePathname } from "next/navigation";
import SupportWidget from "@/components/SupportWidget";

/**
 * Wrapper that renders the support widget.
 */
export default function SupportWidgetWrapper() {
    const pathname = usePathname();

    // Temporarily showing on all pages for testing
    // if (pathname.startsWith("/admin")) return null;

    return <SupportWidget />;
}
