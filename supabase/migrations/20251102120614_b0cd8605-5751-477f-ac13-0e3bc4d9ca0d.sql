-- Function para verificar e conceder conquistas automaticamente
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Chamar edge function de forma assíncrona via pg_net
  PERFORM net.http_post(
    url := (current_setting('app.settings.supabase_url') || '/functions/v1/check-achievements'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'customerPhone', (
        SELECT customer_phone 
        FROM customer_loyalty 
        WHERE customer_phone = (
          SELECT customer_phone 
          FROM registrations 
          WHERE scratch_card_id = NEW.scratch_card_id 
          LIMIT 1
        )
      )
    )
  );
  
  RETURN NEW;
END;
$function$;

-- Trigger para verificar conquistas após redemption
CREATE TRIGGER check_achievements_after_redemption
AFTER INSERT ON public.redemptions
FOR EACH ROW
EXECUTE FUNCTION public.check_and_grant_achievements();