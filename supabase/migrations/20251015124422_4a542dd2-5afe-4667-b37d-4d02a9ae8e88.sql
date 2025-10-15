
-- Corrigir função de métricas financeiras globais (empresas)
-- PROBLEMA: production_costs estava somando TODAS as raspadinhas, não apenas as vendidas
-- SOLUÇÃO: Somar apenas custos de raspadinhas vendidas (status IN ('registered', 'redeemed'))

CREATE OR REPLACE FUNCTION public.calculate_global_financial_metrics()
RETURNS TABLE(
  total_revenue numeric,
  total_production_costs numeric,
  total_commission_costs numeric,
  total_costs numeric,
  net_profit numeric,
  profit_margin numeric,
  total_cards_sold integer,
  total_cards_redeemed integer,
  average_redemption_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
      -- Receita: vendas de raspadinhas vendidas
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN sale_price ELSE 0 END), 0) as revenue,
      -- CORREÇÃO: Custo de produção APENAS das raspadinhas vendidas
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN production_cost ELSE 0 END), 0) as production_costs,
      -- Comissão sobre lucro bruto das raspadinhas vendidas
      COALESCE(SUM(CASE 
        WHEN status IN ('registered', 'redeemed')
        THEN ((sale_price - production_cost) * commission_percentage / 100) 
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
$function$;

-- Corrigir função de métricas por empresa
CREATE OR REPLACE FUNCTION public.calculate_company_financial_metrics(company_uuid uuid)
RETURNS TABLE(
  revenue numeric,
  production_costs numeric,
  commission_costs numeric,
  total_costs numeric,
  net_profit numeric,
  profit_margin numeric,
  cards_sold integer,
  cards_redeemed integer,
  redemption_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
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
      -- CORREÇÃO: Custo de produção APENAS das raspadinhas vendidas
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN production_cost ELSE 0 END), 0) as total_production_costs,
      -- Comissão sobre lucro bruto das raspadinhas vendidas
      COALESCE(SUM(CASE 
        WHEN status IN ('registered', 'redeemed')
        THEN ((sale_price - production_cost) * commission_percentage / 100) 
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
$function$;
