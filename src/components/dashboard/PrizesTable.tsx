import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PrizeDialog } from "./PrizeDialog";

const sb = supabase as any;

type Prize = {
  id: string;
  name: string;
  description: string | null;
  total_quantity: number;
  distributed_quantity: number;
  prize_value: number;
  cost_to_company: number;
  platform_commission_percentage: number;
  actual_distributed?: number; // Contagem real de raspadinhas vendidas/resgatadas
};

export const PrizesTable = () => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPrize, setSelectedPrize] = useState<Prize | null>(null);

  const fetchPrizes = async () => {
    try {
      const { data, error } = await sb
        .from("prizes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Buscar a contagem real de raspadinhas vendidas/resgatadas para cada prêmio
      const prizesWithActualCount = await Promise.all(
        (data || []).map(async (prize: Prize) => {
          const { count } = await sb
            .from("scratch_cards")
            .select("*", { count: "exact", head: true })
            .eq("prize_id", prize.id)
            .in("status", ["registered", "redeemed"]);
          
          return {
            ...prize,
            actual_distributed: count || 0,
          };
        })
      );
      
      setPrizes(prizesWithActualCount);
    } catch (error: any) {
      toast.error("Erro ao carregar prêmios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrizes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este prêmio?")) return;

    try {
      const { error } = await sb.from("prizes").delete().eq("id", id);

      if (error) throw error;
      toast.success("Prêmio removido com sucesso");
      fetchPrizes();
    } catch (error: any) {
      toast.error("Erro ao remover prêmio");
    }
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prêmios Configurados</CardTitle>
              <CardDescription>Gerencie os prêmios disponíveis e quantidades</CardDescription>
            </div>
            <Button
              className="bg-gradient-primary hover:opacity-90"
              onClick={() => {
                setSelectedPrize(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Prêmio
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : prizes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum prêmio cadastrado</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Distribuídos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizes.map((prize) => {
                  const distributedCount = prize.actual_distributed ?? prize.distributed_quantity;
                  const percentage = prize.total_quantity > 0
                    ? Math.round((distributedCount / prize.total_quantity) * 100)
                    : 0;

                  return (
                    <TableRow key={prize.id}>
                      <TableCell className="font-medium">
                        <div>
                          {prize.name}
                          {prize.description && (
                            <p className="text-sm text-muted-foreground">{prize.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        R$ {Number(prize.prize_value).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        R$ {Number(prize.cost_to_company).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {Number(prize.platform_commission_percentage).toFixed(1)}%
                      </TableCell>
                      <TableCell>{distributedCount}</TableCell>
                      <TableCell>{prize.total_quantity}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="w-24" />
                          <span className="text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setSelectedPrize(prize);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(prize.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PrizeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        prize={selectedPrize}
        onSuccess={fetchPrizes}
      />
    </>
  );
};