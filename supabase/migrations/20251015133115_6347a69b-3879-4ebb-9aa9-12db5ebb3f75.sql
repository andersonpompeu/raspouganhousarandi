-- Remover funções financeiras antigas que não são mais necessárias
DROP FUNCTION IF EXISTS public.calculate_global_financial_metrics();
DROP FUNCTION IF EXISTS public.calculate_platform_financial_metrics();
DROP FUNCTION IF EXISTS public.calculate_company_financial_metrics(uuid);