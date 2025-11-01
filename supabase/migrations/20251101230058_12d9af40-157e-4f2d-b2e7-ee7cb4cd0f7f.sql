-- Criar tabela para logs de WhatsApp
CREATE TABLE public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  prize_name TEXT,
  serial_code TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'retry')),
  error_message TEXT,
  attempts INTEGER DEFAULT 1,
  response_body JSONB,
  response_status INTEGER
);

-- Adicionar índices para melhor performance
CREATE INDEX idx_whatsapp_logs_phone ON public.whatsapp_logs(customer_phone);
CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (apenas admins podem ver logs)
CREATE POLICY "Admins can view all whatsapp logs"
ON public.whatsapp_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);