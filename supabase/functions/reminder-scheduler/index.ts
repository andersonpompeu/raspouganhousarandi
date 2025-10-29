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
    console.log('🚀 Iniciando processamento de lembretes automáticos');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Mark expired scratch cards (30+ days without redemption)
    console.log('🗓️ Marcando raspadinhas expiradas...');
    const { data: expiredCards, error: expiredError } = await supabase
      .from('registrations')
      .select(`
        scratch_card_id,
        scratch_cards!inner(id, status, serial_code)
      `)
      .lte('registered_at', thirtyDaysAgo.toISOString())
      .is('reminded_at', null);

    if (expiredError) {
      console.error('❌ Erro ao buscar raspadinhas expiradas:', expiredError);
    } else if (expiredCards && expiredCards.length > 0) {
      const expiredCardIds = expiredCards
        .filter((r: any) => r.scratch_cards?.status === 'registered')
        .map((r: any) => r.scratch_card_id);

      if (expiredCardIds.length > 0) {
        const { error: updateError } = await supabase
          .from('scratch_cards')
          .update({ status: 'expired' })
          .in('id', expiredCardIds);

        if (updateError) {
          console.error('❌ Erro ao atualizar status de expiradas:', updateError);
        } else {
          console.log(`✅ ${expiredCardIds.length} raspadinhas marcadas como expiradas`);
        }
      }
    }

    // 2. Send 3-day reminders
    console.log('📅 Buscando registrations para lembrete de 3 dias...');
    const { data: threeDayReminders, error: threeDayError } = await supabase
      .from('registrations')
      .select(`
        id,
        customer_name,
        customer_phone,
        scratch_card_id,
        registered_at,
        scratch_cards!inner(
          serial_code,
          status,
          prizes(name)
        )
      `)
      .lte('registered_at', threeDaysAgo.toISOString())
      .gte('registered_at', sevenDaysAgo.toISOString())
      .is('reminded_at', null);

    if (threeDayError) {
      console.error('❌ Erro ao buscar lembretes de 3 dias:', threeDayError);
    } else if (threeDayReminders && threeDayReminders.length > 0) {
      console.log(`📱 Enviando ${threeDayReminders.length} lembretes de 3 dias...`);
      
      for (const reminder of threeDayReminders) {
        const scratchCard = reminder.scratch_cards as any;
        if (scratchCard?.status === 'registered') {
          try {
            await supabase.functions.invoke('send-whatsapp-notification', {
              body: {
                customerName: reminder.customer_name,
                customerPhone: reminder.customer_phone,
                prizeName: scratchCard.prizes?.name || 'Prêmio',
                serialCode: scratchCard.serial_code,
              },
            });

            await supabase
              .from('registrations')
              .update({ reminded_at: now.toISOString() })
              .eq('id', reminder.id);

            console.log(`✅ Lembrete de 3 dias enviado para ${reminder.customer_name}`);
          } catch (error) {
            console.error(`❌ Erro ao enviar lembrete para ${reminder.customer_name}:`, error);
          }
        }
      }
    }

    // 3. Send 7-day reminders
    console.log('📅 Buscando registrations para lembrete de 7 dias...');
    const { data: sevenDayReminders, error: sevenDayError } = await supabase
      .from('registrations')
      .select(`
        id,
        customer_name,
        customer_phone,
        scratch_card_id,
        registered_at,
        reminded_at,
        scratch_cards!inner(
          serial_code,
          status,
          prizes(name)
        )
      `)
      .lte('registered_at', sevenDaysAgo.toISOString())
      .not('reminded_at', 'is', null);

    if (sevenDayError) {
      console.error('❌ Erro ao buscar lembretes de 7 dias:', sevenDayError);
    } else if (sevenDayReminders && sevenDayReminders.length > 0) {
      // Filter those who were reminded 4+ days ago (3 day reminder + 4 days = 7 days)
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const needsSecondReminder = sevenDayReminders.filter((r: any) => {
        const remindedAt = new Date(r.reminded_at);
        return remindedAt <= fourDaysAgo && r.scratch_cards?.status === 'registered';
      });

      console.log(`📱 Enviando ${needsSecondReminder.length} lembretes de 7 dias...`);
      
      for (const reminder of needsSecondReminder) {
        const scratchCard = reminder.scratch_cards as any;
        try {
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              customerName: reminder.customer_name,
              customerPhone: reminder.customer_phone,
              prizeName: scratchCard.prizes?.name || 'Prêmio',
              serialCode: scratchCard.serial_code,
            },
          });

          console.log(`✅ Lembrete de 7 dias enviado para ${reminder.customer_name}`);
        } catch (error) {
          console.error(`❌ Erro ao enviar lembrete de 7 dias para ${reminder.customer_name}:`, error);
        }
      }
    }

    console.log('✅ Processamento de lembretes concluído!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lembretes processados com sucesso',
        stats: {
          expired: expiredCards?.length || 0,
          threeDayReminders: threeDayReminders?.length || 0,
          sevenDayReminders: sevenDayReminders?.length || 0,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('💥 Erro crítico no processamento de lembretes:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
