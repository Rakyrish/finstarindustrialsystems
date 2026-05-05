import React from "react";

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
}

export default function SectionWrapper({
  children,
  className = "",
  id,
  dark = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`py-16 lg:py-24 px-4 sm:px-6 lg:px-8 ${dark ? "bg-slate-900 text-white" : "bg-white dark:bg-slate-900"
        } ${className}`}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  subtitle?: string;
  title: string;
  description?: string;
  centered?: boolean;
  light?: boolean;
}

export function SectionHeader({
  subtitle,
  title,
  description,
  centered = true,
  light = false,
}: SectionHeaderProps) {
  return (
    <div className={`mb-12 ${centered ? "text-center" : ""}`}>
      {subtitle && (
        <span className="inline-block text-orange-500 font-semibold text-sm uppercase tracking-widest mb-2">
          {subtitle}
        </span>
      )}
      <h2
        className={`text-3xl lg:text-4xl font-bold leading-tight ${light ? "text-white" : "text-slate-900 dark:text-white"
          }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-3 text-lg max-w-2xl ${centered ? "mx-auto" : ""} ${light ? "text-slate-300" : "text-slate-500 dark:text-slate-400"
            }`}
        >
          {description}
        </p>
      )}
    </div>
  );
}
