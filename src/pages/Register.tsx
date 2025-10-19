import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
  prizes: {
    name: string;
    description: string | null;
  } | null;
  companies: {
    name: string;
  } | null;
};
const Register = () => {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  
  const [formData, setFormData] = useState({
    codigo: codeFromUrl || "",
    name: "",
    whatsapp: "",
    email: ""
  });
  const [scratchCard, setScratchCard] = useState<ScratchCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"code" | "form">("code");

  // Auto-verificar código se vier da URL
  useEffect(() => {
    if (codeFromUrl && !scratchCard && !error) {
      handleVerifyCode(null, codeFromUrl);
    }
  }, [codeFromUrl]);
  const handleVerifyCode = async (e: React.FormEvent | null, codeOverride?: string) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError("");
    
    const codeToVerify = codeOverride || formData.codigo.trim();
    
    try {
      const {
        data,
        error
      } = await sb.from("scratch_cards").select(`
          *,
          prizes(name, description),
          companies(name)
        `).eq("serial_code", codeToVerify).maybeSingle();
      if (error) throw error;
      if (!data) {
        setError("Código de raspadinha não encontrado. Verifique e tente novamente.");
      } else if (data.status === "registered") {
        setError("Esta raspadinha já foi cadastrada anteriormente.");
      } else if (data.status === "redeemed") {
        setError("Este prêmio já foi resgatado.");
      } else if (!data.prizes) {
        setError("Esta raspadinha não possui um prêmio associado.");
      } else {
        setScratchCard(data as any);
        setStep("form");
      }
    } catch (error: any) {
      setError("Erro ao verificar código. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scratchCard) return;
    setLoading(true);
    try {
      // Criar registro de cadastro
      const {
        error: regError
      } = await sb.from("registrations").insert({
        scratch_card_id: scratchCard.id,
        customer_name: formData.name,
        customer_email: formData.email || `${formData.whatsapp}@temp.com`,
        customer_phone: formData.whatsapp
      });
      if (regError) throw regError;

      // Atualizar status da raspadinha
      const {
        error: updateError
      } = await sb.from("scratch_cards").update({
        status: "registered"
      }).eq("id", scratchCard.id);
      if (updateError) throw updateError;
      
      // Enviar WhatsApp imediato após cadastro
      try {
        console.log('📱 Enviando notificação WhatsApp de cadastro...');
        const { data: whatsappData, error: whatsappError } = await sb.functions.invoke(
          'send-whatsapp-notification',
          {
            body: {
              customerName: formData.name,
              customerPhone: formData.whatsapp,
              prizeName: scratchCard.prizes?.name || 'Prêmio',
              serialCode: scratchCard.serial_code,
              companyName: scratchCard.companies?.name || 'Loja parceira',
            }
          }
        );

        if (whatsappError) {
          console.error('⚠️ Erro ao enviar WhatsApp:', whatsappError);
        } else if (whatsappData?.success) {
          console.log('✅ WhatsApp de cadastro enviado!');
        }
      } catch (whatsappError) {
        console.error('⚠️ Falha ao enviar WhatsApp de cadastro:', whatsappError);
        // Não bloquear o cadastro se WhatsApp falhar
      }
      
      setIsValidated(true);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar cadastro");
    } finally {
      setLoading(false);
    }
  };
  if (isValidated && scratchCard) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-glow border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-gradient-success rounded-full flex items-center justify-center mb-4 animate-bounce-slow">
              <CheckCircle className="w-10 h-10 text-secondary-foreground" />
            </div>
            <CardTitle className="text-2xl">Parabéns!</CardTitle>
            <CardDescription className="text-base">
              Você já está participando da promoção
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="bg-muted p-6 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Você ganhou:</p>
              <p className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                {scratchCard.prizes?.name}
              </p>
              {scratchCard.prizes?.description && <p className="text-sm text-muted-foreground mt-2">
                  {scratchCard.prizes.description}
                </p>}
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Código: <span className="font-mono font-bold">{scratchCard.serial_code}</span>
              </p>
              {scratchCard.companies && <p>
                  Empresa: <span className="font-bold">{scratchCard.companies.name}</span>
                </p>}
              <div className="pt-4 border-t">
                <p className="text-base font-semibold text-foreground mb-2">
                  ✅ Cadastro confirmado!
                </p>
                <p>
                  Para resgatar seu prêmio, apresente este código no estabelecimento parceiro.
                </p>
              </div>
            </div>
            
          </CardContent>
        </Card>
      </div>;
  }
  if (step === "form" && scratchCard) {
    return <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-card">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
              <Gift className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Complete seu Cadastro</CardTitle>
            <CardDescription>
              Preencha seus dados para participar da promoção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Prêmio:</p>
              <p className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                {scratchCard.prizes?.name}
              </p>
              {scratchCard.prizes?.description && <p className="text-sm text-muted-foreground mt-1">
                  {scratchCard.prizes.description}
                </p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigo-confirm">Código da Raspadinha</Label>
                <Input id="codigo-confirm" value={scratchCard.serial_code} disabled className="font-mono bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input id="name" placeholder="Digite seu nome completo" value={formData.name} onChange={e => setFormData({
                ...formData,
                name: e.target.value
              })} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input id="whatsapp" type="tel" placeholder="(00) 00000-0000" value={formData.whatsapp} onChange={e => setFormData({
                ...formData,
                whatsapp: e.target.value
              })} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={e => setFormData({
                ...formData,
                email: e.target.value
              })} />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="w-full" onClick={() => {
                setStep("code");
                setScratchCard(null);
                setFormData({
                  ...formData,
                  name: "",
                  whatsapp: "",
                  email: ""
                });
              }}>
                  Voltar
                </Button>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {loading ? "Cadastrando..." : "Participar da Promoção"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
            <Gift className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Cadastre sua Raspadinha</CardTitle>
          <CardDescription>
            Digite o código da sua raspadinha para participar da promoção
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>}

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código da Raspadinha *</Label>
              <Input id="codigo" placeholder="Ex: RSP-0001" value={formData.codigo} onChange={e => {
              setFormData({
                ...formData,
                codigo: e.target.value
              });
              setError("");
            }} className="font-mono text-lg" required />
              <p className="text-xs text-muted-foreground">
                Digite o código que está na sua raspadinha
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 text-xl font-bold">
              <Sparkles className="w-4 h-4 mr-2" />
              {loading ? "Verificando..." : "Verificar Código"}
            </Button>
          </form>

          
        </CardContent>
      </Card>
    </div>;
};
export default Register;