import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GenerateBatchDialog } from "./GenerateBatchDialog";
import { RegisterCustomerDialog } from "./RegisterCustomerDialog";

const sb = supabase as any;

type ScratchCard = {
  id: string;
  serial_code: string;
  status: string;
  created_at: string;
  companies: { name: string } | null;
  prizes: { name: string } | null;
  registrations: Array<{ registered_at: string }>;
};

export const ScratchCardsTable = () => {
  const [cards, setCards] = useState<ScratchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<ScratchCard | null>(null);

  const fetchCards = async () => {
    try {
      const { data, error } = await sb
        .from("scratch_cards")
        .select(`
          *,
          companies(name),
          prizes(name),
          registrations(registered_at)
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar raspadinhas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: "Disponível",
      registered: "Cadastrada",
      redeemed: "Resgatada",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string) => {
    if (status === "redeemed") return "default";
    if (status === "registered") return "secondary";
    return "outline";
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Raspadinhas Distribuídas</CardTitle>
              <CardDescription>Acompanhe o status de cada raspadinha por número de série</CardDescription>
            </div>
            <Button 
              className="bg-gradient-primary hover:opacity-90" 
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Gerar Lote
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : cards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma raspadinha gerada ainda</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-mono font-bold">{card.serial_code}</TableCell>
                    <TableCell>{card.companies?.name || "-"}</TableCell>
                    <TableCell>{card.prizes?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(card.status)}>
                        {getStatusLabel(card.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(card.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCard(card);
                          setRegisterDialogOpen(true);
                        }}
                        disabled={card.status !== "available"}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Cadastrar Cliente
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <GenerateBatchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchCards}
      />

      {selectedCard && (
        <RegisterCustomerDialog
          open={registerDialogOpen}
          onOpenChange={setRegisterDialogOpen}
          scratchCard={selectedCard}
          onSuccess={fetchCards}
        />
      )}
    </>
  );
};
