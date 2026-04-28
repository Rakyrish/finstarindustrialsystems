import Link from "next/link";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function EmptyState({
  title = "No results found",
  description = "Try adjusting your filters or search term.",
  icon = "🔍",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="text-6xl mb-4 opacity-80">{icon}</div>
      <h3 className="text-xl font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm mb-6">{description}</p>
      {action?.href ? (
        <Link
          href={action.href}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
        >
          {action.label}
        </Link>
      ) : null}
      {action?.onClick && !action.href ? (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
