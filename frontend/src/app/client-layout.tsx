"use client";

import { I18nProvider } from "@/lib/i18n";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
            {children}
          </main>
        </div>
      </div>
    </I18nProvider>
  );
}
