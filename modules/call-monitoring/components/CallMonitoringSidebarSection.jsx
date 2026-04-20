"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneCall } from "lucide-react";

export function CallMonitoringSidebarSection({ collapsed, onNavigate }) {
  const pathname = usePathname();
  const active = pathname?.startsWith("/call-monitoring");

  return (
    <div className="w-full border-t border-border/60 px-4 pb-4 pt-3">
      <Link
        href="/call-monitoring"
        onClick={onNavigate}
        title="Call Monitoring"
        className={`flex w-full items-center ${
          collapsed ? "justify-center px-2" : "gap-3 px-3"
        } rounded-md py-2 text-[13.5px] font-medium transition-colors ${
          active
            ? "bg-muted/60 text-brand-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="flex w-5 items-center justify-center text-[16px]">
          <PhoneCall className="h-4 w-4" />
        </span>
        {!collapsed ? <span className="truncate">Call Monitoring</span> : null}
        {collapsed ? <span className="sr-only">Call Monitoring</span> : null}
      </Link>
    </div>
  );
}
