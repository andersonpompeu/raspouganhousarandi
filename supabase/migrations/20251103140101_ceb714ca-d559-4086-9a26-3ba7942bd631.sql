-- Melhorar políticas RLS com search_path correto

-- Atualizar função update_loyalty_after_redemption
CREATE OR REPLACE FUNCTION public.update_loyalty_after_redemption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_customer_phone text;
  v_customer_name text;
  v_prize_value numeric;
  v_points_to_add integer;
  v_new_tier text;
BEGIN
  -- Get customer info from registration
  SELECT r.customer_phone, r.customer_name
  INTO v_customer_phone, v_customer_name
  FROM registrations r
  WHERE r.scratch_card_id = NEW.scratch_card_id
  LIMIT 1;

  -- Get prize value
  SELECT p.prize_value
  INTO v_prize_value
  FROM prizes p
  JOIN scratch_cards sc ON sc.prize_id = p.id
  WHERE sc.id = NEW.scratch_card_id;

  -- Calculate points (1 point per R$ 1)
  v_points_to_add := FLOOR(COALESCE(v_prize_value, 0));

  -- Insert or update customer loyalty
  INSERT INTO customer_loyalty (
    customer_phone, 
    customer_name, 
    points, 
    total_prizes_won, 
    last_redemption_at
  )
  VALUES (
    v_customer_phone,
    v_customer_name,
    v_points_to_add,
    1,
    NEW.redeemed_at
  )
  ON CONFLICT (customer_phone) 
  DO UPDATE SET
    points = customer_loyalty.points + v_points_to_add,
    total_prizes_won = customer_loyalty.total_prizes_won + 1,
    last_redemption_at = NEW.redeemed_at,
    updated_at = now();

  -- Update tier based on total points
  SELECT points INTO v_points_to_add
  FROM customer_loyalty
  WHERE customer_phone = v_customer_phone;

  IF v_points_to_add >= 1000 THEN
    v_new_tier := 'platinum';
  ELSIF v_points_to_add >= 500 THEN
    v_new_tier := 'gold';
  ELSIF v_points_to_add >= 200 THEN
    v_new_tier := 'silver';
  ELSE
    v_new_tier := 'bronze';
  END IF;

  UPDATE customer_loyalty
  SET tier = v_new_tier
  WHERE customer_phone = v_customer_phone;

  RETURN NEW;
END;
$function$;

-- Atualizar função decrement_prize_distributed_quantity
CREATE OR REPLACE FUNCTION public.decrement_prize_distributed_quantity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  -- Quando uma nova registration é criada, decrementar distributed_quantity do prêmio
  IF TG_OP = 'INSERT' THEN
    UPDATE prizes
    SET distributed_quantity = GREATEST(distributed_quantity - 1, 0)
    WHERE id = (
      SELECT prize_id 
      FROM scratch_cards 
      WHERE id = NEW.scratch_card_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Atualizar função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;