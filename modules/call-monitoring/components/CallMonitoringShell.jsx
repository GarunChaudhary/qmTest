"use client";

import { useState } from "react";

import Sidebar from "@/components/sidebar";
import TopBar from "@/components/topbar";
import ScreenSizeGuard from "@/components/ScreenSizeGuard";

export function CallMonitoringShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  return (
    <ScreenSizeGuard>
      <div className="flex min-h-screen flex-col bg-muted/40">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((previous) => !previous)}
        />

        <div className="flex flex-grow flex-col transition-all duration-300 sm:gap-4 sm:py-4 sm:pl-14">
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed((previous) => !previous)}
            sidebarCollapsed={sidebarCollapsed}
          />

          <main className="flex-1 overflow-y-auto p-2 sm:px-4 sm:py-0 md:gap-1">
            {children}
          </main>
        </div>
      </div>
    </ScreenSizeGuard>
  );
}
