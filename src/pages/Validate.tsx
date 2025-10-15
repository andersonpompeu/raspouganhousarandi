import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

type ScratchCard = {
  id: string;
  serial_code: string;
  status: string;
  prizes: { name: string; description: string | null } | null;
  companies: { name: string } | null;
};

const Validate = () => {
  const { serial } = useParams();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [scratchCard, setScratchCard] = useState<ScratchCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isValidated, setIsValidated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchScratchCard = async () => {
      if (!serial) return;

      try {
        const { data, error } = await sb
          .from("scratch_cards")
          .select(`
            *,
            prizes(name, description),
            companies(name)
          `)
          .eq("serial_code", serial)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setError("Código de raspadinha não encontrado.");
        } else if (data.status === "registered") {
          setError("Esta raspadinha já foi cadastrada anteriormente.");
        } else if (data.status === "redeemed") {
          setError("Este prêmio já foi resgatado.");
        } else if (!data.prizes) {
          setError("Esta raspadinha não possui um prêmio associado.");
        } else {
          setScratchCard(data as any);
        }
      } catch (error: any) {
        setError("Código de raspadinha não encontrado.");
      } finally {
        setLoading(false);
      }
    };

    fetchScratchCard();
  }, [serial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scratchCard) return;

    setLoading(true);

    try {
      // Criar registro de cadastro
      const { error: regError } = await sb.from("registrations").insert({
        scratch_card_id: scratchCard.id,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: formData.phone,
      });

      if (regError) throw regError;

      // Atualizar status da raspadinha
      const { error: updateError } = await sb
        .from("scratch_cards")
        .update({ status: "registered" })
        .eq("id", scratchCard.id);

      if (updateError) throw updateError;

      setIsValidated(true);
      toast.success("Raspadinha validada com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao validar raspadinha");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando raspadinha...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-card border-2 border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Raspadinha Inválida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Código: <span className="font-mono font-bold">{serial}</span>
            </p>
            <Button variant="outline" onClick={() => window.location.href = "/"}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isValidated && scratchCard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-glow border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-success rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
              <CheckCircle className="w-10 h-10 text-secondary-foreground" />
            </div>
            <CardTitle className="text-2xl">Parabéns!</CardTitle>
            <CardDescription>Seu prêmio foi validado com sucesso</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-muted p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Você ganhou:</p>
              <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {scratchCard.prizes?.name}
              </p>
              {scratchCard.prizes?.description && (
                <p className="text-sm text-muted-foreground mt-2">
                  {scratchCard.prizes.description}
                </p>
              )}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Número da Raspadinha: <span className="font-mono font-bold">{scratchCard.serial_code}</span>
              </p>
              {scratchCard.companies && (
                <p>
                  Empresa: <span className="font-bold">{scratchCard.companies.name}</span>
                </p>
              )}
              <p className="pt-4">
                Para resgatar seu prêmio, apresente este código no estabelecimento parceiro.
              </p>
            </div>
            <Button className="w-full bg-gradient-primary hover:opacity-90" onClick={() => window.print()}>
              Imprimir Comprovante
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Validar Raspadinha</CardTitle>
          <CardDescription>Preencha seus dados para validar seu prêmio</CardDescription>
        </CardHeader>
        <CardContent>
          {scratchCard && (
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Prêmio:</p>
              <p className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                {scratchCard.prizes?.name}
              </p>
              {scratchCard.prizes?.description && (
                <p className="text-sm text-muted-foreground mt-1">{scratchCard.prizes.description}</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Número de Série</Label>
              <Input id="serial" value={serial || ""} disabled className="font-mono" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Digite seu nome"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
              <Sparkles className="w-4 h-4 mr-2" />
              {loading ? "Validando..." : "Validar Prêmio"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Validate;
