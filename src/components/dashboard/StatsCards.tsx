import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Gift, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const sb = supabase as any;

export const StatsCards = () => {
  const [stats, setStats] = useState({
    companies: 0,
    scratchCards: 0,
    registrations: 0,
    revenue: 0,
    netProfit: 0,
    profitMargin: 0,
    platformRevenue: 0,
    platformProfit: 0,
    platformMargin: 0,
    platformCommissionRate: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [companiesRes, cardsRes, registrationsRes] = await Promise.all([
          sb.from("companies").select("id", { count: "exact", head: true }),
          sb.from("scratch_cards").select("id", { count: "exact", head: true }),
          sb.from("registrations").select("id", { count: "exact", head: true }),
        ]);

        // Buscar métricas financeiras globais (empresas)
        const { data: financialMetrics } = await sb.rpc("calculate_global_financial_metrics");
        const metrics = financialMetrics?.[0] || {
          total_revenue: 0,
          net_profit: 0,
          profit_margin: 0,
        };

        // Buscar métricas da plataforma
        const { data: platformMetrics } = await sb.rpc("calculate_platform_financial_metrics");
        const platform = platformMetrics?.[0] || {
          commission_revenue: 0,
          net_profit: 0,
          profit_margin: 0,
        };

        setStats({
          companies: companiesRes.count || 0,
          scratchCards: cardsRes.count || 0,
          registrations: registrationsRes.count || 0,
          revenue: Number(metrics.total_revenue) || 0,
          netProfit: Number(metrics.net_profit) || 0,
          profitMargin: Number(metrics.profit_margin) || 0,
          platformRevenue: Number(platform.commission_revenue) || 0,
          platformProfit: Number(platform.net_profit) || 0,
          platformMargin: Number(platform.profit_margin) || 0,
          platformCommissionRate: Number(platform.average_commission_rate) || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
      <Card className="shadow-card hover:shadow-glow transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Empresas Ativas
          </CardTitle>
          <Building2 className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.companies}</div>
          <p className="text-xs text-muted-foreground mt-1">Parceiros cadastrados</p>
        </CardContent>
      </Card>

      <Card className="shadow-card hover:shadow-glow transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Raspadinhas Geradas
          </CardTitle>
          <Gift className="w-4 h-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.scratchCards}</div>
          <p className="text-xs text-muted-foreground mt-1">Códigos únicos criados</p>
        </CardContent>
      </Card>

      <Card className="shadow-card hover:shadow-glow transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Cadastros Validados
          </CardTitle>
          <Users className="w-4 h-4 text-secondary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.registrations}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Taxa: {stats.scratchCards > 0 ? Math.round((stats.registrations / stats.scratchCards) * 100) : 0}%
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-card hover:shadow-glow transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Lucro das Empresas
          </CardTitle>
          <TrendingUp className={`w-4 h-4 ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            R$ {stats.netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {stats.revenue > 0 ? (
              <>
                <Badge className={stats.netProfit >= 0 ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                  {stats.netProfit >= 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Margem {stats.profitMargin.toFixed(1)}%
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Prejuízo {Math.abs(stats.profitMargin).toFixed(1)}%
                    </>
                  )}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Receita: R$ {stats.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </>
            ) : (
              <Badge variant="outline" className="text-xs">Sem dados</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-card hover:shadow-glow transition-all border-blue-200 bg-blue-50/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-blue-900">
            Comissão da Plataforma
          </CardTitle>
          <DollarSign className="w-4 h-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            R$ {stats.platformRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-2">
            {stats.platformRevenue > 0 ? (
              <>
                <Badge className="bg-blue-600 text-white">
                  {stats.platformCommissionRate.toFixed(1)}% de comissão sobre lucro
                </Badge>
              </>
            ) : (
              <Badge variant="outline" className="text-xs">Sem comissões</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
