import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, CheckCircle } from "lucide-react";

const sb = supabase as any;

type RegisterCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scratchCard: {
    id: string;
    serial_code: string;
    prizes?: { name: string } | null;
    companies?: { name: string } | null;
  };
  onSuccess: () => void;
};

export const RegisterCustomerDialog = ({ 
  open, 
  onOpenChange, 
  scratchCard,
  onSuccess 
}: RegisterCustomerDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
  });
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Criar registro de cadastro
      const { error: regError } = await sb.from("registrations").insert({
        scratch_card_id: scratchCard.id,
        customer_name: formData.name,
        customer_email: `${formData.whatsapp}@temp.com`, // Email temporário
        customer_phone: formData.whatsapp,
      });

      if (regError) throw regError;

      // Atualizar status da raspadinha
      const { error: updateError } = await sb
        .from("scratch_cards")
        .update({ status: "registered" })
        .eq("id", scratchCard.id);

      if (updateError) throw updateError;

      setRegistered(true);
      toast.success("Cliente cadastrado com sucesso!");
      
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setRegistered(false);
        setFormData({ name: "", whatsapp: "" });
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto w-20 h-20 bg-gradient-success rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
              <CheckCircle className="w-10 h-10 text-secondary-foreground" />
            </div>
            <DialogTitle className="text-2xl mb-2">Cadastro Realizado!</DialogTitle>
            <DialogDescription className="text-base">
              Cliente cadastrado com sucesso na raspadinha
            </DialogDescription>
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Código:</p>
              <p className="font-mono font-bold text-lg">{scratchCard.serial_code}</p>
              {scratchCard.prizes && (
                <>
                  <p className="text-sm text-muted-foreground mt-3 mb-1">Prêmio:</p>
                  <p className="font-bold text-primary">{scratchCard.prizes.name}</p>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Cadastrar Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente para validar a raspadinha
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Código da Raspadinha:</p>
          <p className="font-mono font-bold text-lg">{scratchCard.serial_code}</p>
          {scratchCard.prizes && (
            <>
              <p className="text-sm text-muted-foreground mt-2 mb-1">Prêmio:</p>
              <p className="font-semibold text-primary">{scratchCard.prizes.name}</p>
            </>
          )}
          {scratchCard.companies && (
            <>
              <p className="text-sm text-muted-foreground mt-2 mb-1">Empresa:</p>
              <p className="font-semibold">{scratchCard.companies.name}</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código de Validação</Label>
            <Input
              id="codigo"
              value={scratchCard.serial_code}
              disabled
              className="font-mono bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo do Cliente *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp do Cliente *</Label>
            <Input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="bg-gradient-primary hover:opacity-90" 
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
