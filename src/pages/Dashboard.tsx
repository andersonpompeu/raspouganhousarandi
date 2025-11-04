import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, PackageCheck, Settings, BarChart3, Award, Building2, Ticket, Gift, ClipboardList, TruckIcon, Users, FileText } from "lucide-react";
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
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { role, loading: roleLoading } = useUserRole(user?.id);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }

    // Verificar role após carregar
    if (!loading && !roleLoading && user) {
      if (role === 'company_partner') {
        toast({
          title: "Acesso Negado",
          description: "Você não tem permissão para acessar o painel administrativo.",
          variant: "destructive",
        });
        navigate("/company");
      } else if (role !== 'admin') {
        toast({
          title: "Acesso Negado",
          description: "Apenas administradores podem acessar esta área.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    }
  }, [user, loading, roleLoading, role, navigate, toast]);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || role !== 'admin') return null;

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
          <TabsList className="w-full h-auto flex-wrap gap-2 bg-muted/30 p-4 rounded-xl">
            {/* Visão Geral */}
            <TabsTrigger 
              value="analytics" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-sm font-medium">Analytics</span>
            </TabsTrigger>
            <TabsTrigger 
              value="loyalty" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Award className="w-5 h-5" />
              <span className="text-sm font-medium">Fidelidade</span>
            </TabsTrigger>
            
            {/* Gestão */}
            <TabsTrigger 
              value="companies" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">Empresas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Usuários</span>
            </TabsTrigger>
            
            {/* Produtos */}
            <TabsTrigger 
              value="scratch-cards" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Ticket className="w-5 h-5" />
              <span className="text-sm font-medium">Raspadinhas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="prizes" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Gift className="w-5 h-5" />
              <span className="text-sm font-medium">Prêmios</span>
            </TabsTrigger>
            
            {/* Operações */}
            <TabsTrigger 
              value="registrations" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-sm font-medium">Cadastros</span>
            </TabsTrigger>
            <TabsTrigger 
              value="redemptions" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <TruckIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Entregas</span>
            </TabsTrigger>
            <TabsTrigger 
              value="redeem" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground bg-primary/5 border-2 border-primary/20"
            >
              <PackageCheck className="w-5 h-5" />
              <span className="text-sm font-medium">Validar</span>
            </TabsTrigger>
            
            {/* Análise */}
            <TabsTrigger 
              value="reports" 
              className="flex-1 min-w-[140px] h-20 flex flex-col items-center justify-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Relatórios</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="loyalty" className="mt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <LoyaltyTable />
              <LeaderboardTable />
            </div>
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
