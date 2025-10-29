import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoyaltyData {
  id: string;
  customer_phone: string;
  customer_name: string;
  points: number;
  tier: string;
  total_prizes_won: number;
  last_redemption_at: string | null;
  created_at: string;
}

const tierColors = {
  bronze: "bg-amber-700 text-white",
  silver: "bg-gray-400 text-black",
  gold: "bg-yellow-400 text-black",
  platinum: "bg-purple-600 text-white",
};

const tierIcons = {
  bronze: Award,
  silver: Star,
  gold: Trophy,
  platinum: Trophy,
};

export function LoyaltyTable() {
  const { data: loyaltyData, isLoading } = useQuery({
    queryKey: ["customer-loyalty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_loyalty")
        .select("*")
        .order("points", { ascending: false });

      if (error) throw error;
      return data as LoyaltyData[];
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Carregando programa de fidelidade...</div>;
  }

  if (!loyaltyData || loyaltyData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente no programa de fidelidade ainda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Programa de Fidelidade</h3>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
              <TableHead className="text-right">Prêmios Ganhos</TableHead>
              <TableHead>Último Resgate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loyaltyData.map((customer) => {
              const TierIcon = tierIcons[customer.tier as keyof typeof tierIcons];
              return (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.customer_name}</TableCell>
                  <TableCell>{customer.customer_phone}</TableCell>
                  <TableCell>
                    <Badge className={tierColors[customer.tier as keyof typeof tierColors]}>
                      <TierIcon className="h-3 w-3 mr-1" />
                      {customer.tier.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {customer.points.toLocaleString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">{customer.total_prizes_won}</TableCell>
                  <TableCell>
                    {customer.last_redemption_at
                      ? format(new Date(customer.last_redemption_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "Nunca"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Award className="h-4 w-4" />
            <span className="font-semibold">Bronze</span>
          </div>
          <p className="text-sm text-muted-foreground">0 - 199 pontos</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Star className="h-4 w-4" />
            <span className="font-semibold">Silver</span>
          </div>
          <p className="text-sm text-muted-foreground">200 - 499 pontos</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-yellow-600 mb-2">
            <Trophy className="h-4 w-4" />
            <span className="font-semibold">Gold</span>
          </div>
          <p className="text-sm text-muted-foreground">500 - 999 pontos</p>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <Trophy className="h-4 w-4" />
            <span className="font-semibold">Platinum</span>
          </div>
          <p className="text-sm text-muted-foreground">1000+ pontos</p>
        </div>
      </div>
    </div>
  );
}
