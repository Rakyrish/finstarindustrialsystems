"use client";

import { useEffect, useState } from "react";
import { getAdminInquiries } from "@/lib/api";

const MessageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

interface Inquiry {
  id: number;
  name: string;
  email: string;
  message: string;
  created_at?: string;
  createdAt?: string;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getAdminInquiries();
        const items = Array.isArray(data) ? data : data.results || [];
        setInquiries(items as unknown as Inquiry[]);
      } catch {
        setError("Failed to load inquiries.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 dark:border-white/10 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <div className="p-2 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-500 rounded-lg">
             <MessageIcon />
          </div>
          Inquiries
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">View messages sent from the contact form</p>
      </div>

      {error ? (
        <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-500 rounded-2xl">{error}</div>
      ) : loading ? (
        <div className="py-20 text-center text-slate-500 dark:text-slate-400">Loading inquiries...</div>
      ) : inquiries.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-white/20 rounded-2xl">
          No inquiries found.
        </div>
      ) : (
        <div className="grid gap-6">
            {inquiries.map((inq: Inquiry) => (
              <div key={inq.id} className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 p-6 rounded-2xl hover:border-slate-300 dark:hover:border-white/20 transition shadow-sm hover:shadow-md dark:hover:shadow-lg dark:shadow-none">
                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-white/10">
                    <div className="flex flex-wrap gap-4">
                       <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                          <UserIcon /> {inq.name}
                       </div>
                       <a href={`mailto:${inq.email}`} className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition">
                          <MailIcon /> {inq.email}
                       </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                       <ClockIcon /> 
                       {new Date(inq.created_at || inq.createdAt || new Date().toISOString()).toLocaleString()}
                    </div>
                 </div>
                 <p className="text-slate-700 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                   {inq.message}
                 </p>
              </div>
           ))}
        </div>
      )}
    </div>
  );
}
