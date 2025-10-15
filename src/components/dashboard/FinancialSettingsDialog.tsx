import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toast } from "sonner";

type FinancialSettings = {
  defaultSalePrice: number;
  defaultProductionCost: number;
  minimumProfitMargin: number;
  alertRedemptionRate: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const FinancialSettingsDialog = ({ open, onOpenChange }: Props) => {
  const [settings, setSettings] = useState<FinancialSettings>({
    defaultSalePrice: 5.0,
    defaultProductionCost: 1.5,
    minimumProfitMargin: 50,
    alertRedemptionRate: 30,
  });

  const handleSave = () => {
    // Salvar configurações no localStorage por enquanto
    // Em produção, isso deveria ir para o banco de dados
    localStorage.setItem("financialSettings", JSON.stringify(settings));
    toast.success("Configurações salvas com sucesso!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configurações Financeiras
          </DialogTitle>
          <DialogDescription>
            Configure os valores padrão e parâmetros de alerta do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="salePrice">Preço de Venda Padrão (R$)</Label>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              value={settings.defaultSalePrice}
              onChange={(e) =>
                setSettings({ ...settings, defaultSalePrice: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Valor padrão que as empresas pagam por raspadinha
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productionCost">Custo de Produção Padrão (R$)</Label>
            <Input
              id="productionCost"
              type="number"
              step="0.01"
              value={settings.defaultProductionCost}
              onChange={(e) =>
                setSettings({ ...settings, defaultProductionCost: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Custo de produção unitário da raspadinha
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profitMargin">Margem Mínima Aceitável (%)</Label>
            <Input
              id="profitMargin"
              type="number"
              step="1"
              value={settings.minimumProfitMargin}
              onChange={(e) =>
                setSettings({ ...settings, minimumProfitMargin: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Sistema alertará se margem ficar abaixo deste valor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="redemptionRate">Taxa de Resgate Alerta (%)</Label>
            <Input
              id="redemptionRate"
              type="number"
              step="1"
              value={settings.alertRedemptionRate}
              onChange={(e) =>
                setSettings({ ...settings, alertRedemptionRate: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground">
              Alertar quando taxa de resgate ultrapassar este valor
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
