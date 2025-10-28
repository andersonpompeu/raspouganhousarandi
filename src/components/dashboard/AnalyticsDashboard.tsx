import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Clock, Package, Award } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

const sb = supabase as any;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const periodDays = parseInt(period);
  const startDate = startOfDay(subDays(new Date(), periodDays));
  const endDate = endOfDay(new Date());

  // Fetch KPIs
  const { data: kpis } = useQuery({
    queryKey: ['analytics-kpis', period],
    queryFn: async () => {
      // Total registrations
      const { count: totalRegistrations } = await sb
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .gte('registered_at', startDate.toISOString())
        .lte('registered_at', endDate.toISOString());

      // Total redemptions
      const { count: totalRedemptions } = await sb
        .from('redemptions')
        .select('*', { count: 'exact', head: true })
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      // Pending (registered but not redeemed)
      const { count: pending } = await sb
        .from('scratch_cards')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'registered');

      // Calculate conversion rate
      const conversionRate = totalRegistrations > 0 
        ? ((totalRedemptions / totalRegistrations) * 100).toFixed(1)
        : '0.0';

      // Average redemption time (in hours)
      const { data: redemptionTimes } = await sb
        .from('redemptions')
        .select(`
          redeemed_at,
          scratch_cards!inner(
            registrations!inner(registered_at)
          )
        `)
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      let avgHours = 0;
      if (redemptionTimes && redemptionTimes.length > 0) {
        const totalHours = redemptionTimes.reduce((sum: number, r: any) => {
          const regTime = new Date(r.scratch_cards.registrations[0]?.registered_at).getTime();
          const redTime = new Date(r.redeemed_at).getTime();
          return sum + ((redTime - regTime) / (1000 * 60 * 60));
        }, 0);
        avgHours = Math.round(totalHours / redemptionTimes.length);
      }

      return {
        totalRegistrations: totalRegistrations || 0,
        totalRedemptions: totalRedemptions || 0,
        pending: pending || 0,
        conversionRate,
        avgRedemptionHours: avgHours
      };
    }
  });

  // Fetch daily trend data
  const { data: trendData } = useQuery({
    queryKey: ['analytics-trend', period],
    queryFn: async () => {
      const { data: registrations } = await sb
        .from('registrations')
        .select('registered_at')
        .gte('registered_at', startDate.toISOString())
        .lte('registered_at', endDate.toISOString());

      const { data: redemptions } = await sb
        .from('redemptions')
        .select('redeemed_at')
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      // Group by day
      const dayMap: Record<string, { date: string; registrations: number; redemptions: number }> = {};
      
      for (let i = 0; i < periodDays; i++) {
        const date = format(subDays(new Date(), periodDays - i - 1), 'dd/MM');
        dayMap[date] = { date, registrations: 0, redemptions: 0 };
      }

      registrations?.forEach((r: any) => {
        const date = format(new Date(r.registered_at), 'dd/MM');
        if (dayMap[date]) dayMap[date].registrations++;
      });

      redemptions?.forEach((r: any) => {
        const date = format(new Date(r.redeemed_at), 'dd/MM');
        if (dayMap[date]) dayMap[date].redemptions++;
      });

      return Object.values(dayMap);
    }
  });

  // Fetch prize distribution
  const { data: prizeDistribution } = useQuery({
    queryKey: ['analytics-prizes', period],
    queryFn: async () => {
      const { data } = await sb
        .from('redemptions')
        .select(`
          scratch_cards!inner(
            prizes!inner(name)
          )
        `)
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      const prizeMap: Record<string, number> = {};
      data?.forEach((r: any) => {
        const prizeName = r.scratch_cards.prizes?.name || 'Sem Prêmio';
        prizeMap[prizeName] = (prizeMap[prizeName] || 0) + 1;
      });

      return Object.entries(prizeMap).map(([name, value]) => ({
        name,
        value
      }));
    }
  });

  // Fetch company performance
  const { data: companyPerformance } = useQuery({
    queryKey: ['analytics-companies', period],
    queryFn: async () => {
      const { data } = await sb
        .from('redemptions')
        .select(`
          scratch_cards!inner(
            companies!inner(name)
          )
        `)
        .gte('redeemed_at', startDate.toISOString())
        .lte('redeemed_at', endDate.toISOString());

      const companyMap: Record<string, number> = {};
      data?.forEach((r: any) => {
        const companyName = r.scratch_cards.companies?.name || 'Sem Empresa';
        companyMap[companyName] = (companyMap[companyName] || 0) + 1;
      });

      return Object.entries(companyMap)
        .map(([name, redemptions]) => ({ name, redemptions }))
        .sort((a, b) => b.redemptions - a.redemptions)
        .slice(0, 10);
    }
  });

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard Analytics</h2>
          <p className="text-muted-foreground">Análise detalhada de desempenho</p>
        </div>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Cadastros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{kpis?.totalRegistrations || 0}</div>
              <Package className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prêmios Entregues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{kpis?.totalRedemptions || 0}</div>
              <Award className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{kpis?.pending || 0}</div>
              <Clock className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{kpis?.conversionRate || 0}%</div>
              <TrendingUp className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Médio (horas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{kpis?.avgRedemptionHours || 0}h</div>
              <Clock className="w-8 h-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Cadastros vs Resgates</CardTitle>
            <CardDescription>Evolução diária no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="registrations" stroke="#8884d8" name="Cadastros" />
                <Line type="monotone" dataKey="redemptions" stroke="#82ca9d" name="Resgates" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Prize Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Prêmios</CardTitle>
            <CardDescription>Prêmios mais resgatados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prizeDistribution || []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {(prizeDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Company Performance */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Desempenho por Empresa</CardTitle>
            <CardDescription>Top 10 empresas com mais resgates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={companyPerformance || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="redemptions" fill="#8884d8" name="Resgates" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};