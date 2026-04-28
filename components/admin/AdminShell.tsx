"use client";

import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);

const PackageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);

const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
);

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
);

const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
);

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
);

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
);

const LoaderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isHydrated, logout, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isHydrated && !isAuthenticated && !isLoginPage) {
      router.replace("/admin/login");
    }
  }, [isHydrated, isAuthenticated, isLoginPage, router]);

  // Close sidebar on route change
  useEffect(() => {
    const timer = setTimeout(() => {
      setSidebarOpen(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white flex-col gap-4">
        <LoaderIcon />
        <span className="text-sm font-medium text-slate-400">Loading profile...</span>
      </div>
    );
  }

  if (isLoginPage) {
    return <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">{children}</div>;
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: DashboardIcon },
    { name: "Products", href: "/admin/products", icon: PackageIcon },
    { name: "Categories", href: "/admin/categories", icon: FolderIcon },
    { name: "Inquiries", href: "/admin/inquiries", icon: MessageIcon },
    { name: "Monitoring", href: "/admin/monitoring", icon: ActivityIcon },
  ];

  const sidebarContent = (
    <>
      <div className="p-6">
        <Link href="/admin/dashboard" className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <span className="text-orange-500">FINSTAR</span> ADMIN
        </Link>
      </div>
      <nav className="flex-1 px-4 space-y-1 mt-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-orange-500/10 text-orange-400" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
         <button 
           onClick={() => {
             logout();
             router.push("/admin/login");
           }}
           className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
         >
           <LogOutIcon />
           Logout
         </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-slate-900/50 flex-col hidden md:flex shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} 
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 border-r border-white/10 flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pr-4">
              <div className="p-6">
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span className="text-orange-500">FINSTAR</span> ADMIN
                </span>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="p-2 text-slate-400 hover:text-white cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex-1 px-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-orange-500/10 text-orange-400" 
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
               <button 
                 onClick={() => {
                   logout();
                   router.push("/admin/login");
                 }}
                 className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white cursor-pointer"
               >
                 <LogOutIcon />
                 Logout
               </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
         {/* Top Header */}
         <header className="h-16 border-b border-white/10 bg-slate-900/50 flex items-center justify-between px-4 md:px-8 shrink-0">
            <div className="flex items-center gap-4">
              <button 
                className="md:hidden p-2 text-slate-400 hover:text-white cursor-pointer -ml-2"
                onClick={() => setSidebarOpen(true)}
              >
                <MenuIcon />
              </button>
              <h1 className="text-lg font-semibold text-white">
                {navItems.find(i => pathname.startsWith(i.href))?.name || "Dashboard"}
              </h1>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                {session?.user?.username || "Admin"}
              </div>
            </div>
         </header>
         
         <main className="flex-1 overflow-y-auto p-4 md:p-8 text-white relative">
           <div className="mx-auto max-w-6xl">
              {children}
           </div>
         </main>
      </div>
    </div>
  );
}
