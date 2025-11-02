import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Crown } from 'lucide-react';

export function LeaderboardTable() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_loyalty')
        .select('customer_name, customer_phone, points, tier, total_prizes_won')
        .order('points', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'from-slate-400 to-slate-600';
      case 'gold': return 'from-yellow-400 to-yellow-600';
      case 'silver': return 'from-gray-300 to-gray-500';
      default: return 'from-orange-400 to-orange-600';
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Medal className="h-5 w-5 text-orange-600" />;
      default: return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Pontos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Carregando ranking...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Pontos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cliente no ranking ainda
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle>🏆 Ranking de Pontos</CardTitle>
        </div>
        <CardDescription>
          Top 10 clientes com mais pontos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((customer, index) => (
            <div
              key={customer.customer_phone}
              className={`
                flex items-center gap-4 p-4 rounded-lg border
                ${index < 3 ? 'bg-gradient-to-r ' + getTierColor(customer.tier) + ' bg-opacity-10' : 'bg-muted/30'}
              `}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background border-2">
                {getPositionIcon(index + 1)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">
                  {customer.customer_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {customer.total_prizes_won} prêmios ganhos
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {customer.points.toLocaleString('pt-BR')}
                </div>
                <Badge 
                  variant="secondary"
                  className={`bg-gradient-to-r ${getTierColor(customer.tier)} text-white border-0`}
                >
                  {customer.tier.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}