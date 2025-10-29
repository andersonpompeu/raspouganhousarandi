import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, PackageCheck, Settings } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Dashboard de Controle
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie campanhas, empresas e raspadinhas premiadas
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>
              <Button 
                variant="default" 
                onClick={() => navigate("/validar-entrega")}
                className="bg-gradient-primary hover:opacity-90"
              >
                <PackageCheck className="w-4 h-4 mr-2" />
                Validar Entrega
              </Button>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <StatsCards />

        <Tabs defaultValue="analytics" className="mt-8">
          <TabsList className="grid w-full grid-cols-10 max-w-7xl">
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
            <TabsTrigger value="loyalty">🏆 Fidelidade</TabsTrigger>
            <TabsTrigger value="companies">Empresas</TabsTrigger>
            <TabsTrigger value="scratch-cards">Raspadinhas</TabsTrigger>
            <TabsTrigger value="prizes">Prêmios</TabsTrigger>
            <TabsTrigger value="registrations">Cadastros</TabsTrigger>
            <TabsTrigger value="redemptions">Entregas</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="redeem" className="bg-primary/10">
              <PackageCheck className="w-4 h-4 mr-2" />
              Validar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="loyalty" className="mt-6">
            <LoyaltyTable />
          </TabsContent>

          <TabsContent value="companies" className="mt-6">
            <CompaniesTable />
          </TabsContent>

          <TabsContent value="scratch-cards" className="mt-6">
            <ScratchCardsTable />
          </TabsContent>

          <TabsContent value="prizes" className="mt-6">
            <PrizesTable />
          </TabsContent>

          <TabsContent value="registrations" className="mt-6">
            <RegistrationsTable />
          </TabsContent>

          <TabsContent value="redemptions" className="mt-6">
            <RedemptionsTable />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <CompanyUsersTable />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <ReportsTab />
          </TabsContent>

          <TabsContent value="redeem" className="mt-6">
            <Card className="p-8 text-center shadow-card">
              <div className="mb-6">
                <div className="mx-auto w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                  <PackageCheck className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Validar Entrega de Prêmio</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Acesse a página de validação para confirmar a entrega de prêmios aos clientes ganhadores
                </p>
              </div>
              <Button 
                onClick={() => navigate("/validar-entrega")}
                size="lg"
                className="bg-gradient-primary hover:opacity-90"
              >
                <PackageCheck className="w-5 h-5 mr-2" />
                Ir para Validação de Entregas
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <FinancialSettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </div>
  );
};

export default Dashboard;
