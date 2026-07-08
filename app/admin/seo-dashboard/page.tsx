"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiSeoDashboard, getSeoDashboard } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

// Icons
const TargetIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>;
const AwardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>;
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
const CircleSlashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="9" y1="9" x2="15" y2="15" /></svg>;
const ShieldIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm animate-pulse h-80 flex flex-col">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-6" />
      <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
    </div>
  );
}

const DIMENSION_LABELS: Record<string, string> = {
  title_optimization: "Title Optimization",
  meta_optimization: "Meta Optimization",
  content_depth: "Content Depth",
  keyword_coverage: "Keyword Coverage",
  internal_linking: "Internal Linking",
  schema_coverage: "Schema Coverage",
  image_seo: "Image SEO",
  readability: "Readability",
};

export default function SeoDashboardPage() {
  const [stats, setStats] = useState<ApiSeoDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await getSeoDashboard();
        setStats(data);
      } catch {
        setError("Failed to load SEO dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Issue Statistics</h3>
            <div className="h-[200px]">
              <div className="flex items-center justify-center text-slate-400">Loading issue data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return <div className="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error || "Data not available"}</div>;
  }

  const tooltipStyle = {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "12px",
    color: "#fff",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  };

  const statCards = [
    { label: "Average SEO Score", value: `${stats.average_score}/100`, sub: `${stats.products_with_seo} products with published SEO`, icon: TargetIcon, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
    { label: "Optimized (>90)", value: stats.optimized_count, sub: "Meeting the optimization bar", icon: AwardIcon, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Total Products", value: stats.total_products, sub: "Full catalog", icon: PackageIcon, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Never Generated", value: stats.products_never_generated, sub: "No SEO draft created yet", icon: CircleSlashIcon, color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10" },
    { label: "Total Issues Found", value: Object.values(stats.issue_counts || {}).reduce((sum, count) => sum + count, 0), sub: "Across all products", icon: ShieldIcon, color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10" },
    { label: "Indexed Pages", value: `${stats.indexed_count}/${stats.total_products}`, sub: "Appearing in search results", icon: SearchIcon, color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10" },
    { label: "Last Updated", value: stats.last_updated ? new Date(stats.last_updated).toLocaleDateString() : "No data", sub: "Most recent SEO update", icon: SearchIcon2, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
    { label: "Schema Enabled", value: `${stats.schema_enabled_count}/${stats.products_with_seo}`, sub: "Pages with structured data", icon: SearchIcon2, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500/10" },
  ];

  const distributionData = Object.entries(stats.score_distribution).map(([range, count]) => ({ range, count }));
  const DIST_COLORS: Record<string, string> = { "0-59": "#ef4444", "60-79": "#f59e0b", "80-89": "#3b82f6", "90-100": "#10b981" };

  const dimensionData = Object.entries(stats.dimension_averages).map(([dim, value]) => ({
    name: DIMENSION_LABELS[dim] || dim,
    value,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">SEO Score Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Catalog-wide view of AI-generated SEO quality.</p>
      </div>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm p-5 shadow-sm transition-all duration-300 hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-lg dark:shadow-none hover:-translate-y-0.5 group">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                  {Icon() as React.ReactNode}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tracking-tight">{card.value}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{card.sub}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* --- Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Score Distribution</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Published products grouped by score band</p>
          <div className="h-[280px]">
            {distributionData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="count" nameKey="range" stroke="none">
                    {distributionData.map((entry) => (
                      <Cell key={entry.range} fill={DIST_COLORS[entry.range] || "#94a3b8"} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => [`${value} products`, String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No published SEO data yet</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Average Score by Dimension</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Where content is strong vs. weak</p>
          <div className="h-[280px]">
            {dimensionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dimensionData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} width={140} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: unknown) => [`${value}/100`, "Avg score"]} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
                  <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No published SEO data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* --- Issue Analytics --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Issue Severity Distribution</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Distribution of SEO issues by severity level</p>
          <div className="h-[280px]">
            {stats.issue_severity_distribution && Object.keys(stats.issue_severity_distribution).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: "High", value: stats.issue_severity_distribution.high || 0, color: "#ef4444" },
                    { name: "Medium", value: stats.issue_severity_distribution.medium || 0, color: "#f59e0b" },
                    { name: "Low", value: stats.issue_severity_distribution.low || 0, color: "#10b981" },
                    { name: "Info", value: stats.issue_severity_distribution.info || 0, color: "#3b82f6" },
                  ]} cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" nameKey="name" stroke="none">
                    {[
                      { name: "High", color: "#ef4444" },
                      { name: "Medium", color: "#f59e0b" },
                      { name: "Low", color: "#10b981" },
                      { name: "Info", color: "#3b82f6" },
                    ].map(({ name, color }, idx) => (
                      <Cell key={`severity-${idx}`} fill={color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: unknown, name: unknown) => [`${value} issues`, String(name)]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No issue data available</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Top SEO Issues</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Most frequently occurring issues across the catalog</p>
          <div className="h-[280px]">
            {stats.top_issues && stats.top_issues.length > 0 ? (
              <div className="space-y-3">
                {stats.top_issues.map((issue, index) => (
                  <div key={issue.issue_id} className="border-l-4 pl-4 border-red-500/20 dark:border-red-500/30 bg-white/50 dark:bg-white/10 p-3 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          index === 0 ? "bg-red-100 text-red-800" : index === 1 ? "bg-amber-100 text-amber-800" : index === 2 ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                          <h4 className="font-semibold text-slate-900 dark:text-white">{issue.issue_name}</h4>
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{issue.count} occurrences</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800/50 rounded-full h-2">
                          <div
                            className={`h-2 bg-red-500 rounded-full transition-all duration-500 w-[${Math.min(
                              (issue.count / Math.max(...stats.top_issues.map(i => i.count)), 1) * 100
                            )}%]`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No issue data available</div>
            )}
          </div>
        </div>
      </div>

      {/* --- Top / Lowest scoring products --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">Top Scoring Products</h3>
          <ProductScoreList items={stats.top_products} emptyLabel="No published SEO data yet" />
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-4">Lowest Scoring Products</h3>
          <ProductScoreList items={stats.lowest_products} emptyLabel="No published SEO data yet" />
        </div>
      </div>
    </div>
  );
}

function ProductScoreList({
  items,
  emptyLabel,
}: {
  items: { product_id: number; product__name: string; score_overall: number }[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <div className="text-sm text-slate-400">{emptyLabel}</div>;
  }
  return (
    <div className="divide-y divide-slate-100 dark:divide-white/5">
      {items.map((item) => (
        <Link
          key={item.product_id}
          href={`/admin/seo?product=${item.product_id}`}
          className="flex items-center justify-between py-2.5 text-sm hover:text-orange-500 transition"
        >
          <span className="truncate text-slate-700 dark:text-slate-300">{item.product__name}</span>
          <span className="font-bold text-slate-900 dark:text-white shrink-0 ml-3">{item.score_overall}/100</span>
        </Link>
      ))}
    </div>
  );
}
