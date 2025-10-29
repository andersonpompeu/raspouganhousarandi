import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppNotificationRequest {
  customerName: string;
  customerPhone: string;
  prizeName: string;
  serialCode: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando envio de notificação WhatsApp');

    // Get environment variables
    const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
    const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error('❌ Variáveis de ambiente não configuradas');
      throw new Error('Evolution API credentials not configured');
    }

    // Parse request body
    const { customerName, customerPhone, prizeName, serialCode }: WhatsAppNotificationRequest = await req.json();

    console.log('📋 Dados recebidos:', { customerName, customerPhone, prizeName, serialCode });

    // Validate required fields
    if (!customerName || !customerPhone || !prizeName || !serialCode) {
      console.error('❌ Campos obrigatórios faltando');
      throw new Error('Missing required fields');
    }

    // Format phone number: remove all non-numeric characters
    let formattedPhone = customerPhone.replace(/\D/g, '');
    
    // Add Brazil country code (55) if not present
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone;
    }

    console.log('📱 Número formatado:', formattedPhone);

    // Build WhatsApp message
    const message = `🎉 Parabéns, ${customerName}!

Seu prêmio foi validado com sucesso! ✅

📦 Prêmio: ${prizeName}
🎫 Código: ${serialCode}

Você já pode retirar seu prêmio na loja!

Obrigado por participar! 🎁`;

    console.log('💬 Mensagem construída:', message);

    // Prepare request body for Evolution API
    // Evolution API expects: { number: "5511999999999", text: "message" }
    const evolutionBody = {
      number: formattedPhone,
      text: message,
      options: {
        delay: 1200,
        presence: "composing"
      }
    };

    console.log('🔄 Enviando para Evolution API:', EVOLUTION_API_URL);

    // Call Evolution API
    const evolutionResponse = await fetch(EVOLUTION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify(evolutionBody),
    });

    const responseText = await evolutionResponse.text();
    console.log('📥 Resposta da Evolution API (status):', evolutionResponse.status);
    console.log('📥 Resposta da Evolution API (body):', responseText);

    if (!evolutionResponse.ok) {
      console.error('❌ Erro na Evolution API:', evolutionResponse.status, responseText);
      
      // Log specific error types
      if (evolutionResponse.status === 401 || evolutionResponse.status === 403) {
        console.error('🔐 Erro de autenticação - verificar EVOLUTION_API_KEY');
      } else if (evolutionResponse.status === 404) {
        console.error('📡 Instância não encontrada - verificar EVOLUTION_INSTANCE_NAME');
      } else if (evolutionResponse.status === 400) {
        console.error('📞 Número de telefone inválido:', formattedPhone);
      }

      throw new Error(`Evolution API error: ${evolutionResponse.status} - ${responseText}`);
    }

    console.log('✅ Mensagem WhatsApp enviada com sucesso!');
    console.log(`📊 Status da Evolution API: ${evolutionResponse.status}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'WhatsApp enviado com sucesso',
        status: evolutionResponse.status,
        phone: formattedPhone
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('💥 Erro crítico ao enviar notificação WhatsApp:', error);
    console.error('📋 Detalhes do erro:', JSON.stringify(error, null, 2));
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Failed to send WhatsApp notification',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
