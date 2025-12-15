import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Building2,
  Users,
  Ticket,
  Gift,
  ClipboardList,
  Truck,
  Award,
  FileText,
  Settings,
  ChevronLeft,
  Ticket as Logo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: BarChart3, label: "Analytics", value: "analytics" },
  { icon: Award, label: "Fidelidade", value: "loyalty" },
  { icon: Building2, label: "Empresas", value: "companies" },
  { icon: Users, label: "Usuários", value: "users" },
  { icon: Ticket, label: "Raspadinhas", value: "scratch-cards" },
  { icon: Gift, label: "Prêmios", value: "prizes" },
  { icon: ClipboardList, label: "Cadastros", value: "registrations" },
  { icon: Truck, label: "Entregas", value: "redemptions" },
  { icon: FileText, label: "Relatórios", value: "reports" },
];

export const DashboardSidebar = ({ collapsed, onToggle }: DashboardSidebarProps) => {
  const location = useLocation();
  const currentTab = new URLSearchParams(location.search).get("tab") || "analytics";

  const MenuItem = ({ item }: { item: typeof menuItems[0] }) => {
    const isActive = currentTab === item.value;
    const Icon = item.icon;

    const content = (
      <Link
        to={`/dashboard?tab=${item.value}`}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Logo className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="font-semibold text-sm">Raspadinhas</span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menuItems.map((item) => (
            <MenuItem key={item.value} item={item} />
          ))}
        </nav>

        {/* Settings */}
        <div className="border-t p-3">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                to="/dashboard?tab=settings"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Configurações</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="font-medium">
                Configurações
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </aside>
  );
};
