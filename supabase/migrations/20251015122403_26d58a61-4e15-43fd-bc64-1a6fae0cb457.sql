-- Corrigir função de métricas financeiras por empresa
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
SET search_path TO 'public'
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
      -- Custo de produção: todas as raspadinhas geradas
      COALESCE(SUM(production_cost), 0) as total_production_costs,
      -- Comissão: percentual sobre lucro bruto (preço de venda - custo) das raspadinhas VENDIDAS
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

-- Corrigir função de métricas financeiras globais
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
SET search_path TO 'public'
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
      -- Receita: vendas de raspadinhas
      COALESCE(SUM(CASE WHEN status IN ('registered', 'redeemed') THEN sale_price ELSE 0 END), 0) as revenue,
      -- Custo de produção de todas as raspadinhas
      COALESCE(SUM(production_cost), 0) as production_costs,
      -- Comissão paga à plataforma sobre lucro bruto (sobre raspadinhas vendidas)
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

-- Corrigir função de métricas financeiras da plataforma
CREATE OR REPLACE FUNCTION public.calculate_platform_financial_metrics()
RETURNS TABLE(
  commission_revenue numeric,
  operational_costs numeric,
  net_profit numeric,
  profit_margin numeric,
  total_cards_sold integer,
  average_commission_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH platform_data AS (
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
      -- Receita da plataforma: comissões recebidas sobre lucro bruto
      COALESCE(SUM(CASE 
        WHEN status IN ('registered', 'redeemed')
        THEN ((sale_price - production_cost) * commission_percentage / 100) 
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
$function$;