import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function checkAndUnlockAchievements(customerPhone: string) {
  console.log('🏆 Verificando conquistas para:', customerPhone);

  // Buscar dados do cliente
  const { data: loyalty } = await supabase
    .from('customer_loyalty')
    .select('*')
    .eq('customer_phone', customerPhone)
    .maybeSingle();

  if (!loyalty) {
    console.log('❌ Cliente não encontrado');
    return [];
  }

  // Buscar todas as conquistas
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*');

  if (!allAchievements) return [];

  // Buscar conquistas já desbloqueadas
  const { data: unlockedAchievements } = await supabase
    .from('customer_achievements')
    .select('achievement_id')
    .eq('customer_phone', customerPhone);

  const unlockedIds = new Set(unlockedAchievements?.map(a => a.achievement_id) || []);
  const newUnlocks = [];

  for (const achievement of allAchievements) {
    // Pular se já desbloqueada
    if (unlockedIds.has(achievement.id)) continue;

    let shouldUnlock = false;

    // Verificar requisitos
    switch (achievement.requirement_type) {
      case 'points':
        shouldUnlock = loyalty.points >= achievement.requirement_value;
        break;
      
      case 'prizes':
        shouldUnlock = loyalty.total_prizes_won >= achievement.requirement_value;
        break;
      
      case 'special':
        // Conquistas de tier
        if (achievement.name.includes('Bronze') && loyalty.tier === 'bronze') {
          shouldUnlock = true;
        } else if (achievement.name.includes('Silver') && loyalty.tier === 'silver') {
          shouldUnlock = true;
        } else if (achievement.name.includes('Gold') && loyalty.tier === 'gold') {
          shouldUnlock = true;
        } else if (achievement.name.includes('Platinum') && loyalty.tier === 'platinum') {
          shouldUnlock = true;
        }
        break;
    }

    // Desbloquear conquista
    if (shouldUnlock) {
      const { error } = await supabase
        .from('customer_achievements')
        .insert({
          customer_phone: customerPhone,
          achievement_id: achievement.id,
        });

      if (!error) {
        console.log('✅ Conquista desbloqueada:', achievement.name);
        newUnlocks.push(achievement);
      }
    }
  }

  // Enviar notificação se houver novas conquistas
  if (newUnlocks.length > 0) {
    const message = `🎉 Nova(s) conquista(s) desbloqueada(s)!\n\n${newUnlocks.map(a => `${a.icon} ${a.name}\n${a.description}`).join('\n\n')}`;
    
    await supabase.functions.invoke('send-whatsapp-notification', {
      body: {
        customerName: loyalty.customer_name,
        customerPhone: customerPhone,
        prizeName: 'Conquistas Desbloqueadas',
        serialCode: message,
      },
    });
  }

  return newUnlocks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerPhone } = await req.json();
    
    if (!customerPhone) {
      throw new Error('Customer phone is required');
    }

    const newAchievements = await checkAndUnlockAchievements(customerPhone);

    return new Response(
      JSON.stringify({ 
        success: true, 
        newAchievements,
        count: newAchievements.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Erro ao verificar conquistas:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});