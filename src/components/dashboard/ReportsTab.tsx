import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Award, Building2, Users, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type ReportStats = {
  totalCards: number;
  availableCards: number;
  registeredCards: number;
  redeemedCards: number;
  totalRegistrations: number;
  totalRedemptions: number;
  totalCompanies: number;
  activeCompanies: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  platformRevenue: number;
  platformCosts: number;
  platformProfit: number;
  platformMargin: number;
  platformCommissionRate: number;
  companiesReport: Array<{
    id: string;
    name: string;
    commission: number;
    cardsDistributed: number;
    cardsRedeemed: number;
    revenue: number;
    productionCosts: number;
    commissionCosts: number;
    totalCosts: number;
    netProfit: number;
    profitMargin: number;
    redemptionRate: number;
  }>;
};

export const ReportsTab = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      const [cardsRes, regRes, redRes, companiesRes, globalMetricsRes, platformMetricsRes] = await Promise.all([
        sb.from("scratch_cards").select("status"),
        sb.from("registrations").select("id"),
        sb.from("redemptions").select("id"),
        sb.from("companies").select("id, name, status, commission_percentage"),
        sb.rpc("calculate_global_financial_metrics"),
        sb.rpc("calculate_platform_financial_metrics"),
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (regRes.error) throw regRes.error;
      if (redRes.error) throw redRes.error;
      if (companiesRes.error) throw companiesRes.error;

      const cards = cardsRes.data || [];
      const companies = companiesRes.data || [];
      const globalMetrics = globalMetricsRes.data?.[0] || {
        total_revenue: 0,
        total_costs: 0,
        net_profit: 0,
        profit_margin: 0,
      };
      
      const platformMetrics = platformMetricsRes.data?.[0] || {
        commission_revenue: 0,
        operational_costs: 0,
        net_profit: 0,
        profit_margin: 0,
      };

      const companiesReport = await Promise.all(
        companies.map(async (company) => {
          const { data: metrics } = await sb.rpc("calculate_company_financial_metrics", {
            company_uuid: company.id,
          });

          const companyMetrics = metrics?.[0] || {
            revenue: 0,
            production_costs: 0,
            commission_costs: 0,
            total_costs: 0,
            net_profit: 0,
            profit_margin: 0,
            cards_sold: 0,
            cards_redeemed: 0,
            redemption_rate: 0,
          };

          return {
            id: company.id,
            name: company.name,
            commission: company.commission_percentage || 0,
            cardsDistributed: Number(companyMetrics.cards_sold) || 0,
            cardsRedeemed: Number(companyMetrics.cards_redeemed) || 0,
            revenue: Number(companyMetrics.revenue) || 0,
            productionCosts: Number(companyMetrics.production_costs) || 0,
            commissionCosts: Number(companyMetrics.commission_costs) || 0,
            totalCosts: Number(companyMetrics.total_costs) || 0,
            netProfit: Number(companyMetrics.net_profit) || 0,
            profitMargin: Number(companyMetrics.profit_margin) || 0,
            redemptionRate: Number(companyMetrics.redemption_rate) || 0,
          };
        })
      );

      setStats({
        totalCards: cards.length,
        availableCards: cards.filter((c) => c.status === "available").length,
        registeredCards: cards.filter((c) => c.status === "registered").length,
        redeemedCards: cards.filter((c) => c.status === "redeemed").length,
        totalRegistrations: regRes.data?.length || 0,
        totalRedemptions: redRes.data?.length || 0,
        totalCompanies: companies.length,
        activeCompanies: companies.filter((c) => c.status === "active").length,
        totalRevenue: Number(globalMetrics.total_revenue) || 0,
        totalCosts: Number(globalMetrics.total_costs) || 0,
        netProfit: Number(globalMetrics.net_profit) || 0,
        profitMargin: Number(globalMetrics.profit_margin) || 0,
        platformRevenue: Number(platformMetrics.commission_revenue) || 0,
        platformCosts: 0,
        platformProfit: Number(platformMetrics.commission_revenue) || 0,
        platformMargin: Number(platformMetrics.commission_revenue) > 0 ? 100 : 0,
        platformCommissionRate: Number(platformMetrics.average_commission_rate) || 0,
        companiesReport: companiesReport.sort((a, b) => b.netProfit - a.netProfit),
      });
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Gerando relatórios...</p>
      </div>
    );
  }

  if (!stats) return null;

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? "text-green-600" : "text-red-600";
  };

  const getProfitIcon = (profit: number) => {
    return profit >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingUp className="h-4 w-4 rotate-180" />;
  };

  return (
    <div className="space-y-6">
      {/* Métricas da Plataforma */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <DollarSign className="w-5 h-5" />
            Métricas Financeiras da Plataforma
          </CardTitle>
          <CardDescription>
            Receita de comissões e lucratividade da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Receita (Comissões)</p>
              <div className="text-2xl font-bold text-blue-600">
                R$ {stats.platformRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Custos Operacionais</p>
              <div className="text-2xl font-bold text-orange-600">
                R$ {stats.platformCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <div className={`text-2xl font-bold ${getProfitColor(stats.platformProfit)}`}>
                R$ {stats.platformProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Margem de Lucro</p>
              <div className="flex items-center gap-2">
                <div className={`text-2xl font-bold ${getProfitColor(stats.platformProfit)}`}>
                  {stats.platformRevenue > 0 ? `${stats.platformMargin.toFixed(1)}%` : 'N/A'}
                </div>
                {stats.platformRevenue > 0 && getProfitIcon(stats.platformProfit)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Consolidadas das Empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Métricas Consolidadas das Empresas Parceiras
          </CardTitle>
          <CardDescription>
            Receita, custos e lucratividade agregada de todas as empresas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Receita Total</p>
              <div className="text-2xl font-bold text-green-600">
                {stats.totalRevenue > 0 
                  ? `R$ ${stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'Sem dados'}
              </div>
              <p className="text-xs text-muted-foreground">Vendas de raspadinhas</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Custos Totais</p>
              <div className="text-2xl font-bold text-red-600">
                {stats.totalCosts > 0
                  ? `R$ ${stats.totalCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'R$ 0,00'}
              </div>
              <p className="text-xs text-muted-foreground">Produção + Comissões</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Lucro Líquido</p>
              <div className={`text-2xl font-bold ${getProfitColor(stats.netProfit)}`}>
                {stats.totalRevenue > 0
                  ? `R$ ${Math.abs(stats.netProfit).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : 'Sem dados'}
              </div>
              <p className="text-xs text-muted-foreground">Receita - Custos</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Margem de Lucro</p>
              <div className="flex items-center gap-2">
                {stats.totalRevenue > 0 && stats.totalCosts === 0 ? (
                  <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Lucro 100%
                  </Badge>
                ) : stats.totalRevenue > 0 ? (
                  <>
                    <div className={`text-2xl font-bold ${getProfitColor(stats.netProfit)}`}>
                      {Math.abs(stats.profitMargin).toFixed(1)}%
                    </div>
                    {getProfitIcon(stats.netProfit)}
                  </>
                ) : (
                  <Badge variant="outline">Sem dados suficientes</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Operacionais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raspadinhas Geradas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCards}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableCards} disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cadastros Realizados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRegistrations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.registeredCards} raspadinhas cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prêmios Entregues</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRedemptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats.redeemedCards} raspadinhas resgatadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Parceiras</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCompanies} ativas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Análise Financeira por Empresa
          </CardTitle>
          <CardDescription>
            Lucratividade detalhada de cada parceiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.companiesReport.map((company) => (
              <div
                key={company.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{company.name}</h3>
                      <Badge variant="outline">{company.commission}% comissão</Badge>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Vendidas: {company.cardsDistributed}</span>
                      <span>Resgatadas: {company.cardsRedeemed}</span>
                      <span>Taxa: {company.redemptionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-bold text-green-600">
                      <DollarSign className="w-4 h-4" />
                      {company.netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Lucro Líquido</p>
                  </div>
                </div>

                  <div className="grid grid-cols-4 gap-3 pt-3 border-t text-sm">
                  <div>
                    <p className="text-muted-foreground">Receita</p>
                    <p className="font-semibold text-green-600">
                      {company.revenue > 0 
                        ? `R$ ${company.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : 'R$ 0,00'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Produção</p>
                    <p className="font-semibold text-orange-600">
                      R$ {company.productionCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Comissões</p>
                    <p className="font-semibold text-red-600">
                      R$ {company.commissionCosts.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margem</p>
                    {company.revenue > 0 && company.totalCosts === 0 ? (
                      <Badge className="bg-green-600 text-white">100%</Badge>
                    ) : company.revenue > 0 ? (
                      <div className="flex items-center gap-1">
                        <p className={`font-semibold ${getProfitColor(company.netProfit)}`}>
                          {Math.abs(company.profitMargin).toFixed(1)}%
                        </p>
                        {company.netProfit >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingUp className="w-3 h-3 text-red-600 rotate-180" />
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-xs">N/A</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {stats.companiesReport.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma empresa cadastrada ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
