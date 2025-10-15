import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
};

type PrizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prize: Prize | null;
  onSuccess: () => void;
};

export const PrizeDialog = ({ open, onOpenChange, prize, onSuccess }: PrizeDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_quantity: "100",
    distributed_quantity: "0",
    prize_value: "0.00",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (prize) {
      setFormData({
        name: prize.name,
        description: prize.description || "",
        total_quantity: prize.total_quantity.toString(),
        distributed_quantity: prize.distributed_quantity.toString(),
        prize_value: prize.prize_value?.toString() || "0.00",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        total_quantity: "100",
        distributed_quantity: "0",
        prize_value: "0.00",
      });
    }
  }, [prize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const prizeValue = parseFloat(formData.prize_value);
      
      const dataToSave = {
        name: formData.name,
        description: formData.description || null,
        total_quantity: parseInt(formData.total_quantity),
        distributed_quantity: parseInt(formData.distributed_quantity),
        prize_value: prizeValue,
        cost_to_company: prizeValue * 0.9, // 90% do valor do prêmio (lucro da empresa)
        platform_commission_percentage: 10, // Sempre 10%
      };

      if (prize) {
        const { error } = await sb
          .from("prizes")
          .update(dataToSave)
          .eq("id", prize.id);

        if (error) throw error;
        toast.success("Prêmio atualizado com sucesso");
      } else {
        const { error } = await sb.from("prizes").insert([dataToSave]);

        if (error) throw error;
        toast.success("Prêmio criado com sucesso");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar prêmio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{prize ? "Editar Prêmio" : "Novo Prêmio"}</DialogTitle>
          <DialogDescription>Configure os detalhes do prêmio</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Prêmio</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Lanche R$ 30"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição detalhada do prêmio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="total">Quantidade Total</Label>
              <Input
                id="total"
                type="number"
                min="0"
                value={formData.total_quantity}
                onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="distributed">Distribuídos</Label>
              <Input
                id="distributed"
                type="number"
                min="0"
                value={formData.distributed_quantity}
                onChange={(e) => setFormData({ ...formData, distributed_quantity: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prize_value">Valor do Prêmio (R$)</Label>
            <Input
              id="prize_value"
              type="number"
              step="0.01"
              min="0"
              value={formData.prize_value}
              onChange={(e) => setFormData({ ...formData, prize_value: e.target.value })}
              placeholder="Ex: 30.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              A comissão da plataforma (10%) será calculada automaticamente
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};