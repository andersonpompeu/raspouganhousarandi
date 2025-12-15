import { useState } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Sidebar */}
        <DashboardSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Header */}
        <DashboardHeader
          sidebarCollapsed={sidebarCollapsed}
          onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Main Content */}
        <main
          className={cn(
            "pt-16 min-h-screen transition-all duration-300",
            sidebarCollapsed ? "pl-16" : "pl-60"
          )}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
};
