import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

const sb = supabase as any;

type GenerateBatchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export const GenerateBatchDialog = ({ open, onOpenChange, onSuccess }: GenerateBatchDialogProps) => {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [prizes, setPrizes] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    prefix: "RSP",
    startNumber: "1",
    quantity: "100",
    companyId: "none",
    prizeId: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [companiesRes, prizesRes] = await Promise.all([
        sb.from("companies").select("id, name").eq("status", "active"),
        sb.from("prizes").select("id, name"),
      ]);

      if (companiesRes.data) setCompanies(companiesRes.data);
      if (prizesRes.data) setPrizes(prizesRes.data);
    };

    if (open) fetchData();
  }, [open]);

  const generateSerialCode = (number: number) => {
    return `${formData.prefix}-${number.toString().padStart(4, "0")}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantity = parseInt(formData.quantity);
      const startNum = parseInt(formData.startNumber);

      // Validar se prêmio foi selecionado
      if (!formData.prizeId) {
        toast.error("Selecione um prêmio para as raspadinhas");
        setLoading(false);
        return;
      }

      // Inserir scratch cards e gerar QR codes
      for (let i = 0; i < quantity; i++) {
        const serialCode = generateSerialCode(startNum + i);
        
        // Insert scratch card
        const { data: card, error: insertError } = await sb
          .from("scratch_cards")
          .insert({
            serial_code: serialCode,
            company_id: formData.companyId === "none" ? null : formData.companyId,
            prize_id: formData.prizeId,
            status: "available",
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Generate QR code
        const registerUrl = `${window.location.origin}/cadastrar?code=${serialCode}`;
        const qrCodeDataUrl = await QRCode.toDataURL(registerUrl, {
          width: 512,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Convert base64 to blob
        const base64Response = await fetch(qrCodeDataUrl);
        const blob = await base64Response.blob();

        // Upload QR code to storage
        const fileName = `${serialCode}.png`;
        const { error: uploadError } = await sb.storage
          .from('qr-codes')
          .upload(fileName, blob, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error(`Failed to upload QR for ${serialCode}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = sb.storage
          .from('qr-codes')
          .getPublicUrl(fileName);

        // Update scratch card with QR code URL
        await sb
          .from("scratch_cards")
          .update({ qr_code_url: publicUrl })
          .eq("id", card.id);
      }

      toast.success(`${quantity} raspadinhas com QR codes geradas!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Alguns códigos já existem. Ajuste o número inicial.");
      } else {
        toast.error(error.message || "Erro ao gerar lote");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Lote de Raspadinhas</DialogTitle>
          <DialogDescription>
            Configure os códigos únicos que serão gerados
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefixo</Label>
              <Input
                id="prefix"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                placeholder="RSP"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start">Número Inicial</Label>
              <Input
                id="start"
                type="number"
                min="1"
                value={formData.startNumber}
                onChange={(e) => setFormData({ ...formData, startNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max="1000"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Será gerado: {formData.prefix}-{formData.startNumber.padStart(4, "0")} até{" "}
              {generateSerialCode(parseInt(formData.startNumber) + parseInt(formData.quantity) - 1)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company">Empresa (opcional)</Label>
            <Select value={formData.companyId} onValueChange={(value) => setFormData({ ...formData, companyId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prize">Prêmio *</Label>
            <Select value={formData.prizeId} onValueChange={(value) => setFormData({ ...formData, prizeId: value })} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um prêmio" />
              </SelectTrigger>
              <SelectContent>
                {prizes.length === 0 ? (
                  <SelectItem value="no-prizes" disabled>
                    Nenhum prêmio cadastrado
                  </SelectItem>
                ) : (
                  prizes.map((prize) => (
                    <SelectItem key={prize.id} value={prize.id}>
                      {prize.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {prizes.length === 0 && (
              <p className="text-xs text-destructive">
                Cadastre pelo menos um prêmio antes de gerar raspadinhas
              </p>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-primary hover:opacity-90" disabled={loading}>
              {loading ? "Gerando..." : "Gerar Lote"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
