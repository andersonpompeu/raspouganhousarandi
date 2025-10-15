-- Adicionar campos financeiros à tabela prizes
ALTER TABLE public.prizes
ADD COLUMN prize_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN cost_to_company DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.prizes.prize_value IS 'Valor monetário real do prêmio que o cliente recebe';
COMMENT ON COLUMN public.prizes.cost_to_company IS 'Custo que a empresa parceira tem ao entregar o prêmio';

-- Adicionar campos financeiros à tabela scratch_cards
ALTER TABLE public.scratch_cards
ADD COLUMN sale_price DECIMAL(10,2) NOT NULL DEFAULT 5.00,
ADD COLUMN production_cost DECIMAL(10,2) NOT NULL DEFAULT 1.50;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.scratch_cards.sale_price IS 'Preço que a empresa pagou pela raspadinha';
COMMENT ON COLUMN public.scratch_cards.production_cost IS 'Custo de produção da raspadinha';

-- Criar tabela de transações financeiras
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scratch_card_id UUID REFERENCES public.scratch_cards(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'prize_redemption', 'commission', 'production_cost')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_financial_transactions_card ON public.financial_transactions(scratch_card_id);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(transaction_type);
CREATE INDEX idx_financial_transactions_created ON public.financial_transactions(created_at);

-- Trigger para updated_at
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para transações financeiras
CREATE POLICY "Admins can view all transactions"
  ON public.financial_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert transactions"
  ON public.financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Atualizar valores dos prêmios existentes com valores realistas
UPDATE public.prizes 
SET prize_value = 30.00, cost_to_company = 25.00 
WHERE name = 'Lanche R$ 30';

UPDATE public.prizes 
SET prize_value = 0.00, cost_to_company = 0.00 
WHERE name = 'Desconto 20%';

UPDATE public.prizes 
SET prize_value = 3.50, cost_to_company = 3.00 
WHERE name = 'Refrigerante Grátis';

UPDATE public.prizes 
SET prize_value = 8.00, cost_to_company = 6.50 
WHERE name = 'Sobremesa Grátis';

-- Criar função para calcular métricas financeiras
CREATE OR REPLACE FUNCTION public.calculate_company_financial_metrics(company_uuid UUID)
RETURNS TABLE(
  revenue DECIMAL,
  production_costs DECIMAL,
  commission_costs DECIMAL,
  total_costs DECIMAL,
  net_profit DECIMAL,
  profit_margin DECIMAL,
  cards_sold INTEGER,
  cards_redeemed INTEGER,
  redemption_rate DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH company_cards AS (
    SELECT 
      sc.id,
      sc.sale_price,
      sc.production_cost,
      sc.status,
      p.prize_value,
      c.commission_percentage
    FROM scratch_cards sc
    LEFT JOIN prizes p ON sc.prize_id = p.id
    LEFT JOIN companies c ON sc.company_id = c.id
    WHERE sc.company_id = company_uuid
  ),
  metrics AS (
    SELECT
      COUNT(*) as total_cards,
      COUNT(*) FILTER (WHERE status IN ('registered', 'redeemed')) as sold_cards,
      COUNT(*) FILTER (WHERE status = 'redeemed') as redeemed_cards,
      COALESCE(SUM(sale_price), 0) as total_revenue,
      COALESCE(SUM(production_cost), 0) as total_production_costs,
      COALESCE(SUM(CASE 
        WHEN status = 'redeemed' AND prize_value IS NOT NULL 
        THEN (prize_value * commission_percentage / 100) 
        ELSE 0 
      END), 0) as total_commission_costs
    FROM company_cards
  )
  SELECT
    m.total_revenue::DECIMAL as revenue,
    m.total_production_costs::DECIMAL as production_costs,
    m.total_commission_costs::DECIMAL as commission_costs,
    (m.total_production_costs + m.total_commission_costs)::DECIMAL as total_costs,
    (m.total_revenue - m.total_production_costs - m.total_commission_costs)::DECIMAL as net_profit,
    CASE 
      WHEN m.total_revenue > 0 
      THEN ((m.total_revenue - m.total_production_costs - m.total_commission_costs) / m.total_revenue * 100)::DECIMAL
      ELSE 0::DECIMAL
    END as profit_margin,
    m.sold_cards::INTEGER as cards_sold,
    m.redeemed_cards::INTEGER as cards_redeemed,
    CASE 
      WHEN m.sold_cards > 0 
      THEN (m.redeemed_cards::DECIMAL / m.sold_cards::DECIMAL * 100)
      ELSE 0::DECIMAL
    END as redemption_rate
  FROM metrics m;
END;
$$;

-- Criar função para calcular métricas globais
CREATE OR REPLACE FUNCTION public.calculate_global_financial_metrics()
RETURNS TABLE(
  total_revenue DECIMAL,
  total_production_costs DECIMAL,
  total_commission_costs DECIMAL,
  total_costs DECIMAL,
  net_profit DECIMAL,
  profit_margin DECIMAL,
  total_cards_sold INTEGER,
  total_cards_redeemed INTEGER,
  average_redemption_rate DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_cards AS (
    SELECT 
      sc.sale_price,
      sc.production_cost,
      sc.status,
      p.prize_value,
      c.commission_percentage
    FROM scratch_cards sc
    LEFT JOIN prizes p ON sc.prize_id = p.id
    LEFT JOIN companies c ON sc.company_id = c.id
  ),
  metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('registered', 'redeemed')) as sold_cards,
      COUNT(*) FILTER (WHERE status = 'redeemed') as redeemed_cards,
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN sale_price ELSE 0 END), 0) as revenue,
      COALESCE(SUM(production_cost), 0) as production_costs,
      COALESCE(SUM(CASE 
        WHEN status = 'redeemed' AND prize_value IS NOT NULL 
        THEN (prize_value * commission_percentage / 100) 
        ELSE 0 
      END), 0) as commission_costs
    FROM all_cards
  )
  SELECT
    m.revenue::DECIMAL,
    m.production_costs::DECIMAL,
    m.commission_costs::DECIMAL,
    (m.production_costs + m.commission_costs)::DECIMAL,
    (m.revenue - m.production_costs - m.commission_costs)::DECIMAL,
    CASE 
      WHEN m.revenue > 0 
      THEN ((m.revenue - m.production_costs - m.commission_costs) / m.revenue * 100)::DECIMAL
      ELSE 0::DECIMAL
    END,
    m.sold_cards::INTEGER,
    m.redeemed_cards::INTEGER,
    CASE 
      WHEN m.sold_cards > 0 
      THEN (m.redeemed_cards::DECIMAL / m.sold_cards::DECIMAL * 100)
      ELSE 0::DECIMAL
    END
  FROM metrics m;
END;
$$;