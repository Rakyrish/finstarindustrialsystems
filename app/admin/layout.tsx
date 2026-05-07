import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { AdminShell } from "@/components/admin/AdminShell";
import { ToastProvider } from "@/components/admin/Toast";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-snippet": 0,
      "max-image-preview": "none",
      "max-video-preview": 0,
    },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </AuthProvider>
  );
}
