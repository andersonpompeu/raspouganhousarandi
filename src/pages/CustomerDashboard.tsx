import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Award, TrendingUp, Phone, Mail, Trophy, Gift, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);

  // Fetch customer loyalty data
  const { data: loyaltyData, isLoading } = useQuery({
    queryKey: ['customer-loyalty', phone],
    queryFn: async () => {
      if (!isAuthenticated || !phone) return null;

      const { data, error } = await supabase
        .from('customer_loyalty')
        .select('*')
        .eq('customer_phone', phone)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated && !!phone,
  });

  // Fetch customer redemptions
  const { data: redemptions } = useQuery({
    queryKey: ['customer-redemptions', phone],
    queryFn: async () => {
      if (!isAuthenticated || !phone) return [];

      const { data, error } = await supabase
        .from('registrations')
        .select(`
          *,
          scratch_cards!inner(
            *,
            prizes(*)
          ),
          redemptions(*)
        `)
        .eq('customer_phone', phone)
        .order('registered_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isAuthenticated && !!phone,
  });

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      toast.error('Digite um telefone válido');
      return;
    }

    setIsSendingCode(true);

    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Check if customer exists
      const { data: existing } = await supabase
        .from('customer_loyalty')
        .select('*')
        .eq('customer_phone', phone)
        .maybeSingle();

      if (!existing) {
        toast.error('Telefone não encontrado. Você precisa ganhar um prêmio primeiro!');
        setIsSendingCode(false);
        return;
      }

      // Update auth code
      const { error } = await supabase
        .from('customer_loyalty')
        .update({
          auth_code: code,
          auth_code_expires_at: expiresAt.toISOString(),
        })
        .eq('customer_phone', phone);

      if (error) throw error;

      // Send code via WhatsApp (using existing edge function)
      const { error: whatsappError } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          customerName: existing.customer_name,
          customerPhone: phone,
          prizeName: `Código de acesso: ${code}`,
          serialCode: 'Use este código para acessar seus pontos',
        },
      });

      if (whatsappError) {
        console.error('WhatsApp error:', whatsappError);
      }

      toast.success('Código enviado via WhatsApp! Válido por 15 minutos.');
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast.error('Erro ao enviar código');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!authCode || authCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customer_loyalty')
        .select('*')
        .eq('customer_phone', phone)
        .eq('auth_code', authCode)
        .gt('auth_code_expires_at', new Date().toISOString())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Código inválido ou expirado');
        return;
      }

      // Update last login
      await supabase
        .from('customer_loyalty')
        .update({ last_login_at: new Date().toISOString() })
        .eq('customer_phone', phone);

      setIsAuthenticated(true);
      toast.success('Bem-vindo(a)! 🎉');
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast.error('Erro ao verificar código');
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-slate-400 to-slate-600';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500';
      default: return 'bg-gradient-to-r from-orange-400 to-orange-600';
    }
  };

  const getTierName = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'Platina';
      case 'gold': return 'Ouro';
      case 'silver': return 'Prata';
      default: return 'Bronze';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Meus Pontos</CardTitle>
            <CardDescription>
              Acesse seu saldo de pontos e histórico de prêmios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu Telefone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                  maxLength={15}
                />
              </div>
              <Button
                onClick={handleSendCode}
                disabled={isSendingCode || !phone}
                className="w-full"
              >
                {isSendingCode ? 'Enviando...' : 'Enviar Código'}
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">Código de Verificação</label>
              <Input
                placeholder="000000"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
              <Button
                onClick={handleVerifyCode}
                disabled={!authCode || authCode.length !== 6}
                className="w-full"
                variant="secondary"
              >
                Verificar Código
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="link"
                onClick={() => navigate('/')}
                className="text-sm"
              >
                Voltar para início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-6">
          <h1 className="text-3xl font-bold">Olá, {loyaltyData?.customer_name}! 👋</h1>
          <p className="text-muted-foreground">Confira seus pontos e prêmios</p>
        </div>

        {/* Tier Badge */}
        <div className="flex justify-center">
          <div className={`${getTierColor(loyaltyData?.tier || 'bronze')} text-white px-8 py-3 rounded-full shadow-lg flex items-center gap-2`}>
            <Star className="h-5 w-5" />
            <span className="font-bold text-lg">{getTierName(loyaltyData?.tier || 'bronze')}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pontos</CardTitle>
              <Award className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{loyaltyData?.points || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Acumulados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prêmios</CardTitle>
              <Gift className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loyaltyData?.total_prizes_won || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Ganhos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Nível</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {loyaltyData?.tier === 'platinum' ? '🎉' : 
                 loyaltyData?.tier === 'gold' ? (1000 - (loyaltyData?.points || 0)) :
                 loyaltyData?.tier === 'silver' ? (500 - (loyaltyData?.points || 0)) :
                 (200 - (loyaltyData?.points || 0))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {loyaltyData?.tier === 'platinum' ? 'Nível máximo!' : 'Pontos faltando'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Redemptions History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Prêmios</CardTitle>
            <CardDescription>
              Todos os prêmios que você ganhou
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!redemptions || redemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum prêmio ainda</p>
              </div>
            ) : (
              <div className="space-y-4">
                {redemptions.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <div className="font-medium">
                        {registration.scratch_cards.prizes?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(registration.registered_at).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Código: {registration.scratch_cards.serial_code}
                      </div>
                    </div>
                    <Badge variant={registration.redemptions?.length > 0 ? 'default' : 'secondary'}>
                      {registration.redemptions?.length > 0 ? '✓ Retirado' : 'Pendente'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logout */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              setIsAuthenticated(false);
              setAuthCode('');
              setPhone('');
              toast.success('Sessão encerrada');
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
