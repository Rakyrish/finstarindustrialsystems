"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export interface Client {
    name: string;
    logoUrl: string;
    website?: string;
}

interface ClientsSectionProps {
    clients: Client[];
    autoPlay?: boolean;
    interval?: number;
}

export default function ClientsSection({
    clients,
    autoPlay = true,
    interval = 3000,
}: ClientsSectionProps) {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (!autoPlay) return;
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % clients.length);
        }, interval);
        return () => clearInterval(timer);
    }, [clients.length, autoPlay, interval]);

    const next = () => setIndex((prev) => (prev + 1) % clients.length);
    const prev = () => setIndex((prev) => (prev - 1 + clients.length) % clients.length);

    const client = clients[index];

    return (
        <section className="relative overflow-hidden bg-slate-50 py-20">
            {/* Decorative top border */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent" />

            {/* Subtle background dot pattern */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                style={{
                    backgroundImage: `radial-gradient(circle, #94a3b8 1px, transparent 1px)`,
                    backgroundSize: "28px 28px",
                }}
            />

            {/* Soft warm glow top-center */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-orange-100 blur-3xl opacity-60" />

            <div className="relative mx-auto max-w-4xl px-4 text-center">

                {/* ── Header ── */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-orange-500">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-400" />
                        Our Clients
                    </span>

                    <h2
                        className="mb-3 text-3xl font-black tracking-tight text-slate-900 lg:text-4xl"
                        style={{ fontFamily: "'Barlow Condensed', 'Barlow', sans-serif" }}
                    >
                        Trusted by Leading Companies
                    </h2>

                    <p className="mx-auto mb-12 max-w-md text-sm leading-relaxed text-slate-500">
                        We proudly supply and service top organizations across East Africa
                    </p>
                </motion.div>

                {/* ── Logo showcase card ── */}
                <div className="relative mb-10 flex items-center justify-center">
                    <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-10 py-12 shadow-xl shadow-slate-100">

                        {/* Corner accents */}
                        <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-2 border-t-2 border-orange-400" />
                        <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-2 border-t-2 border-orange-400" />
                        <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-2 border-l-2 border-orange-400" />
                        <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-2 border-r-2 border-orange-400" />

                        {/* Inner gradient sheen */}
                        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-orange-50/40 to-transparent" />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={client.name}
                                initial={{ opacity: 0, scale: 0.88, y: 14 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.06, y: -14 }}
                                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="relative z-10 flex flex-col items-center"
                            >
                                <div className="relative h-24 w-48">
                                    <Image
                                        src={client.logoUrl}
                                        alt={client.name}
                                        fill
                                        className="object-contain"
                                        sizes="192px"
                                    />
                                </div>

                                <div className="mt-5 flex items-center gap-2">
                                    <div className="h-px w-8 bg-orange-300" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        {client.name}
                                    </p>
                                    <div className="h-px w-8 bg-orange-300" />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* ── Navigation ── */}
                <div className="mb-6 flex items-center justify-center gap-5">
                    <button
                        onClick={prev}
                        aria-label="Previous client"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-orange-400 hover:text-orange-500 hover:shadow-md hover:shadow-orange-100 active:scale-95"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Clickable dots */}
                    <div className="flex items-center gap-2">
                        {clients.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIndex(i)}
                                aria-label={`Go to client ${i + 1}`}
                                className={`h-2 rounded-full transition-all duration-300 ${i === index
                                        ? "w-6 bg-orange-500"
                                        : "w-2 bg-slate-300 hover:bg-slate-400"
                                    }`}
                            />
                        ))}
                    </div>

                    <button
                        onClick={next}
                        aria-label="Next client"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm shadow-orange-200 transition-all hover:bg-orange-600 hover:shadow-md hover:shadow-orange-300 active:scale-95"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>

                {/* Counter */}
                <p className="tabular-nums text-xs text-slate-400">
                    <span className="font-semibold text-slate-600">{index + 1}</span>
                    {" / "}
                    {clients.length}
                </p>
            </div>

            {/* Bottom separator */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        </section>
    );
}