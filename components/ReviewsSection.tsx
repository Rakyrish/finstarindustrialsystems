"use client";

import { motion } from "framer-motion";

export interface GoogleReview {
    author_name: string;
    rating: number;
    text: string;
    time: number; // unix timestamp
    profile_photo_url?: string;
}

interface ReviewsSectionProps {
    reviews: GoogleReview[];
    overallRating: number;
    totalRatings: number;
}

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const sectionVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
    const sizeClass = size === "lg" ? "h-6 w-6" : size === "md" ? "h-5 w-5" : "h-4 w-4";
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`${sizeClass} ${star <= rating ? "text-amber-400" : "text-slate-200 dark:text-slate-700"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() / 1000) - timestamp);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
}

export default function ReviewsSection({
    reviews,
    overallRating,
    totalRatings,
}: ReviewsSectionProps) {
    const displayReviews = reviews.slice(0, 6);

    return (
        <section className="bg-slate-50 py-12 dark:bg-slate-900/50 lg:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    className="mb-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={sectionVariants}
                >
                    <div className="flex-1">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-orange-500">
                            Customer Reviews
                        </p>
                        <h2 className="mb-2 text-2xl font-extrabold text-slate-900 dark:text-white lg:text-3xl">
                            What Our Clients Say
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Real reviews from Google — updated daily
                        </p>
                    </div>

                    {/* Overall Rating Badge */}
                    <div className="flex shrink-0 flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <div className="text-5xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                            {overallRating.toFixed(1)}
                        </div>
                        <StarRating rating={Math.round(overallRating)} size="md" />
                        <p className="mt-1.5 text-xs text-slate-400">
                            {totalRatings.toLocaleString()} reviews on
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                            {/* Google G logo */}
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Google</span>
                        </div>
                    </div>
                </motion.div>

                {/* Review Cards */}
                <motion.div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-60px" }}
                    variants={containerVariants}
                >
                    {displayReviews.map((review, index) => (
                        <motion.div
                            key={index}
                            variants={cardVariants}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
                        >
                            {/* Reviewer */}
                            <div className="mb-3 flex items-center gap-3">
                                {review.profile_photo_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={review.profile_photo_url}
                                        alt={review.author_name}
                                        className="h-9 w-9 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">
                                        {getInitials(review.author_name)}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                        {review.author_name}
                                    </p>
                                    <p className="text-xs text-slate-400">{timeAgo(review.time)}</p>
                                </div>
                                <div className="ml-auto shrink-0">
                                    <StarRating rating={review.rating} />
                                </div>
                            </div>

                            {/* Review text */}
                            <p className="line-clamp-4 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {review.text}
                            </p>

                            {/* Google attribution */}
                            <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-700">
                                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                <span className="text-xs text-slate-400">Posted on Google</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}