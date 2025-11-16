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
import { Loader2, Package, CheckCircle, LogOut, BarChart3, MessageCircle, Check, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDebounce } from "@/hooks/useDebounce";

export default function CompanyDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { role, companyId, loading: roleLoading } = useUserRole(user?.id);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [attendantName, setAttendantName] = useState("");
  const [notes, setNotes] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [scratchCard, setScratchCard] = useState<any>(null);
  const [redemptionSuccess, setRedemptionSuccess] = useState(false);
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  
  // Reset whatsapp status after success
  useEffect(() => {
    if (whatsappStatus === 'success') {
      const timer = setTimeout(() => {
        setWhatsappStatus('idle');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [whatsappStatus]);

  // Pre-fill attendant name with user's name and load recent searches
  useEffect(() => {
    const loadUserName = async () => {
      if (user) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser?.user_metadata?.full_name) {
          setAttendantName(authUser.user_metadata.full_name);
        }
      }
    };
    loadUserName();

    // Load recent searches from localStorage
    if (companyId) {
      const saved = localStorage.getItem(`recentSearches_${companyId}`);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    }
  }, [user]);

  const saveRecentSearch = (query: string) => {
    if (!companyId) return;
    
    try {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
      setRecentSearches(updated);
      localStorage.setItem(`recentSearches_${companyId}`, JSON.stringify(updated));
    } catch (error) {
      // Handle QuotaExceededError silently
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('LocalStorage quota exceeded, clearing old searches');
        localStorage.removeItem(`recentSearches_${companyId}`);
      }
    }
  };

  // Buscar estatísticas com cache
  const { data: stats } = useQuery({
    queryKey: ['company-stats', companyId, role],
    staleTime: 60000, // 1 minuto
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Se tiver companyId, buscar IDs das scratch_cards da empresa
      let cardIds: string[] = [];
      
      if (companyId) {
        const { data: scratchCardIds } = await supabase
          .from('scratch_cards')
          .select('id')
          .eq('company_id', companyId);
        cardIds = scratchCardIds?.map(sc => sc.id) || [];
      }

      // Construir queries com ou sem filtro de empresa
      let todayQuery = supabase
        .from('redemptions')
        .select('id', { count: 'exact' })
        .gte('redeemed_at', today.toISOString());
      
      let monthQuery = supabase
        .from('redemptions')
        .select('id', { count: 'exact' })
        .gte('redeemed_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString());

      // Se tiver companyId, filtrar por cards da empresa
      if (companyId && cardIds.length > 0) {
        todayQuery = todayQuery.in('scratch_card_id', cardIds);
        monthQuery = monthQuery.in('scratch_card_id', cardIds);
      }

      const [todayResult, monthResult] = await Promise.all([
        todayQuery,
        monthQuery,
      ]);

      return {
        today: todayResult.count || 0,
        month: monthResult.count || 0,
      };
    },
    enabled: !!user,
  });

  // Buscar últimas entregas com cache
  const { data: recentRedemptions } = useQuery({
    queryKey: ['recent-redemptions', companyId, role],
    staleTime: 30000, // 30 segundos
    refetchOnWindowFocus: false,
    queryFn: async () => {
      let query = supabase
        .from('redemptions')
        .select(`
          *,
          scratch_cards!inner(
            serial_code,
            prizes(name),
            registrations(customer_name, customer_phone),
            companies(name)
          )
        `);

      // Se tiver companyId, filtrar por empresa
      if (companyId) {
        query = query.eq('scratch_cards.company_id', companyId);
      }

      const { data, error } = await query
        .order('redeemed_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const handleSearch = async (e?: React.FormEvent, query?: string) => {
    if (e) e.preventDefault();
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Digite código, telefone ou nome do cliente",
        variant: "destructive",
      });
      return;
    }

    setSearchLoading(true);
    setScratchCard(null);
    setRedemptionSuccess(false);
    setShowAutocomplete(false);
    saveRecentSearch(searchTerm);

    try {
      const queryText = searchTerm.trim();
      
      // Buscar em uma única query otimizada usando índices GIN
      let query = supabase
        .from('registrations')
        .select(`
          id,
          customer_name,
          customer_phone,
          customer_email,
          registered_at,
          scratch_cards!inner(
            id,
            serial_code,
            status,
            company_id,
            prizes(name, description, prize_value),
            companies(name, contact_phone)
          )
        `);
      
      // Se não for admin ou se tiver companyId, filtrar por empresa
      if (companyId) {
        query = query.eq('scratch_cards.company_id', companyId);
      }
      
      const { data: registrations, error } = await query
        .or(`customer_phone.ilike.*${queryText}*,customer_name.ilike.*${queryText}*,scratch_cards.serial_code.ilike.*${queryText}*`);

      if (error) throw error;

      if (!registrations || registrations.length === 0) {
        toast({
          title: "Não encontrado",
          description: "Nenhum cadastro encontrado com este código, telefone ou nome",
          variant: "destructive",
        });
        return;
      }

      // Filtrar apenas os que ainda não foram entregues (status 'registered')
      const availableRegistrations = registrations.filter(
        reg => reg.scratch_cards.status === 'registered'
      );

      if (availableRegistrations.length === 0) {
        // Encontrou mas todos já foram entregues
        toast({
          title: "Já entregue",
          description: `Encontrado ${registrations.length} resultado(s), mas todos já foram entregues`,
          variant: "destructive",
        });
        return;
      }

      // Pegar o primeiro resultado disponível
      const reg = availableRegistrations[0];
      const data = {
        ...reg.scratch_cards,
        registrations: [reg]
      };

      if (availableRegistrations.length > 1) {
        toast({
          title: "Múltiplos resultados",
          description: `Encontrados ${availableRegistrations.length} resultados. Mostrando o primeiro.`,
        });
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
    setWhatsappStatus('idle');

    try {
      const { error: redemptionError } = await supabase
        .from('redemptions')
        .insert({
          scratch_card_id: scratchCard.id,
          attendant_name: attendantName.trim() || 'Atendente',
          notes: notes.trim() || null,
        });

      if (redemptionError) throw redemptionError;

      const { error: updateError } = await supabase
        .from('scratch_cards')
        .update({ status: 'redeemed' })
        .eq('id', scratchCard.id);

      if (updateError) throw updateError;

      // Toast de sucesso da entrega
      toast({
        title: "✅ Entrega confirmada!",
        description: "Prêmio entregue com sucesso.",
      });

      // Send WhatsApp notification (non-blocking with visual feedback)
      setWhatsappSending(true);
      setWhatsappStatus('sending');

      try {
        console.log('📱 Enviando notificação WhatsApp para o cliente...');
        const { data: whatsappData, error: whatsappError } = await supabase.functions.invoke(
          'send-whatsapp-notification',
          {
            body: {
              customerName: scratchCard.registrations[0].customer_name,
              customerPhone: scratchCard.registrations[0].customer_phone,
              prizeName: scratchCard.prizes.name,
              serialCode: scratchCard.serial_code,
            }
          }
        );

        if (whatsappError) {
          console.error('❌ Erro ao enviar WhatsApp:', whatsappError);
          setWhatsappStatus('error');
          toast({
            title: "❌ Falha no WhatsApp",
            description: "Não foi possível enviar a notificação ao cliente.",
            variant: "destructive",
          });
        } else if (whatsappData?.success) {
          console.log('✅ WhatsApp enviado com sucesso!');
          setWhatsappStatus('success');
          toast({
            title: "✅ WhatsApp enviado!",
            description: `Cliente ${scratchCard.registrations[0].customer_name} notificado com sucesso.`,
          });
        } else {
          console.warn('⚠️ WhatsApp retornou sem sucesso:', whatsappData);
          setWhatsappStatus('error');
          toast({
            title: "⚠️ Falha no WhatsApp",
            description: "Resposta inesperada ao enviar notificação.",
            variant: "destructive",
          });
        }
      } catch (whatsappError) {
        console.error('❌ Falha crítica ao enviar WhatsApp:', whatsappError);
        setWhatsappStatus('error');
        toast({
          title: "❌ Erro no WhatsApp",
          description: "Não foi possível enviar a notificação.",
          variant: "destructive",
        });
      } finally {
        setWhatsappSending(false);
      }

      setRedemptionSuccess(true);
      
      // Limpar formulário após 5 segundos (mais tempo para ver mensagem)
      setTimeout(() => {
        setSearchQuery("");
        setNotes("");
        setDocumentType("");
        setDocumentNumber("");
        setScratchCard(null);
        setWhatsappStatus('idle');
        setRedemptionSuccess(false);
      }, 5000);
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Controle de acesso: permitir admin e company_partner
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      // 1. Não autenticado -> Login
      if (!user) {
        navigate('/auth');
        return;
      }
      
      // 2. Sem role ou role incorreto -> Redirecionar
      if (!role || (role !== 'company_partner' && role !== 'admin')) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }
      
      // 3. Company partner sem companyId -> Erro (admin pode não ter companyId)
      if (role === 'company_partner' && !companyId) {
        toast({
          title: "Erro de configuração",
          description: "Empresa não configurada. Entre em contato com o administrador.",
          variant: "destructive"
        });
        navigate('/dashboard');
        return;
      }
    }
  }, [user, role, companyId, authLoading, roleLoading, navigate, toast]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user || (role !== 'company_partner' && role !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Validações</h1>
              {role === 'admin' && !companyId && (
                <p className="text-xs text-muted-foreground">Modo Administrador - Todas as empresas</p>
              )}
            </div>
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
                <Label htmlFor="search">Buscar por código, telefone ou nome</Label>
                <div className="relative">
                  <Popover open={showAutocomplete} onOpenChange={setShowAutocomplete}>
                    <PopoverTrigger asChild>
                      <div>
                        <Input
                          id="search"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value.toUpperCase());
                            setShowAutocomplete(e.target.value.length > 0 && recentSearches.length > 0);
                          }}
                          onFocus={() => {
                            if (searchQuery.length > 0 && recentSearches.length > 0) {
                              setShowAutocomplete(true);
                            }
                          }}
                          placeholder="Digite código, telefone ou nome do cliente"
                          className="text-lg h-12"
                          autoComplete="off"
                        />
                      </div>
                    </PopoverTrigger>
                    {recentSearches.length > 0 && (
                      <PopoverContent className="w-[calc(100vw-2rem)] max-w-[500px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar em pesquisas recentes..." />
                          <CommandList>
                            <CommandEmpty>Nenhuma pesquisa recente.</CommandEmpty>
                            <CommandGroup heading="Pesquisas Recentes">
                              {recentSearches.map((search, index) => (
                                <CommandItem
                                  key={index}
                                  onSelect={() => {
                                    setSearchQuery(search);
                                    handleSearch(undefined, search);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {search}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    )}
                  </Popover>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ex: RSP-0001, (11) 98765-4321, ou João Silva
                </p>
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
                {role === 'admin' && !companyId && scratchCard.scratch_cards?.companies?.name && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Empresa</p>
                    <p className="font-semibold text-primary">{scratchCard.scratch_cards.companies.name}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label htmlFor="attendant">Atendente (opcional)</Label>
                  <Input
                    id="attendant"
                    value={attendantName}
                    onChange={(e) => setAttendantName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <select
                      id="documentType"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Selecione</option>
                      <option value="cpf">CPF</option>
                      <option value="rg">RG</option>
                      <option value="cnh">CNH</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="documentNumber">Número do Documento</Label>
                    <Input
                      id="documentNumber"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder="Digite o número"
                      className="h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
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
                  className="w-full h-16 text-xl font-bold bg-gradient-primary hover:opacity-90"
                  disabled={whatsappSending}
                >
                  {whatsappSending ? (
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-6 h-6 mr-2" />
                  )}
                  ✅ ENTREGAR AGORA
                </Button>
              </div>

              {/* Status do WhatsApp */}
              {whatsappStatus !== 'idle' && (
                <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 ${
                  whatsappStatus === 'sending' ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' :
                  whatsappStatus === 'success' ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' :
                  'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'
                }`}>
                  {whatsappStatus === 'sending' && (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900 dark:text-blue-100">Enviando WhatsApp...</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Aguarde, notificando cliente</p>
                      </div>
                    </>
                  )}
                  {whatsappStatus === 'success' && (
                    <>
                      <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1">
                        <p className="font-medium text-green-900 dark:text-green-100">WhatsApp enviado!</p>
                        <p className="text-sm text-green-700 dark:text-green-300">Cliente notificado com sucesso</p>
                      </div>
                    </>
                  )}
                  {whatsappStatus === 'error' && (
                    <>
                      <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900 dark:text-red-100">Falha no WhatsApp</p>
                        <p className="text-sm text-red-700 dark:text-red-300">Não foi possível enviar notificação</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card de sucesso após entrega */}
        {redemptionSuccess && (
          <Card className="border-green-500 bg-green-50 dark:bg-green-950">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100">Entrega Confirmada!</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  O prêmio foi registrado com sucesso
                </p>
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
                          {role === 'admin' && !companyId && redemption.scratch_cards?.companies?.name && (
                            <p className="text-xs text-primary mt-1 font-medium">
                              Empresa: {redemption.scratch_cards.companies.name}
                            </p>
                          )}
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
