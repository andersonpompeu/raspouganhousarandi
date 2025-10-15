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
  costToCompany: number;
  totalQuantity: number;
  distributedQuantity: number;
  redeemedCount: number;
  redemptionRate: number;
  totalCostToCompany: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  efficiency: number;
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
          cost_to_company,
          total_quantity
        `);

      if (error) throw error;

      const analysis = await Promise.all(
        (prizesData || []).map(async (prize: any) => {
          // Buscar raspadinhas com este prêmio (distribuídas = registered ou redeemed)
          const { data: cards } = await sb
            .from("scratch_cards")
            .select("id, status")
            .eq("prize_id", prize.id)
            .in("status", ["registered", "redeemed"]);

          const distributedQuantity = cards?.length || 0;
          const redeemedCards = cards?.filter((c: any) => c.status === "redeemed") || [];
          const redeemedCount = redeemedCards.length;
          
          // Taxa de resgate sobre distribuídos
          const redemptionRate = distributedQuantity > 0 ? (redeemedCount / distributedQuantity) * 100 : 0;

          // Cálculos financeiros corretos
          const costToCompany = Number(prize.cost_to_company);
          const totalCostToCompany = redeemedCount * costToCompany; // Custo apenas dos resgatados
          const totalRevenue = distributedQuantity * 5.00; // R$ 5 por raspadinha vendida
          const netProfit = totalRevenue - totalCostToCompany; // Lucro líquido real
          const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
          const roi = totalCostToCompany > 0 ? ((netProfit / totalCostToCompany) * 100) : 0;
          const efficiency = redeemedCount > 0 ? (totalRevenue / redeemedCount) : 0;

          // Recomendação baseada em margem de lucro
          let recommendation: "increase" | "decrease" | "maintain" = "maintain";
          if (distributedQuantity === 0) {
            recommendation = "maintain"; // Sem dados suficientes
          } else if (profitMargin > 60) {
            recommendation = "increase"; // Ótima margem, pode aumentar distribuição
          } else if (profitMargin < 20) {
            recommendation = "decrease"; // Margem baixa, reduzir para controlar custos
          }

          return {
            id: prize.id,
            name: prize.name,
            costToCompany,
            totalQuantity: prize.total_quantity,
            distributedQuantity,
            redeemedCount,
            redemptionRate,
            totalCostToCompany,
            totalRevenue,
            netProfit,
            profitMargin,
            roi,
            efficiency,
            recommendation,
          };
        })
      );

      setPrizes(analysis.sort((a, b) => b.netProfit - a.netProfit));
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

  const totalNetProfit = prizes.reduce((sum, p) => sum + p.netProfit, 0);
  const totalRevenue = prizes.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalCost = prizes.reduce((sum, p) => sum + p.totalCostToCompany, 0);

  return (
    <div className="space-y-6">
      {/* Resumo Financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vendas de raspadinhas distribuídas
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-800">Custo Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">
              R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prêmios resgatados pelas empresas
            </p>
          </CardContent>
        </Card>

        <Card className={totalNetProfit >= 0 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium ${totalNetProfit >= 0 ? "text-blue-800" : "text-red-800"}`}>
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalNetProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
              R$ {totalNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita - Custo dos prêmios
            </p>
          </CardContent>
        </Card>
      </div>

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
                      Custo unitário: R$ {prize.costToCompany.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${prize.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      R$ {prize.netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-muted-foreground">Lucro líquido</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t text-sm">
                  <div>
                    <p className="text-muted-foreground">Distribuídos</p>
                    <p className="font-semibold">
                      {prize.distributedQuantity}
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
                    <p className="text-muted-foreground">Margem Lucro</p>
                    <p className={`font-semibold ${prize.profitMargin >= 50 ? "text-green-600" : prize.profitMargin >= 20 ? "text-yellow-600" : "text-red-600"}`}>
                      {prize.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ROI</p>
                    <p className={`font-semibold ${prize.roi >= 100 ? "text-green-600" : prize.roi >= 0 ? "text-yellow-600" : "text-red-600"}`}>
                      {prize.roi.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Detalhes Financeiros */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t text-sm bg-muted/30 p-3 rounded">
                  <div>
                    <p className="text-muted-foreground text-xs">Receita</p>
                    <p className="font-semibold text-green-700">
                      R$ {prize.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Custo Total</p>
                    <p className="font-semibold text-orange-700">
                      R$ {prize.totalCostToCompany.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Eficiência</p>
                    <p className="font-semibold">
                      R$ {prize.efficiency.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Análise e Recomendação */}
                <div className="pt-3 border-t bg-gray-50 p-3 rounded">
                  {prize.distributedQuantity === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      ℹ️ <strong>Sem dados suficientes</strong>. Nenhuma raspadinha com este prêmio foi distribuída ainda.
                    </p>
                  ) : (
                    <>
                      {prize.recommendation === "increase" && (
                        <p className="text-sm text-green-700">
                          ✅ <strong>Excelente margem de lucro ({prize.profitMargin.toFixed(1)}%)</strong>. 
                          Prêmio muito rentável! Considere aumentar a distribuição para maximizar lucros e atrair mais clientes.
                        </p>
                      )}
                      {prize.recommendation === "decrease" && (
                        <p className="text-sm text-red-700">
                          ⚠️ <strong>Margem de lucro baixa ({prize.profitMargin.toFixed(1)}%)</strong>. 
                          Prêmio está comprometendo rentabilidade. Considere reduzir distribuição ou renegociar custos.
                        </p>
                      )}
                      {prize.recommendation === "maintain" && (
                        <p className="text-sm text-blue-700">
                          ℹ️ <strong>Margem equilibrada ({prize.profitMargin.toFixed(1)}%)</strong>. 
                          Prêmio com performance saudável. Mantenha a estratégia atual.
                        </p>
                      )}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground space-y-1">
                        <p>• <strong>Taxa de resgate:</strong> {prize.redemptionRate.toFixed(1)}% dos distribuídos foram resgatados</p>
                        <p>• <strong>ROI:</strong> Cada R$ 1,00 investido em prêmios gera R$ {((prize.roi / 100) + 1).toFixed(2)}</p>
                        <p>• <strong>Eficiência:</strong> R$ {prize.efficiency.toFixed(2)} de receita por prêmio resgatado</p>
                      </div>
                    </>
                  )}
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
