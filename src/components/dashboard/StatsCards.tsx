import { useEffect, useState } from "react";
import { TrendingUp, DollarSign, Ticket, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatsCard } from "./StatsCard";

const sb = supabase as any;

export const StatsCards = () => {
  const [stats, setStats] = useState({
    companyProfit: 0,
    platformCommission: 0,
    totalCards: 0,
    totalRegistrations: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch prizes
        const { data: prizes } = await sb
          .from("prizes")
          .select("id, prize_value, platform_commission_percentage");

        const allPrizes = prizes || [];

        // Fetch scratch cards
        const { data: scratchCards } = await sb
          .from("scratch_cards")
          .select("prize_id, status");

        const allCards = scratchCards || [];
        const soldCards = allCards.filter((c: any) => 
          c.status === "registered" || c.status === "redeemed"
        );

        // Fetch registrations count
        const { count: registrationsCount } = await sb
          .from("registrations")
          .select("*", { count: "exact", head: true });

        // Calculate totals
        let totalCommission = 0;
        let totalProfit = 0;

        for (const card of soldCards) {
          const prize = allPrizes.find((p: any) => p.id === card.prize_id);
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
          totalCards: allCards.length,
          totalRegistrations: registrationsCount || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Lucro das Empresas"
        value={formatCurrency(stats.companyProfit)}
        description="Total baseado em vendas"
        icon={TrendingUp}
        variant="success"
      />
      <StatsCard
        title="Comissão da Plataforma"
        value={formatCurrency(stats.platformCommission)}
        description="Percentual configurado por prêmio"
        icon={DollarSign}
        variant="primary"
      />
      <StatsCard
        title="Total de Raspadinhas"
        value={stats.totalCards.toLocaleString("pt-BR")}
        description="Criadas no sistema"
        icon={Ticket}
        variant="default"
      />
      <StatsCard
        title="Cadastros Realizados"
        value={stats.totalRegistrations.toLocaleString("pt-BR")}
        description="Clientes participantes"
        icon={Users}
        variant="default"
      />
    </div>
  );
};
