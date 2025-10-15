import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type Redemption = {
  id: string;
  attendant_name: string;
  notes: string | null;
  redeemed_at: string;
  scratch_cards: {
    serial_code: string;
    prizes: { name: string } | null;
    companies: { name: string } | null;
  } | null;
};

export const RedemptionsTable = () => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [filteredData, setFilteredData] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRedemptions = async () => {
    try {
      const { data, error } = await sb
        .from("redemptions")
        .select(`
          *,
          scratch_cards(
            serial_code,
            prizes(name),
            companies(name)
          )
        `)
        .order("redeemed_at", { ascending: false });

      if (error) throw error;
      setRedemptions(data || []);
      setFilteredData(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar resgates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions();
  }, []);

  useEffect(() => {
    const filtered = redemptions.filter(
      (red) =>
        red.attendant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        red.scratch_cards?.serial_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        red.scratch_cards?.prizes?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchTerm, redemptions]);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Entregas de Prêmios
            </CardTitle>
            <CardDescription>
              Histórico completo de prêmios entregues aos clientes
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            Total: {redemptions.length}
          </Badge>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por atendente, código ou prêmio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum resgate encontrado" : "Nenhum prêmio entregue ainda"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Atendente</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((red) => (
                <TableRow key={red.id}>
                  <TableCell>
                    {new Date(red.redeemed_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {red.scratch_cards?.serial_code || "-"}
                  </TableCell>
                  <TableCell>
                    {red.scratch_cards?.prizes?.name ? (
                      <Badge variant="default">
                        {red.scratch_cards.prizes.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{red.scratch_cards?.companies?.name || "-"}</TableCell>
                  <TableCell className="font-medium">{red.attendant_name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {red.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
