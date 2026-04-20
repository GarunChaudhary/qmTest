"use client";
import { useState } from "react";
import Sidebar from "../../components/sidebar";
import TopBar from "../../components/topbar";
import "./../globals.css";
import ScreenSizeGuard from "../../components/ScreenSizeGuard";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const contentOffset = sidebarCollapsed ? "sm:pl-14" : "sm:pl-14";
  return (
    <ScreenSizeGuard>
      <div className="flex min-h-screen flex-col bg-muted/40">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((prev) => !prev)}
        />

        {/* add transition so it slides smoothly */}
        <div className={`flex flex-col flex-grow sm:gap-4 sm:py-4 ${contentOffset} transition-all duration-300`} >
          <TopBar
            onMenuClick={() => setSidebarOpen(true)}
            onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
            sidebarCollapsed={sidebarCollapsed}
          />
          <main className="flex-1 overflow-y-auto p-2 sm:px-4 sm:py-0 md:gap-1">
            {children}
          </main>
          {/* <Toaster /> */}
        </div>
      </div>
    </ScreenSizeGuard>
  );
};

export default Layout;
