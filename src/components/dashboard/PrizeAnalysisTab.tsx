import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type PrizeAnalysis = {
  id: string;
  name: string;
  prizeValue: number;
  totalQuantity: number;
  distributedQuantity: number;
  cardsWithPrize: number;
  redeemedCount: number;
  redemptionRate: number;
  totalCost: number;
  averageCostPerRedemption: number;
  impactOnProfit: number;
  recommendation: "increase" | "decrease" | "maintain";
};

export const PrizeAnalysisTab = () => {
  const [prizes, setPrizes] = useState<PrizeAnalysis[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrizeAnalysis = async () => {
    try {
      const { data: prizesData, error } = await sb
        .from("prizes")
        .select(`
          id,
          name,
          description,
          prize_value,
          cost_to_company,
          total_quantity,
          distributed_quantity
        `);

      if (error) throw error;

      const analysis = await Promise.all(
        (prizesData || []).map(async (prize: any) => {
          // Buscar raspadinhas com este prêmio
          const { data: cards } = await sb
            .from("scratch_cards")
            .select("id, status")
            .eq("prize_id", prize.id);

          const cardsWithPrize = cards?.length || 0;
          const redeemedCards = cards?.filter((c: any) => c.status === "redeemed") || [];
          const redeemedCount = redeemedCards.length;
          const redemptionRate = cardsWithPrize > 0 ? (redeemedCount / cardsWithPrize) * 100 : 0;
          const totalCost = redeemedCount * Number(prize.prize_value);
          const averageCostPerRedemption = redeemedCount > 0 ? totalCost / redeemedCount : 0;

          // Calcular impacto no lucro (negativo porque é custo)
          const impactOnProfit = -totalCost;

          // Recomendação baseada em taxa de resgate e custo
          let recommendation: "increase" | "decrease" | "maintain" = "maintain";
          if (redemptionRate > 30) {
            recommendation = "decrease"; // Muitos resgates, pode estar custando muito
          } else if (redemptionRate < 10 && Number(prize.prize_value) < 10) {
            recommendation = "increase"; // Poucos resgates e baixo valor, pode aumentar
          }

          return {
            id: prize.id,
            name: prize.name,
            prizeValue: Number(prize.prize_value),
            totalQuantity: prize.total_quantity,
            distributedQuantity: prize.distributed_quantity,
            cardsWithPrize,
            redeemedCount,
            redemptionRate,
            totalCost,
            averageCostPerRedemption,
            impactOnProfit,
            recommendation,
          };
        })
      );

      setPrizes(analysis.sort((a, b) => Math.abs(b.impactOnProfit) - Math.abs(a.impactOnProfit)));
    } catch (error: any) {
      console.error("Error fetching prize analysis:", error);
      toast.error("Erro ao carregar análise de prêmios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrizeAnalysis();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Analisando prêmios...</p>
      </div>
    );
  }

  const getRecommendationBadge = (recommendation: string) => {
    switch (recommendation) {
      case "increase":
        return <Badge className="bg-green-600"><TrendingUp className="w-3 h-3 mr-1" />Aumentar</Badge>;
      case "decrease":
        return <Badge className="bg-red-600"><TrendingDown className="w-3 h-3 mr-1" />Reduzir</Badge>;
      default:
        return <Badge variant="outline">Manter</Badge>;
    }
  };

  const totalImpact = prizes.reduce((sum, p) => sum + p.impactOnProfit, 0);

  return (
    <div className="space-y-6">
      {/* Resumo do Impacto */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Impacto Total dos Prêmios
          </CardTitle>
          <CardDescription>
            Custo total gerado pelos resgates de prêmios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-orange-600">
            R$ {Math.abs(totalImpact).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Custo de comissões sobre prêmios resgatados
          </p>
        </CardContent>
      </Card>

      {/* Análise Individual de Prêmios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Análise Detalhada por Prêmio
          </CardTitle>
          <CardDescription>
            Performance e recomendações para cada tipo de prêmio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prizes.map((prize) => (
              <div
                key={prize.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{prize.name}</h3>
                      {getRecommendationBadge(prize.recommendation)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Valor do prêmio: R$ {prize.prizeValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">
                      R$ {prize.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Custo total</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t text-sm">
                  <div>
                    <p className="text-muted-foreground">Disponíveis</p>
                    <p className="font-semibold">
                      {prize.cardsWithPrize}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Resgatados</p>
                    <p className="font-semibold text-orange-600">
                      {prize.redeemedCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Taxa Resgate</p>
                    <p className="font-semibold">
                      {prize.redemptionRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Custo Médio</p>
                    <p className="font-semibold">
                      R$ {prize.averageCostPerRedemption.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Análise e Recomendação */}
                <div className="pt-3 border-t bg-gray-50 p-3 rounded">
                  {prize.cardsWithPrize === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ℹ️ <strong>Sem dados suficientes</strong>. Nenhuma raspadinha com este prêmio foi distribuída ainda.
                    </p>
                  ) : prize.recommendation === "decrease" && (
                    <p className="text-sm text-orange-700">
                      ⚠️ <strong>Alta taxa de resgate ({prize.redemptionRate.toFixed(1)}%)</strong>. 
                      Considere reduzir a quantidade deste prêmio para controlar custos das empresas parceiras.
                    </p>
                  )}
                  {prize.recommendation === "increase" && (
                    <p className="text-sm text-green-700">
                      ✅ <strong>Baixa taxa de resgate ({prize.redemptionRate.toFixed(1)}%)</strong>. 
                      Prêmio com bom custo-benefício, pode aumentar quantidade para atrair mais clientes.
                    </p>
                  )}
                  {prize.recommendation === "maintain" && prize.cardsWithPrize > 0 && (
                    <p className="text-sm text-blue-700">
                      ℹ️ <strong>Taxa equilibrada</strong>. Mantenha a estratégia atual para este prêmio.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 <strong>Nota:</strong> O custo dos prêmios é arcado pelas empresas parceiras quando resgatados pelos clientes.
                  </p>
                </div>
              </div>
            ))}

            {prizes.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum prêmio cadastrado ainda
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
