import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, Sparkles, CheckCircle, AlertCircle, Share2, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import InputMask from "react-input-mask";
import { z } from "zod";
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
    contact_phone?: string;
  } | null;
};

const registrationSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(100),
  email: z.string().email("Email inválido").max(255),
  whatsapp: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (formato: (XX) XXXXX-XXXX)")
});
const Register = () => {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  
  const [formData, setFormData] = useState({
    codigo: codeFromUrl || "",
    name: "",
    whatsapp: "",
    email: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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
          prizes!prize_id(name, description),
          companies!company_id(name)
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

    // Validate form data
    try {
      registrationSchema.parse(formData);
      setFormErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setFormErrors(errors);
        return;
      }
    }

    setLoading(true);
    try {
      // Clean phone number for storage
      const cleanPhone = formData.whatsapp.replace(/\D/g, "");
      
      // Criar registro de cadastro
      const {
        error: regError
      } = await sb.from("registrations").insert({
        scratch_card_id: scratchCard.id,
        customer_name: formData.name,
        customer_email: formData.email,
        customer_phone: cleanPhone
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

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const message = `🎉 Ganhei ${scratchCard?.prizes?.name}!\n\nCódigo: ${scratchCard?.serial_code}\nResgatar em: ${scratchCard?.companies?.name}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (isValidated && scratchCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto mb-2 w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
              Parabéns! 🎉
            </CardTitle>
            <CardDescription className="text-lg">
              Cadastro realizado com sucesso!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Prize Information */}
            <div className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20">
              <p className="text-sm text-muted-foreground mb-2 text-center">Seu Prêmio</p>
              <p className="text-2xl font-bold text-center text-primary">
                {scratchCard.prizes?.name}
              </p>
              {scratchCard.prizes?.description && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  {scratchCard.prizes.description}
                </p>
              )}
            </div>

            {/* Serial Code */}
            <div className="p-4 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
              <p className="text-xs text-muted-foreground mb-1 text-center uppercase tracking-wide">
                Código da Raspadinha
              </p>
              <p className="text-2xl font-bold font-mono text-center tracking-wider">
                {scratchCard.serial_code}
              </p>
            </div>

            {/* Redemption Instructions */}
            <div className="space-y-3 p-4 bg-secondary/20 rounded-lg">
              <h3 className="font-semibold text-center">Como Resgatar</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <p>Dirija-se a <span className="font-semibold">{scratchCard.companies?.name}</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <p>Apresente o código <span className="font-mono font-semibold">{scratchCard.serial_code}</span></p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <p>Receba seu prêmio!</p>
                </div>
              </div>
              {scratchCard.companies?.contact_phone && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">Contato da loja:</p>
                  <p className="text-sm font-semibold">{scratchCard.companies.contact_phone}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button
                onClick={handleShare}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Guarde este código para resgatar seu prêmio
            </p>
          </CardContent>
        </Card>
      </div>
    );
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
                <Input 
                  id="name" 
                  placeholder="Digite seu nome completo" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <InputMask
                  mask="(99) 99999-9999"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                >
                  {/* @ts-ignore - InputMask types issue */}
                  {(inputProps: any) => (
                    <Input
                      {...inputProps}
                      id="whatsapp"
                      type="tel"
                      placeholder="(00) 00000-0000"
                      required
                      className={formErrors.whatsapp ? "border-red-500" : ""}
                    />
                  )}
                </InputMask>
                {formErrors.whatsapp && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.whatsapp}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  required
                  className={formErrors.email ? "border-red-500" : ""}
                />
                {formErrors.email && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                )}
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