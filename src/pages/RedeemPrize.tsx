import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PackageCheck, Search, CheckCircle, AlertCircle, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const sb = supabase as any;

// Validation schemas
const searchSchema = z.object({
  serialCode: z.string()
    .trim()
    .min(1, "Código é obrigatório")
    .max(100, "Código muito longo"),
});

const redeemSchema = z.object({
  attendantName: z.string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  notes: z.string()
    .trim()
    .max(500, "Observações devem ter no máximo 500 caracteres")
    .optional(),
});

type ScratchCard = {
  id: string;
  serial_code: string;
  status: string;
  prizes: { name: string; description: string | null } | null;
  companies: { name: string } | null;
  registrations: Array<{
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  }>;
};

const RedeemPrize = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [searchCode, setSearchCode] = useState("");
  const [scratchCard, setScratchCard] = useState<ScratchCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redeemed, setRedeemed] = useState(false);
  
  const [attendantName, setAttendantName] = useState("");
  const [notes, setNotes] = useState("");
  const [userCompanyId, setUserCompanyId] = useState<string | null>(null);

  // Carregar company_id do usuário se for company_partner
  useEffect(() => {
    const loadUserCompany = async () => {
      if (!user) return;

      const { data } = await sb
        .from('user_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserCompanyId(data?.company_id || null);
    };

    loadUserCompany();
  }, [user]);

  // Redirect if not authenticated
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setScratchCard(null);
    setRedeemed(false);

    try {
      // Validate input
      const validated = searchSchema.parse({ serialCode: searchCode });
      
      setLoading(true);

      let query = sb
        .from("scratch_cards")
        .select(`
          *,
          prizes(name, description),
          companies(name),
          registrations(customer_name, customer_email, customer_phone)
        `)
        .eq("serial_code", validated.serialCode);

      // Se o usuário tem company_id, filtrar apenas raspadinhas da empresa dele
      if (userCompanyId) {
        query = query.eq("company_id", userCompanyId);
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError("Código de raspadinha não encontrado.");
        return;
      }

      if (data.status === "available") {
        setError("Esta raspadinha ainda não foi cadastrada por nenhum cliente.");
        return;
      }

      if (data.status === "redeemed") {
        setError("Este prêmio já foi entregue anteriormente.");
        return;
      }

      if (!data.prizes) {
        setError("Esta raspadinha não possui um prêmio associado.");
        return;
      }

      if (!data.registrations || data.registrations.length === 0) {
        setError("Não foi encontrado cadastro de cliente para esta raspadinha.");
        return;
      }

      setScratchCard(data as any);
      toast.success("Raspadinha encontrada!");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else {
        setError("Erro ao buscar raspadinha.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scratchCard) return;

    try {
      // Validate inputs
      const validated = redeemSchema.parse({
        attendantName,
        notes: notes || undefined,
      });

      setLoading(true);

      // Insert redemption record
      const { error: redeemError } = await sb.from("redemptions").insert({
        scratch_card_id: scratchCard.id,
        attendant_name: validated.attendantName,
        notes: validated.notes || null,
      });

      if (redeemError) throw redeemError;

      // Update scratch card status
      const { error: updateError } = await sb
        .from("scratch_cards")
        .update({ status: "redeemed" })
        .eq("id", scratchCard.id);

      if (updateError) throw updateError;

      setRedeemed(true);
      toast.success("Prêmio entregue com sucesso!");
      
      // Clear form after 3 seconds
      setTimeout(() => {
        setSearchCode("");
        setScratchCard(null);
        setRedeemed(false);
        setAttendantName("");
        setNotes("");
        setError("");
      }, 3000);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Erro ao registrar entrega");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (redeemed && scratchCard) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-glow border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-success rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
              <CheckCircle className="w-10 h-10 text-secondary-foreground" />
            </div>
            <CardTitle className="text-2xl">Entrega Confirmada!</CardTitle>
            <CardDescription>Prêmio entregue com sucesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-6 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">Prêmio Entregue:</p>
              <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {scratchCard.prizes?.name}
              </p>
              <div className="pt-4 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  <span className="font-medium">{scratchCard.registrations[0]?.customer_name}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Código:</span>{" "}
                  <span className="font-mono font-medium">{scratchCard.serial_code}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Atendente:</span>{" "}
                  <span className="font-medium">{attendantName}</span>
                </p>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Redirecionando para nova validação em 3 segundos...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            ← Voltar ao Dashboard
          </Button>
        </div>

        <Card className="shadow-card mb-6">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <PackageCheck className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Validar Entrega de Prêmio</CardTitle>
            <CardDescription>
              Digite o código da raspadinha para confirmar a entrega do prêmio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="searchCode">Código da Raspadinha</Label>
                <div className="flex gap-2">
                  <Input
                    id="searchCode"
                    placeholder="Digite o código..."
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    className="font-mono"
                    disabled={loading}
                    required
                  />
                  <Button type="submit" disabled={loading}>
                    <Search className="w-4 h-4 mr-2" />
                    {loading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Erro na Validação</p>
                  <p className="text-sm text-destructive/80 mt-1">{error}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {scratchCard && !redeemed && (
          <Card className="shadow-card border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Confirmar Entrega
              </CardTitle>
              <CardDescription>
                Verifique os dados e confirme a entrega do prêmio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prize Information */}
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Prêmio:</p>
                  <p className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {scratchCard.prizes?.name}
                  </p>
                  {scratchCard.prizes?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {scratchCard.prizes.description}
                    </p>
                  )}
                </div>
                
                {scratchCard.companies && (
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa:</p>
                    <p className="font-medium">{scratchCard.companies.name}</p>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="font-semibold mb-2">Dados do Cliente:</p>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Nome:</span>{" "}
                    <span className="font-medium">
                      {scratchCard.registrations[0]?.customer_name}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    <span className="font-medium">
                      {scratchCard.registrations[0]?.customer_email}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Telefone:</span>{" "}
                    <span className="font-medium">
                      {scratchCard.registrations[0]?.customer_phone}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Código:</span>{" "}
                    <span className="font-mono font-medium">
                      {scratchCard.serial_code}
                    </span>
                  </p>
                </div>
              </div>

              {/* Redemption Form */}
              <form onSubmit={handleRedeem} className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="attendantName">
                    Nome do Atendente <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="attendantName"
                    placeholder="Digite seu nome"
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">
                    Observações <span className="text-muted-foreground">(opcional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex: Cliente apresentou documento de identidade"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={loading}
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">
                    {notes.length}/500 caracteres
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setScratchCard(null);
                      setSearchCode("");
                      setAttendantName("");
                      setNotes("");
                      setError("");
                    }}
                    disabled={loading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                  >
                    <PackageCheck className="w-4 h-4 mr-2" />
                    {loading ? "Confirmando..." : "Confirmar Entrega"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RedeemPrize;
