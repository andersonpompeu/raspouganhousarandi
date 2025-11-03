import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

// Função para formatar número de telefone
function formatPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove prefixo 55 se já existe
  if (cleaned.startsWith('55')) {
    cleaned = cleaned.substring(2);
  }
  
  // Validar tamanho (deve ter 10 ou 11 dígitos)
  if (cleaned.length < 10 || cleaned.length > 11) {
    throw new Error(`Número inválido: ${phone} (deve ter 10 ou 11 dígitos após remover 55)`);
  }
  
  // Adicionar código do país
  const formatted = '55' + cleaned;
  
  console.log(`📱 Telefone formatado: ${phone} → ${formatted}`);
  return formatted;
}

// Função para enviar com retry automático com exponential backoff + jitter
async function sendWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries}`);
      
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      // Não fazer retry em erros 4xx (exceto 429 rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response; // Retornar erro sem retry
      }
      
      // Aguardar antes de tentar novamente (exponential backoff com jitter)
      if (attempt < maxRetries) {
        const baseDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        const jitter = Math.random() * 1000; // 0-1s de variação
        const delay = baseDelay + jitter;
        console.log(`⏳ Aguardando ${Math.round(delay)}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error);
      if (attempt === maxRetries) throw error;
      
      // Aguardar antes de tentar novamente (exponential backoff com jitter)
      if (attempt < maxRetries) {
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        console.log(`⏳ Aguardando ${Math.round(delay)}ms antes de tentar novamente...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error('Máximo de tentativas excedido');
}

// Função para logging estruturado
async function logWhatsAppAttempt(data: {
  phone: string;
  name: string;
  prizeName?: string;
  serialCode?: string;
  status: 'success' | 'failed';
  attemptNumber: number;
  errorMessage?: string;
  responseStatus?: number;
  responseBody?: any;
}) {
  try {
    const { error } = await supabase.from('whatsapp_logs').insert({
      customer_phone: data.phone,
      customer_name: data.name,
      prize_name: data.prizeName || null,
      serial_code: data.serialCode || null,
      status: data.status,
      attempts: data.attemptNumber,
      error_message: data.errorMessage || null,
      response_status: data.responseStatus || null,
      response_body: data.responseBody || null,
    });

    if (error) {
      console.error('❌ Erro ao salvar log:', error);
    } else {
      console.log(`✅ Log salvo: ${data.status} (tentativa ${data.attemptNumber})`);
    }
  } catch (error) {
    console.error('💥 Erro crítico ao salvar log:', error);
  }
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
    const EVOLUTION_INSTANCE_NAME = Deno.env.get('EVOLUTION_INSTANCE_NAME');

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.error('❌ Variáveis de ambiente não configuradas');
      console.error('EVOLUTION_API_URL:', EVOLUTION_API_URL ? '✅' : '❌');
      console.error('EVOLUTION_API_KEY:', EVOLUTION_API_KEY ? '✅' : '❌');
      console.error('EVOLUTION_INSTANCE_NAME:', EVOLUTION_INSTANCE_NAME ? '✅' : '❌');
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

    // Format phone number using validation function
    const formattedPhone = formatPhoneNumber(customerPhone);

    // Build WhatsApp message
    const message = `🎉 Parabéns, ${customerName}!

Seu prêmio foi validado com sucesso! ✅

📦 Prêmio: ${prizeName}
🎫 Código: ${serialCode}

Você já pode retirar seu prêmio na loja!

Obrigado por participar! 🎁`;

    console.log('💬 Mensagem construída:', message);

    // Prepare request body for Evolution API
    const evolutionBody = {
      number: formattedPhone,
      text: message,
      options: {
        delay: 1200,
        presence: "composing"
      }
    };

    // Construir URL de forma inteligente para evitar duplicação
    let cleanUrl = EVOLUTION_API_URL.replace(/\/+$/, ''); // Remove barras finais
    cleanUrl = cleanUrl.replace(/\/message\/sendText.*$/, ''); // Remove path antigo se existir
    
    // Construir URL completa
    const fullUrl = `${cleanUrl}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    
    console.log('🔄 Enviando para Evolution API');
    console.log('🔍 URL construída:', {
      original: EVOLUTION_API_URL,
      cleaned: cleanUrl,
      final: fullUrl
    });
    console.log('🔑 API Key (primeiros 10 chars):', EVOLUTION_API_KEY.substring(0, 10) + '...');
    console.log('📦 Payload:', JSON.stringify(evolutionBody, null, 2));

    // Call Evolution API with retry logic
    const evolutionResponse = await sendWithRetry(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify(evolutionBody),
    });

    const responseText = await evolutionResponse.text();
    console.log('📥 Status:', evolutionResponse.status);
    console.log('📥 Headers:', JSON.stringify(Object.fromEntries(evolutionResponse.headers)));
    console.log('📥 Body completo:', responseText);

    let responseBody: any = null;
    try {
      responseBody = JSON.parse(responseText);
    } catch (e) {
      console.warn('⚠️ Resposta não é JSON válido');
    }

    if (!evolutionResponse.ok) {
      console.error('❌ Erro na Evolution API:', evolutionResponse.status, responseText);
      
      // Log specific error types with more details
      if (evolutionResponse.status === 401 || evolutionResponse.status === 403) {
        console.error('🔐 Erro de autenticação - verificar EVOLUTION_API_KEY');
      } else if (evolutionResponse.status === 404) {
        console.error('📡 Instância não encontrada - verificar EVOLUTION_INSTANCE_NAME');
        console.error('🔍 Instância configurada:', EVOLUTION_INSTANCE_NAME);
      } else if (evolutionResponse.status === 400) {
        console.error('❌ ERRO 400 - Payload ou URL incorreto');
        console.error('🔍 Verificar:');
        console.error('  1. URL completo:', fullUrl);
        console.error('  2. Instância:', EVOLUTION_INSTANCE_NAME);
        console.error('  3. Formato do número:', formattedPhone);
        
        if (responseBody) {
          console.error('📋 Detalhes do erro:', JSON.stringify(responseBody, null, 2));
        }
      }

      // Log usando função estruturada
      await logWhatsAppAttempt({
        phone: formattedPhone,
        name: customerName,
        prizeName,
        serialCode,
        status: 'failed',
        attemptNumber: 1,
        errorMessage: responseText,
        responseStatus: evolutionResponse.status,
        responseBody
      });

      throw new Error(`Evolution API error: ${evolutionResponse.status} - ${responseText}`);
    }

    console.log('✅ Mensagem WhatsApp enviada com sucesso!');
    console.log(`📊 Status da Evolution API: ${evolutionResponse.status}`);

    // Log success usando função estruturada
    await logWhatsAppAttempt({
      phone: formattedPhone,
      name: customerName,
      prizeName,
      serialCode,
      status: 'success',
      attemptNumber: 1,
      responseStatus: evolutionResponse.status,
      responseBody
    });

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
    console.error('🔍 Stack trace:', error.stack);
    
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
