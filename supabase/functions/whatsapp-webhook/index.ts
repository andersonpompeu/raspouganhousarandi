import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
}

async function processCommand(phone: string, message: string): Promise<string> {
  const cleanPhone = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
  
  const lowerMessage = message.toLowerCase().trim();
  
  // Comando: PONTOS
  if (lowerMessage.includes('pontos') || lowerMessage.includes('saldo')) {
    const { data: loyalty } = await supabase
      .from('customer_loyalty')
      .select('*')
      .eq('customer_phone', formattedPhone)
      .maybeSingle();
    
    if (!loyalty) {
      return '❌ Você ainda não está no programa de fidelidade. Ganhe seu primeiro prêmio para participar!';
    }
    
    return `📊 Seu saldo de pontos:
    
⭐ Pontos: ${loyalty.points}
🏆 Tier: ${loyalty.tier.toUpperCase()}
🎁 Prêmios ganhos: ${loyalty.total_prizes_won}

Continue participando para ganhar mais pontos!`;
  }
  
  // Comando: PREMIOS
  if (lowerMessage.includes('premios') || lowerMessage.includes('prêmios') || lowerMessage.includes('historico') || lowerMessage.includes('histórico')) {
    const { data: registrations } = await supabase
      .from('registrations')
      .select(`
        *,
        scratch_cards!inner(
          serial_code,
          prizes(name, prize_value)
        ),
        redemptions(redeemed_at)
      `)
      .eq('customer_phone', formattedPhone)
      .order('registered_at', { ascending: false })
      .limit(5);
    
    if (!registrations || registrations.length === 0) {
      return '❌ Você ainda não ganhou nenhum prêmio. Participe para começar a ganhar!';
    }
    
    let response = '🎁 Seus últimos prêmios:\n\n';
    
    registrations.forEach((reg: any, index: number) => {
      const status = reg.redemptions?.length > 0 ? '✅ Retirado' : '⏳ Pendente';
      response += `${index + 1}. ${reg.scratch_cards.prizes?.name || 'Prêmio'}\n`;
      response += `   Código: ${reg.scratch_cards.serial_code}\n`;
      response += `   Status: ${status}\n\n`;
    });
    
    return response;
  }
  
  // Comando: CONQUISTAS
  if (lowerMessage.includes('conquistas') || lowerMessage.includes('badges') || lowerMessage.includes('badge')) {
    const { data: achievements } = await supabase
      .from('customer_achievements')
      .select(`
        *,
        achievements(name, description, icon)
      `)
      .eq('customer_phone', formattedPhone)
      .order('unlocked_at', { ascending: false });
    
    if (!achievements || achievements.length === 0) {
      return '🏆 Você ainda não possui conquistas. Continue participando para desbloquear badges!';
    }
    
    let response = '🏆 Suas conquistas:\n\n';
    
    achievements.forEach((ach: any) => {
      response += `${ach.achievements.icon} ${ach.achievements.name}\n`;
      response += `   ${ach.achievements.description}\n`;
      response += `   Desbloqueado: ${new Date(ach.unlocked_at).toLocaleDateString('pt-BR')}\n\n`;
    });
    
    return response;
  }
  
  // Comando: AJUDA
  if (lowerMessage.includes('ajuda') || lowerMessage.includes('help') || lowerMessage.includes('menu')) {
    return `🤖 Comandos disponíveis:

📊 *PONTOS* - Ver seu saldo de pontos
🎁 *PREMIOS* - Ver histórico de prêmios
🏆 *CONQUISTAS* - Ver suas conquistas
❓ *AJUDA* - Ver esta mensagem

Digite qualquer comando para começar!`;
  }
  
  // Resposta padrão
  return `Olá! 👋

Sou o assistente do programa de fidelidade.

Digite *AJUDA* para ver os comandos disponíveis.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: any = await req.json();
    console.log('📥 Webhook recebido:', JSON.stringify(body, null, 2));

    // Verificar se é mensagem recebida (não enviada por nós)
    if (body.event === 'messages.upsert' && body.data?.messages) {
      const messages: WebhookMessage[] = body.data.messages;
      
      for (const msg of messages) {
        // Ignorar mensagens enviadas por nós
        if (msg.key.fromMe) continue;
        
        const phone = msg.key.remoteJid;
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        
        if (!messageText) continue;
        
        console.log('💬 Processando mensagem:', { phone, messageText });
        
        // Salvar mensagem recebida
        await supabase.from('whatsapp_messages').insert({
          customer_phone: phone,
          message_text: messageText,
          message_type: 'received',
          processed: false
        });
        
        // Processar comando
        const response = await processCommand(phone, messageText);
        
        // Salvar resposta
        await supabase.from('whatsapp_messages').insert({
          customer_phone: phone,
          message_text: response,
          message_type: 'sent',
          bot_response: response,
          processed: true
        });
        
        // Enviar resposta via WhatsApp
        const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
        const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');
        const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');
        
        if (EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE_NAME) {
          const sendUrl = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
          
          await fetch(sendUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              number: phone,
              text: response,
              options: {
                delay: 1200,
                presence: "composing"
              }
            }),
          });
          
          console.log('✅ Resposta enviada');
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});