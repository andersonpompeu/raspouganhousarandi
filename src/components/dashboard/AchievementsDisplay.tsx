import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  badge_color: string;
}

interface CustomerAchievement {
  id: string;
  unlocked_at: string;
  achievements: Achievement;
}

interface AchievementsDisplayProps {
  customerPhone: string;
}

export function AchievementsDisplay({ customerPhone }: AchievementsDisplayProps) {
  // Buscar todas as conquistas
  const { data: allAchievements } = useQuery({
    queryKey: ['all-achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('requirement_value', { ascending: true });

      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Buscar conquistas desbloqueadas
  const { data: unlockedAchievements } = useQuery({
    queryKey: ['customer-achievements', customerPhone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_achievements')
        .select(`
          *,
          achievements(*)
        `)
        .eq('customer_phone', customerPhone)
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      return data as CustomerAchievement[];
    },
    enabled: !!customerPhone,
  });

  const unlockedIds = new Set(unlockedAchievements?.map(a => a.achievements.id) || []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <CardTitle>Conquistas</CardTitle>
        </div>
        <CardDescription>
          Desbloqueie badges participando do programa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allAchievements?.map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id);
            const unlockDate = unlockedAchievements?.find(
              a => a.achievements.id === achievement.id
            )?.unlocked_at;

            return (
              <div
                key={achievement.id}
                className={`
                  relative p-4 rounded-lg border-2 transition-all
                  ${isUnlocked 
                    ? 'border-primary bg-primary/5 hover:bg-primary/10' 
                    : 'border-muted bg-muted/20 opacity-60'
                  }
                `}
              >
                {!isUnlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <div 
                    className="text-4xl mb-2"
                    style={{ 
                      filter: isUnlocked ? 'none' : 'grayscale(100%)',
                    }}
                  >
                    {achievement.icon}
                  </div>
                  
                  <div className="font-semibold text-sm">
                    {achievement.name}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {achievement.description}
                  </div>

                  {isUnlocked && unlockDate && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs mt-2"
                      style={{ backgroundColor: achievement.badge_color + '20' }}
                    >
                      {new Date(unlockDate).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}

                  {!isUnlocked && achievement.requirement_type !== 'special' && (
                    <div className="text-xs text-muted-foreground mt-2">
                      {achievement.requirement_type === 'points' 
                        ? `${achievement.requirement_value} pontos` 
                        : `${achievement.requirement_value} prêmios`
                      }
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {unlockedAchievements && unlockedAchievements.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              🎉 Você desbloqueou <strong>{unlockedAchievements.length}</strong> de <strong>{allAchievements?.length || 0}</strong> conquistas!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}