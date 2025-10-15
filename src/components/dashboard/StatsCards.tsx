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
        // Buscar todos os prêmios cadastrados
        const { data: prizes } = await sb
          .from("prizes")
          .select("prize_value");

        // Calcular soma total dos prêmios
        const totalPrizeValue = prizes?.reduce(
          (sum, prize) => sum + Number(prize.prize_value || 0),
          0
        ) || 0;

        // Calcular comissão (10% do valor do prêmio)
        const commission = totalPrizeValue * 0.1;

        // Calcular lucro da empresa (90% do valor do prêmio)
        const profit = totalPrizeValue * 0.9;

        setStats({
          companyProfit: profit,
          platformCommission: commission,
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
            90% do valor dos prêmios cadastrados
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
            10% do valor dos prêmios cadastrados
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
