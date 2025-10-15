import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, CheckCircle, LogOut, BarChart3, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

export default function CompanyDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { role, companyId, loading: roleLoading } = useUserRole(user?.id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [serialCode, setSerialCode] = useState("");
  const [attendantName, setAttendantName] = useState("");
  const [notes, setNotes] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [scratchCard, setScratchCard] = useState<any>(null);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);

  // Buscar estatísticas
  const { data: stats } = useQuery({
    queryKey: ['company-stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar IDs das scratch_cards da empresa
      const { data: scratchCardIds } = await supabase
        .from('scratch_cards')
        .select('id')
        .eq('company_id', companyId);

      const cardIds = scratchCardIds?.map(sc => sc.id) || [];

      const [todayResult, monthResult] = await Promise.all([
        supabase
          .from('redemptions')
          .select('id', { count: 'exact' })
          .gte('redeemed_at', today.toISOString())
          .in('scratch_card_id', cardIds),
        supabase
          .from('redemptions')
          .select('id', { count: 'exact' })
          .gte('redeemed_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
          .in('scratch_card_id', cardIds),
      ]);

      return {
        today: todayResult.count || 0,
        month: monthResult.count || 0,
      };
    },
    enabled: !!companyId,
  });

  // Buscar últimas entregas
  const { data: recentRedemptions } = useQuery({
    queryKey: ['recent-redemptions', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('redemptions')
        .select(`
          *,
          scratch_cards!inner(
            serial_code,
            prizes(name),
            registrations(customer_name)
          )
        `)
        .eq('scratch_cards.company_id', companyId)
        .order('redeemed_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialCode.trim()) {
      toast({
        title: "Código obrigatório",
        description: "Digite o código da raspadinha",
        variant: "destructive",
      });
      return;
    }

    setSearchLoading(true);
    setScratchCard(null);
    setRedemptionSuccess(false);

    try {
      const { data, error } = await supabase
        .from('scratch_cards')
        .select(`
          *,
          prizes(*),
          companies(*),
          registrations(*)
        `)
        .eq('serial_code', serialCode.trim().toUpperCase())
        .eq('company_id', companyId!)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Código não encontrado",
          description: "Verifique o código ou esta raspadinha não pertence à sua empresa",
          variant: "destructive",
        });
        return;
      }

      if (data.status === 'redeemed') {
        toast({
          title: "Já entregue",
          description: "Este prêmio já foi entregue anteriormente",
          variant: "destructive",
        });
        return;
      }

      if (data.status !== 'registered') {
        toast({
          title: "Código inválido",
          description: "Esta raspadinha ainda não foi validada pelo cliente",
          variant: "destructive",
        });
        return;
      }

      setScratchCard(data);
    } catch (error: any) {
      toast({
        title: "Erro ao buscar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!attendantName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do atendente",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
          scratch_card_id: scratchCard.id,
          attendant_name: attendantName.trim(),
          notes: notes.trim() || null,
        });

      if (redemptionError) throw redemptionError;

      const { error: updateError } = await supabase
        .from('scratch_cards')
        .update({ status: 'redeemed' })
        .eq('id', scratchCard.id);

      if (updateError) throw updateError;

      setRedemptionSuccess(true);
      setSerialCode("");
      setAttendantName("");
      setNotes("");
      setScratchCard(null);

      toast({
        title: "✓ Entrega confirmada!",
        description: "Prêmio entregue com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Redirecionar se não for company_partner
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user) {
        navigate('/auth');
      } else if (role && role !== 'company_partner') {
        navigate('/dashboard');
      }
    }
  }, [user, role, authLoading, roleLoading, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || role !== 'company_partner') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Validações</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Busca */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Validar Entrega</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="serial">Código da Raspadinha</Label>
                <Input
                  id="serial"
                  value={serialCode}
                  onChange={(e) => setSerialCode(e.target.value.toUpperCase())}
                  placeholder="Digite o código"
                  className="text-lg h-12"
                  autoComplete="off"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-lg" 
                disabled={searchLoading}
              >
                {searchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buscar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Resultado da busca */}
        {scratchCard && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" />
                Informações do Prêmio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Prêmio</p>
                  <p className="font-semibold">{scratchCard.prizes?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-semibold">{scratchCard.registrations?.[0]?.customer_name}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label htmlFor="attendant">Atendente *</Label>
                  <Input
                    id="attendant"
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações opcionais"
                    rows={2}
                  />
                </div>
                <Button 
                  onClick={handleRedeem} 
                  className="w-full h-12 text-lg"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Confirmar Entrega
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{stats?.today || 0}</p>
                <p className="text-sm text-muted-foreground">Hoje</p>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <p className="text-3xl font-bold text-primary">{stats?.month || 0}</p>
                <p className="text-sm text-muted-foreground">Este Mês</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Últimas entregas */}
        {recentRedemptions && recentRedemptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Últimas Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentRedemptions.map((redemption: any) => {
                  const customerPhone = redemption.scratch_cards?.registrations?.[0]?.customer_phone;
                  const whatsappNumber = customerPhone 
                    ? customerPhone.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '55$1$2')
                    : null;
                  
                  return (
                    <div key={redemption.id} className="p-3 bg-muted rounded-lg">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-semibold">{redemption.scratch_cards?.prizes?.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {redemption.scratch_cards?.registrations?.[0]?.customer_name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Código: {redemption.scratch_cards?.serial_code}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(redemption.redeemed_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {whatsappNumber && (
                            <a
                              href={`https://wa.me/${whatsappNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MessageCircle className="w-4 h-4" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
