-- Tabela de conquistas/badges
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  requirement_type text NOT NULL, -- 'points', 'prizes', 'streak', 'special'
  requirement_value integer NOT NULL DEFAULT 0,
  badge_color text NOT NULL DEFAULT '#FFD700',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de conquistas dos clientes
CREATE TABLE public.customer_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone text NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(customer_phone, achievement_id)
);

-- Tabela de mensagens do chatbot WhatsApp
CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_phone text NOT NULL,
  message_text text NOT NULL,
  message_type text NOT NULL, -- 'received', 'sent'
  processed boolean NOT NULL DEFAULT false,
  bot_response text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de comprovantes digitais
CREATE TABLE public.digital_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registration_id uuid NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  receipt_url text NOT NULL,
  qr_code_data text NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies para achievements
CREATE POLICY "Anyone can view achievements"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage achievements"
  ON public.achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para customer_achievements
CREATE POLICY "Customers can view own achievements"
  ON public.customer_achievements FOR SELECT
  USING (true);

CREATE POLICY "System can insert achievements"
  ON public.customer_achievements FOR INSERT
  WITH CHECK (true);

-- RLS Policies para whatsapp_messages
CREATE POLICY "System can manage whatsapp messages"
  ON public.whatsapp_messages FOR ALL
  USING (true);

-- RLS Policies para digital_receipts
CREATE POLICY "Anyone can view receipts"
  ON public.digital_receipts FOR SELECT
  USING (true);

CREATE POLICY "System can insert receipts"
  ON public.digital_receipts FOR INSERT
  WITH CHECK (true);

-- Insert conquistas padrão
INSERT INTO public.achievements (name, description, icon, requirement_type, requirement_value, badge_color) VALUES
('Primeiro Prêmio', 'Ganhou seu primeiro prêmio!', '🎉', 'prizes', 1, '#4CAF50'),
('Colecionador', 'Ganhou 5 prêmios', '🏆', 'prizes', 5, '#FF9800'),
('Sortudo da Sorte', 'Ganhou 10 prêmios', '💎', 'prizes', 10, '#9C27B0'),
('100 Pontos', 'Acumulou 100 pontos', '⭐', 'points', 100, '#2196F3'),
('500 Pontos', 'Acumulou 500 pontos', '🌟', 'points', 500, '#FFC107'),
('1000 Pontos', 'Acumulou 1000 pontos', '✨', 'points', 1000, '#E91E63'),
('Tier Bronze', 'Alcançou tier Bronze', '🥉', 'special', 0, '#CD7F32'),
('Tier Silver', 'Alcançou tier Silver', '🥈', 'special', 0, '#C0C0C0'),
('Tier Gold', 'Alcançou tier Gold', '🥇', 'special', 0, '#FFD700'),
('Tier Platinum', 'Alcançou tier Platinum', '💠', 'special', 0, '#E5E4E2');