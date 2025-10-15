import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Building2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type CompanyReport = {
  id: string;
  name: string;
  totalPrizeValue: number;
  companyProfit: number;
  platformCommission: number;
  prizesCount: number;
};

type ReportStats = {
  totalCompanyProfit: number;
  totalPlatformCommission: number;
  totalPrizeValue: number;
  companiesReport: CompanyReport[];
};

export const ReportsTab = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = async () => {
    try {
      // Buscar todos os prêmios
      const { data: prizes, error: prizesError } = await sb
        .from("prizes")
        .select("id, prize_value");

      if (prizesError) throw prizesError;

      const allPrizes = prizes || [];
      
      // Buscar todas as raspadinhas vendidas/resgatadas
      const { data: scratchCards, error: cardsError } = await sb
        .from("scratch_cards")
        .select("prize_id, status")
        .in("status", ["registered", "redeemed"]);

      if (cardsError) throw cardsError;

      const soldCards = scratchCards || [];

      // Calcular o valor total baseado nas raspadinhas vendidas
      let totalPrizeValue = 0;
      
      for (const card of soldCards) {
        const prize = allPrizes.find(p => p.id === card.prize_id);
        if (prize) {
          totalPrizeValue += Number(prize.prize_value || 0);
        }
      }

      const totalPlatformCommission = totalPrizeValue * 0.1; // 10%
      const totalCompanyProfit = totalPrizeValue * 0.9; // 90%

      // Buscar empresas
      const { data: companies, error: companiesError } = await sb
        .from("companies")
        .select("id, name");

      if (companiesError) throw companiesError;

      // Criar relatório por empresa
      const companiesReport: CompanyReport[] = await Promise.all(
        companies.map(async (company) => {
          // Buscar raspadinhas vendidas desta empresa
          const { data: companyCards } = await sb
            .from("scratch_cards")
            .select("prize_id, status")
            .eq("company_id", company.id)
            .in("status", ["registered", "redeemed"]);

          const soldCompanyCards = companyCards || [];
          
          let companyTotalValue = 0;
          for (const card of soldCompanyCards) {
            const prize = allPrizes.find(p => p.id === card.prize_id);
            if (prize) {
              companyTotalValue += Number(prize.prize_value || 0);
            }
          }

          return {
            id: company.id,
            name: company.name,
            totalPrizeValue: companyTotalValue,
            companyProfit: companyTotalValue * 0.9,
            platformCommission: companyTotalValue * 0.1,
            prizesCount: soldCompanyCards.length,
          };
        })
      );

      setStats({
        totalCompanyProfit,
        totalPlatformCommission,
        totalPrizeValue,
        companiesReport,
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Cards Principais - Lado a Lado */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Lucro das Empresas */}
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Building2 className="w-6 h-6" />
              Lucro das Empresas
            </CardTitle>
            <CardDescription>
              90% do valor dos prêmios vendidos/resgatados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-green-600">
                R$ {formatCurrency(stats.totalCompanyProfit)}
              </div>
              <p className="text-sm text-muted-foreground">
                Com base em {stats.totalPrizeValue > 0 ? `R$ ${formatCurrency(stats.totalPrizeValue)}` : 'R$ 0,00'} em vendas
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Comissão da Plataforma */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <DollarSign className="w-6 h-6" />
              Comissão da Plataforma
            </CardTitle>
            <CardDescription>
              10% do valor dos prêmios vendidos/resgatados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-4xl font-bold text-blue-600">
                R$ {formatCurrency(stats.totalPlatformCommission)}
              </div>
              <p className="text-sm text-muted-foreground">
                Com base em {stats.totalPrizeValue > 0 ? `R$ ${formatCurrency(stats.totalPrizeValue)}` : 'R$ 0,00'} em vendas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Análise por Empresa */}
      {stats.companiesReport.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Análise Financeira por Empresa
            </CardTitle>
            <CardDescription>
              Distribuição de lucros e comissões por empresa parceira
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.companiesReport.map((company) => (
                <div
                  key={company.id}
                  className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{company.name}</h3>
                    <div className="text-sm text-muted-foreground">
                      {company.prizesCount} raspadinha{company.prizesCount !== 1 ? 's' : ''} vendida{company.prizesCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="font-semibold text-lg">
                        R$ {formatCurrency(company.totalPrizeValue)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Lucro (90%)</p>
                      <p className="font-semibold text-lg text-green-600">
                        R$ {formatCurrency(company.companyProfit)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Comissão (10%)</p>
                      <p className="font-semibold text-lg text-blue-600">
                        R$ {formatCurrency(company.platformCommission)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.companiesReport.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-muted-foreground">
              Nenhuma empresa cadastrada ainda. Cadastre empresas e prêmios para visualizar os relatórios.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
