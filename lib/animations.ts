// lib/animations.ts
// ─────────────────────────────────────────────────────────────
// Shared Framer Motion variants for the Finstar homepage.
// Import these in any component that needs consistent motion.
// ─────────────────────────────────────────────────────────────

import type { Variants } from "framer-motion";

// ── Viewport defaults ────────────────────────────────────────
// Use with whileInView on every section container.
export const VIEWPORT = { once: true, margin: "-60px" } as const;

// ── Fade up (single element) ─────────────────────────────────
export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" as const },
    },
};

// ── Fade in (no movement) ────────────────────────────────────
export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.5, ease: "easeOut" as const },
    },
};

// ── Stagger container ────────────────────────────────────────
// Wrap a grid/list with this; children get itemVariants.
export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.09,
            delayChildren: 0.05,
        },
    },
};

// ── Stagger item (child of staggerContainer) ─────────────────
export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: "easeOut" as const },
    },
};

// ── Card hover (use on whileHover) ───────────────────────────
export const cardHover = {
    y: -5,
    boxShadow:
        "0 20px 40px -12px rgba(0,0,0,0.12)",
    transition: { duration: 0.2, ease: "easeOut" as const },
};

// ── Logo hover (grayscale → color handled by CSS; this adds scale) ──
export const logoHover = {
    scale: 1.06,
    transition: { duration: 0.2, ease: "easeOut" as const },
};

// ── Section header ────────────────────────────────────────────
export const sectionHeader: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" as const },
    },
};