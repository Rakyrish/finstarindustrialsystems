"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export interface Brand {
    name: string;
    logoUrl: string;
    website?: string;
}

interface BrandsSectionProps {
    brands: Brand[];
}

const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.07 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: "easeOut" as const },
    },
};

const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

function BrandCard({ brand }: { brand: Brand }) {
    const card = (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -4, boxShadow: "0 12px 32px 0 rgba(251,146,60,0.10)" }}
            transition={{ duration: 0.22 }}
            className="
                group flex flex-col items-center justify-center gap-3
                rounded-2xl border border-slate-100 bg-white
                px-6 py-7 shadow-sm
                transition-all duration-300
                hover:border-orange-200 hover:bg-orange-50/40
                dark:border-slate-700 dark:bg-slate-800/70
                dark:hover:border-orange-500/40 dark:hover:bg-slate-800
            "
            style={{ willChange: "transform" }}
        >
            {/* Logo */}
            <div className="relative h-12 w-full transition-all duration-300 [filter:grayscale(0%)_opacity(1)] group-hover:[filter:grayscale(0%)_opacity(1)]">
                <Image
                    src={brand.logoUrl}
                    alt={`${brand.name} logo`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 640px) 40vw, (max-width: 1024px) 20vw, 14vw"
                    loading="lazy"
                />
            </div>

            {/* Name */}
            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors duration-200 group-hover:text-orange-500 dark:text-slate-500 dark:group-hover:text-orange-400">
                {brand.name}
            </p>
        </motion.div>
    );

    return brand.website ? (
        <a href={brand.website} target="_blank" rel="noopener noreferrer" aria-label={brand.name}>
            {card}
        </a>
    ) : (
        <div>{card}</div>
    );
}

export default function BrandsSection({ brands }: BrandsSectionProps) {
    if (!brands || brands.length === 0) return null;

    return (
        <section className="relative overflow-hidden bg-slate-50 py-14 dark:bg-slate-900/60 lg:py-20">
            {/* Top separator */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
            {/* Bottom separator */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />

            {/* Soft background glow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[600px] -translate-x-1/2 rounded-full bg-orange-100/50 blur-3xl dark:bg-orange-900/10" />

            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

                {/* ── Header ── */}
                <motion.div
                    className="mb-10 text-center"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={sectionVariants}
                >
                    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-orange-500 dark:border-orange-800/60 dark:bg-orange-900/20 dark:text-orange-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                        Brands We Carry
                    </span>

                    <h2
                        className="mb-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white lg:text-4xl"
                        style={{ fontFamily: "'Barlow Condensed', 'Barlow', sans-serif" }}
                    >
                        World-Class Brands, Local Expertise
                    </h2>

                    <p className="mx-auto max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        We partner with globally recognised manufacturers to bring you
                        reliable, high-performance industrial equipment.
                    </p>
                </motion.div>

                {/* ── Brand grid ── */}
                <motion.div
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={containerVariants}
                >
                    {brands.map((brand) => (
                        <BrandCard key={brand.name} brand={brand} />
                    ))}
                </motion.div>

                {/* ── Bottom note ── */}
                <motion.p
                    className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                >
                    And many more trusted international manufacturers.
                </motion.p>
            </div>
        </section>
    );
}