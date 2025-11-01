-- Adicionar colunas para autenticação do cliente no customer_loyalty
ALTER TABLE public.customer_loyalty 
ADD COLUMN IF NOT EXISTS auth_code TEXT,
ADD COLUMN IF NOT EXISTS auth_code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Índice para busca rápida por código de autenticação
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_auth_code ON public.customer_loyalty(auth_code) WHERE auth_code IS NOT NULL;

-- RLS para clientes visualizarem seus próprios dados
CREATE POLICY "Customers can view own loyalty data"
ON public.customer_loyalty
FOR SELECT
USING (
  auth_code IS NOT NULL 
  AND auth_code = current_setting('request.headers', true)::json->>'x-auth-code'
);

-- Tabela para tracking de notificações
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  prize_name TEXT,
  serial_code TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('d0_immediate', 'd3_reminder', 'd7_reminder', 'd25_expiry_warning')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  registration_id UUID REFERENCES public.registrations(id)
);

-- Índices para melhor performance
CREATE INDEX idx_notification_queue_scheduled ON public.notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_notification_queue_phone ON public.notification_queue(customer_phone);
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status);

-- RLS para notification_queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notifications"
ON public.notification_queue
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "System can insert notifications"
ON public.notification_queue
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update notifications"
ON public.notification_queue
FOR UPDATE
USING (true);