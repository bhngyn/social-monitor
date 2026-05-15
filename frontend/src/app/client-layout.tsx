"use client";

import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
              {children}
            </main>
          </div>
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
