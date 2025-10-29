-- Add reminded_at column to registrations table to track reminder sends
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS reminded_at timestamp with time zone;

-- Create customer_loyalty table for loyalty program
CREATE TABLE IF NOT EXISTS customer_loyalty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  points integer DEFAULT 0 NOT NULL,
  tier text DEFAULT 'bronze' NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  total_prizes_won integer DEFAULT 0 NOT NULL,
  last_redemption_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on customer_loyalty
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_loyalty
CREATE POLICY "Admins can view all loyalty data"
  ON customer_loyalty FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert loyalty data"
  ON customer_loyalty FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update loyalty data"
  ON customer_loyalty FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Company partners can view loyalty data"
  ON customer_loyalty FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'company_partner'::app_role)
  );

-- Add updated_at trigger for customer_loyalty
CREATE TRIGGER update_customer_loyalty_updated_at
  BEFORE UPDATE ON customer_loyalty
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update loyalty points after redemption
CREATE OR REPLACE FUNCTION update_loyalty_after_redemption()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger to update loyalty after redemption
CREATE TRIGGER trigger_update_loyalty_after_redemption
  AFTER INSERT ON redemptions
  FOR EACH ROW
  EXECUTE FUNCTION update_loyalty_after_redemption();