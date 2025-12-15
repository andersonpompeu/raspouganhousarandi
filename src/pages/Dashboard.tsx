import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/layout/DashboardLayout";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CompaniesTable } from "@/components/dashboard/CompaniesTable";
import { ScratchCardsTable } from "@/components/dashboard/ScratchCardsTable";
import { PrizesTable } from "@/components/dashboard/PrizesTable";
import { RegistrationsTable } from "@/components/dashboard/RegistrationsTable";
import { RedemptionsTable } from "@/components/dashboard/RedemptionsTable";
import { ReportsTab } from "@/components/dashboard/ReportsTab";
import { CompanyUsersTable } from "@/components/dashboard/CompanyUsersTable";
import { FinancialSettingsDialog } from "@/components/dashboard/FinancialSettingsDialog";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";
import { LoyaltyTable } from "@/components/dashboard/LoyaltyTable";
import { LeaderboardTable } from "@/components/dashboard/LeaderboardTable";

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const currentTab = searchParams.get("tab") || "analytics";

  const renderContent = () => {
    switch (currentTab) {
      case "analytics":
        return (
          <div className="space-y-6 animate-fade-in">
            <StatsCards />
            <AnalyticsDashboard />
          </div>
        );
      case "loyalty":
        return (
          <div className="grid gap-6 md:grid-cols-2 animate-fade-in">
            <LoyaltyTable />
            <LeaderboardTable />
          </div>
        );
      case "companies":
        return (
          <div className="animate-fade-in">
            <CompaniesTable />
          </div>
        );
      case "users":
        return (
          <div className="animate-fade-in">
            <CompanyUsersTable />
          </div>
        );
      case "scratch-cards":
        return (
          <div className="animate-fade-in">
            <ScratchCardsTable />
          </div>
        );
      case "prizes":
        return (
          <div className="animate-fade-in">
            <PrizesTable />
          </div>
        );
      case "registrations":
        return (
          <div className="animate-fade-in">
            <RegistrationsTable />
          </div>
        );
      case "redemptions":
        return (
          <div className="animate-fade-in">
            <RedemptionsTable />
          </div>
        );
      case "reports":
        return (
          <div className="animate-fade-in">
            <ReportsTab />
          </div>
        );
      case "settings":
        return (
          <div className="animate-fade-in">
            <FinancialSettingsDialog 
              open={true} 
              onOpenChange={() => {}} 
            />
          </div>
        );
      default:
        return (
          <div className="space-y-6 animate-fade-in">
            <StatsCards />
            <AnalyticsDashboard />
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {renderContent()}
      <FinancialSettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </DashboardLayout>
  );
};

export default Dashboard;
