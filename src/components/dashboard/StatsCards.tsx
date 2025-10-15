import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export const StatsCards = () => {
  const [stats, setStats] = useState({
    companyProfit: 0,
    platformCommission: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Buscar todos os prêmios com percentual de comissão
        const { data: prizes } = await sb
          .from("prizes")
          .select("id, prize_value, platform_commission_percentage");

        const allPrizes = prizes || [];

        // Buscar todas as raspadinhas vendidas/resgatadas
        const { data: scratchCards } = await sb
          .from("scratch_cards")
          .select("prize_id, status")
          .in("status", ["registered", "redeemed"]);

        const soldCards = scratchCards || [];

        // Calcular totais baseado nas raspadinhas vendidas com comissão customizada
        let totalCommission = 0;
        let totalProfit = 0;

        for (const card of soldCards) {
          const prize = allPrizes.find(p => p.id === card.prize_id);
          if (prize) {
            const prizeValue = Number(prize.prize_value || 0);
            const commissionPercentage = Number(prize.platform_commission_percentage || 10);
            const commission = prizeValue * (commissionPercentage / 100);
            const profit = prizeValue - commission;

            totalCommission += commission;
            totalProfit += profit;
          }
        }

        setStats({
          companyProfit: totalProfit,
          platformCommission: totalCommission,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <Card className="shadow-card hover:shadow-glow transition-all">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Lucro das Empresas
          </CardTitle>
          <TrendingUp className="w-4 h-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-green-600">
            R$ {stats.companyProfit.toLocaleString("pt-BR", { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Lucro total das empresas (valor - comissão)
          </p>
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
          <div className="text-4xl font-bold text-blue-600">
            R$ {stats.platformCommission.toLocaleString("pt-BR", { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </div>
          <p className="text-xs text-blue-900 mt-2">
            Comissão baseada nos percentuais configurados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
