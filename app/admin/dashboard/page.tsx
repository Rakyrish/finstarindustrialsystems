"use client";

import { useEffect, useState } from "react";
import { AdminOverviewResponse, getAdminOverview, getHealthStatus } from "@/lib/api";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

// Icons
const PackageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>;
const MessageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" /></svg>;
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
const HeartPulseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
const WarehouseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 2.61 6.6l8-4a2 2 0 0 1 1.78 0l8 4A2 2 0 0 1 22 8.35Z" /><path d="M2 12h20" /><path d="M12 2v20" /><path d="M6 12v10" /><path d="M18 12v10" /></svg>;
const TrendUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
const AlertTriangleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;

// Helpers
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US").format(value);
};

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

// Skeletons
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

interface HealthData {
  status: string;
  database: string;
  response_time_ms: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<AdminOverviewResponse | null>(null);
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return <div className="text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{error || "Data not available"}</div>;
  }

  const lowStockCount = stats.low_stock_count + stats.out_of_stock_count;

  const statCards = [
    { label: "Inventory Value", value: formatCurrency(stats.total_inventory_value), sub: "Total asset value", icon: TrendUpIcon, color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Inventory Items", value: formatNumber(stats.total_inventory_items), sub: `${stats.sections_count} storage sections`, icon: WarehouseIcon, color: "text-indigo-500 dark:text-indigo-400", bg: "bg-indigo-500/10" },
    { label: "Stock Alerts", value: lowStockCount, sub: `${stats.out_of_stock_count} out of stock`, icon: AlertTriangleIcon, color: lowStockCount > 0 ? "text-red-500 dark:text-red-400" : "text-amber-500 dark:text-amber-400", bg: lowStockCount > 0 ? "bg-red-500/10" : "bg-amber-500/10" },
    { label: "Total Products", value: formatNumber(stats.total_products), sub: `${stats.active_products} active`, icon: PackageIcon, color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
    { label: "Open Inquiries", value: formatNumber(stats.total_inquiries), sub: "Customer messages", icon: MessageIcon, color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
    { label: "Categories", value: formatNumber(stats.total_categories), sub: "Product organization", icon: FolderIcon, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10" },
  ];

  const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'In Stock', value: stats.stock_distribution.in_stock },
    { name: 'Low Stock', value: stats.stock_distribution.low_stock },
    { name: 'Out of Stock', value: stats.stock_distribution.out_of_stock },
  ].filter(d => d.value > 0);

  const isHealthy = health?.status === "ok";

  // Recharts styling for dark mode compatibility
  const tooltipStyle = {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: '#fff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* --- Row 1: KPI Cards --- */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
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

      {/* --- Row 2: Main Charts --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Inventory Value by Section */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Inventory Value by Section</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total KES value stored in each section</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {stats.inventory_by_section.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.inventory_by_section} margin={{ top: 10, right: 10, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis dataKey="section" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(value) => `KSh ${value >= 1000000 ? (value / 1000000).toFixed(1) + 'M' : value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                    tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} width={80}
                  />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any) => [formatCurrency(value || 0), 'Value']}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {stats.inventory_by_section.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorGradient)`} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No inventory data available</div>
            )}
          </div>
        </div>

        {/* Stock Status Distribution */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6 flex flex-col">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Stock Distribution</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Current health of inventory items</p>
          </div>
          <div className="flex-1 h-[250px] w-full mt-4">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: any) => [`${value} items`, 'Count']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No stock data</div>
            )}
          </div>
        </div>

      </div>

      {/* --- Row 3: Secondary Analytics --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Items by Value */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Top Items by Value</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Highest total value inventory items</p>
          <div className="h-[280px]">
            {stats.top_items_by_value.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.top_items_by_value} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: any) => [
                      name === 'value' ? formatCurrency(value) : value,
                      name === 'value' ? 'Total Value' : 'Qty in Stock'
                    ]}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No items data</div>
            )}
          </div>
        </div>

        {/* Products by Category */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-2">Products by Category</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Product catalog distribution</p>
          <div className="h-[280px]">
            {stats.products_by_category.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.products_by_category} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis type="number" tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} width={120} />
                  <RechartsTooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: any) => [value, 'Products']}
                    cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">No category data</div>
            )}
          </div>
        </div>

      </div>

      {/* --- Row 4: Activity & Status --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Inquiries List */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Recent Inquiries</h3>
            <Link href="/admin/inquiries" className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">View all &rarr;</Link>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {stats.recent_inquiries.length > 0 ? (
              stats.recent_inquiries.map((inquiry) => (
                <div key={inquiry.id} className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent dark:border-white/5">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 font-bold text-sm">
                    {inquiry.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{inquiry.name}</p>
                      <p className="text-xs text-slate-400 whitespace-nowrap ml-2">{timeAgo(inquiry.created_at)}</p>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-1">{inquiry.email}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1">{inquiry.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">No recent inquiries found</div>
            )}
          </div>
        </div>

        {/* API Health & Quick Actions */}
        <div className="space-y-6 flex flex-col">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-6 flex-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight mb-5">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/admin/products" className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-white/5 transition group">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlusIcon />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Add Product</p>
              </Link>
              <Link href="/admin/inventory" className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-white/5 transition group">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <WarehouseIcon />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Manage Stock</p>
              </Link>
              <Link href="/admin/categories" className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-white/5 transition group">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderIcon />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Categories</p>
              </Link>
              <Link href="/admin/inquiries" className="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-white/5 transition group">
                <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageIcon />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Read Messages</p>
              </Link>
            </div>
          </div>

          {/* System Health */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isHealthy ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
                  <HeartPulseIcon />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">System Status</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Database & API health</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm font-medium">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isHealthy ? "bg-green-500" : "bg-red-500"} animate-pulse`} />
                  <span className={isHealthy ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {isHealthy ? "Healthy" : "Error"}
                  </span>
                </div>
                {health?.response_time_ms !== undefined && (
                  <span className="text-slate-600 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-4">
                    {health.response_time_ms}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
