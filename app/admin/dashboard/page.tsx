"use client";

import { useEffect, useState } from "react";
import { getAdminOverview, getHealthStatus } from "@/lib/api";
import Link from "next/link";

const PackageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);

const HeartPulseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/></svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    </div>
  );
}

interface HealthData {
  status: string;
  database: string;
  response_time_ms: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<{
    total_products: number;
    active_products: number;
    inactive_products: number;
    total_categories: number;
    total_inquiries: number;
  } | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [statsData, healthData] = await Promise.allSettled([
          getAdminOverview(),
          getHealthStatus(),
        ]);

        if (statsData.status === "fulfilled") setStats(statsData.value);
        if (healthData.status === "fulfilled") setHealth(healthData.value);

        if (statsData.status === "rejected" && healthData.status === "rejected") {
          setError("Failed to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error}</div>;
  }

  const statCards = [
    { label: "Total Products", value: stats?.total_products || 0, icon: PackageIcon, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Active Products", value: stats?.active_products || 0, icon: ActivityIcon, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Categories", value: stats?.total_categories || 0, icon: FolderIcon, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Total Inquiries", value: stats?.total_inquiries || 0, icon: MessageIcon, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  const isHealthy = health?.status === "ok";

  return (
    <div className="space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 shadow-sm transition hover:border-slate-300 dark:hover:border-white/20 hover:shadow-md dark:hover:shadow-lg dark:shadow-none group">
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                  {Icon() as React.ReactNode}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-0.5">{card.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* API Health + Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Health Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className={`p-3 rounded-xl ${isHealthy ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}>
              <HeartPulseIcon />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">API Health</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Real-time backend status</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2.5 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-transparent">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</span>
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${isHealthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                <div className={`w-2 h-2 rounded-full ${isHealthy ? "bg-green-500 dark:bg-green-400" : "bg-red-500 dark:bg-red-400"} animate-pulse`} />
                {isHealthy ? "Healthy" : "Error"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-transparent">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Database</span>
              <span className={`text-sm font-bold ${health?.database === "connected" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {health?.database === "connected" ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-transparent">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Response Time</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {health?.response_time_ms !== undefined ? `${health.response_time_ms} ms` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-5">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/admin/products"
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 hover:shadow-sm transition group"
            >
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-500/20 group-hover:bg-orange-200 dark:group-hover:bg-orange-500/30 transition">
                <PlusIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Add Product</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Create new listing</p>
              </div>
            </Link>
            <Link
              href="/admin/categories"
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:shadow-sm transition group"
            >
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/20 group-hover:bg-blue-200 dark:group-hover:bg-blue-500/30 transition">
                <PlusIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Add Category</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Organize products</p>
              </div>
            </Link>
            <Link
              href="/admin/inquiries"
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 hover:shadow-sm transition group"
            >
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-500/20 group-hover:bg-purple-200 dark:group-hover:bg-purple-500/30 transition">
                <MessageIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">View Inquiries</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customer messages</p>
              </div>
            </Link>
            <Link
              href="/admin/monitoring"
              className="flex items-center gap-3 px-5 py-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20 hover:shadow-sm transition group"
            >
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-500/20 group-hover:bg-green-200 dark:group-hover:bg-green-500/30 transition">
                <ActivityIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Monitoring</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">System health & logs</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
