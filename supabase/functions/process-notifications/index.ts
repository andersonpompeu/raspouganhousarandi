import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Iniciando processamento de notificações automáticas');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    console.log('⏰ Horário atual:', now.toISOString());

    // Buscar notificações pendentes que precisam ser enviadas
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now.toISOString())
      .lt('attempts', 3)
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('❌ Erro ao buscar notificações:', fetchError);
      throw fetchError;
    }

    console.log(`📋 Encontradas ${pendingNotifications?.length || 0} notificações para processar`);

    let successCount = 0;
    let failureCount = 0;

    for (const notification of pendingNotifications || []) {
      console.log(`📤 Processando notificação ${notification.id} (${notification.notification_type})`);

      try {
        // Atualizar tentativa
        await supabase
          .from('notification_queue')
          .update({
            attempts: notification.attempts + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        // Verificar tipo de notificação
        if (notification.notification_type === 'achievement_check') {
          // Processar verificação de conquistas
          const { error: achievementError } = await supabase.functions.invoke('check-achievements', {
            body: {
              customerPhone: notification.customer_phone,
            },
          });

          if (achievementError) {
            throw new Error(achievementError.message || 'Failed to check achievements');
          }

          // Marcar como processada
          await supabase
            .from('notification_queue')
            .update({ status: 'sent' })
            .eq('id', notification.id);

          console.log(`✅ Verificação de conquistas ${notification.id} processada com sucesso`);
          successCount++;
        } else {
          // Enviar via WhatsApp (notificação padrão)
          const { data, error: whatsappError } = await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              customerName: notification.customer_name,
              customerPhone: notification.customer_phone,
              prizeName: notification.prize_name || 'Seu prêmio',
              serialCode: notification.serial_code || '',
            },
          });

          if (whatsappError || !data?.success) {
            throw new Error(data?.error || 'Failed to send WhatsApp');
          }

          // Marcar como enviada
          await supabase
            .from('notification_queue')
            .update({ status: 'sent' })
            .eq('id', notification.id);

          console.log(`✅ Notificação ${notification.id} enviada com sucesso`);
          successCount++;
        }

      } catch (error: any) {
        console.error(`❌ Erro ao processar notificação ${notification.id}:`, error);
        
        // Se atingiu 3 tentativas, marcar como failed
        if (notification.attempts + 1 >= 3) {
          await supabase
            .from('notification_queue')
            .update({
              status: 'failed',
              error_message: error.message || error.toString(),
            })
            .eq('id', notification.id);
        }

        failureCount++;
      }

      // Aguardar 1 segundo entre envios para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Processamento concluído: ${successCount} enviadas, ${failureCount} falharam`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notificações processadas',
        processed: pendingNotifications?.length || 0,
        successCount,
        failureCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('💥 Erro crítico:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process notifications',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
