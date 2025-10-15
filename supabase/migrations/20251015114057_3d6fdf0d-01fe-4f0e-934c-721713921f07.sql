-- Correção Crítica: Recalcular comissões corretamente
-- A comissão deve ser sobre production_cost, não sobre prize_value
-- A comissão é paga quando a raspadinha é VENDIDA (registered/redeemed), não apenas quando resgatada

-- Deletar funções antigas
DROP FUNCTION IF EXISTS public.calculate_company_financial_metrics(UUID);
DROP FUNCTION IF EXISTS public.calculate_global_financial_metrics();

-- Função corrigida para métricas financeiras da empresa
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
      c.commission_percentage
    FROM scratch_cards sc
    LEFT JOIN companies c ON sc.company_id = c.id
    WHERE sc.company_id = company_uuid
  ),
  metrics AS (
    SELECT
      COUNT(*) as total_cards,
      COUNT(*) FILTER (WHERE status IN ('registered', 'redeemed')) as sold_cards,
      COUNT(*) FILTER (WHERE status = 'redeemed') as redeemed_cards,
      -- Receita: preço de venda das raspadinhas vendidas
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN sale_price ELSE 0 END), 0) as total_revenue,
      -- Custo de produção: todas as raspadinhas geradas
      COALESCE(SUM(production_cost), 0) as total_production_costs,
      -- Comissão: percentual sobre custo de produção das raspadinhas VENDIDAS
      COALESCE(SUM(CASE 
        WHEN status IN ('registered', 'redeemed')
        THEN (production_cost * commission_percentage / 100) 
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

-- Função corrigida para métricas financeiras globais (visão das empresas)
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
      c.commission_percentage
    FROM scratch_cards sc
    LEFT JOIN companies c ON sc.company_id = c.id
  ),
  metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('registered', 'redeemed')) as sold_cards,
      COUNT(*) FILTER (WHERE status = 'redeemed') as redeemed_cards,
      -- Receita: vendas de raspadinhas
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN sale_price ELSE 0 END), 0) as revenue,
      -- Custo de produção de todas as raspadinhas
      COALESCE(SUM(production_cost), 0) as production_costs,
      -- Comissão paga à plataforma (sobre raspadinhas vendidas)
      COALESCE(SUM(CASE 
        WHEN status IN ('registered', 'redeemed')
        THEN (production_cost * commission_percentage / 100) 
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

-- Nova função: Métricas financeiras da plataforma
CREATE OR REPLACE FUNCTION public.calculate_platform_financial_metrics()
RETURNS TABLE(
  commission_revenue DECIMAL,
  operational_costs DECIMAL,
  net_profit DECIMAL,
  profit_margin DECIMAL,
  total_cards_sold INTEGER,
  average_commission_rate DECIMAL
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH platform_data AS (
    SELECT 
      sc.production_cost,
      sc.status,
      c.commission_percentage
    FROM scratch_cards sc
    LEFT JOIN companies c ON sc.company_id = c.id
  ),
  metrics AS (
    SELECT
      COUNT(*) FILTER (WHERE status IN ('registered', 'redeemed')) as sold_cards,
      -- Receita da plataforma: comissões recebidas
      COALESCE(SUM(CASE 
        WHEN status IN ('registered', 'redeemed')
        THEN (production_cost * commission_percentage / 100) 
        ELSE 0 
      END), 0) as total_commission_revenue,
      -- Custo operacional (por enquanto zero)
      0 as operational_costs,
      -- Taxa média de comissão
      CASE 
        WHEN COUNT(*) FILTER (WHERE status IN ('registered', 'redeemed')) > 0
        THEN AVG(CASE WHEN status IN ('registered', 'redeemed') THEN commission_percentage ELSE NULL END)
        ELSE 0
      END as avg_commission
    FROM platform_data
  )
  SELECT
    m.total_commission_revenue::DECIMAL as commission_revenue,
    m.operational_costs::DECIMAL as operational_costs,
    (m.total_commission_revenue - m.operational_costs)::DECIMAL as net_profit,
    CASE 
      WHEN m.total_commission_revenue > 0 
      THEN ((m.total_commission_revenue - m.operational_costs) / m.total_commission_revenue * 100)::DECIMAL
      ELSE 0::DECIMAL
    END as profit_margin,
    m.sold_cards::INTEGER as total_cards_sold,
    COALESCE(m.avg_commission, 0)::DECIMAL as average_commission_rate
  FROM metrics m;
END;
$$;

-- Adicionar comentários explicativos
COMMENT ON FUNCTION public.calculate_company_financial_metrics IS 'Calcula métricas financeiras da perspectiva da empresa parceira: receita de vendas menos custos de produção e comissão paga à plataforma';
COMMENT ON FUNCTION public.calculate_global_financial_metrics IS 'Calcula métricas financeiras consolidadas de todas as empresas parceiras';
COMMENT ON FUNCTION public.calculate_platform_financial_metrics IS 'Calcula métricas financeiras da perspectiva da plataforma: receita de comissões menos custos operacionais';