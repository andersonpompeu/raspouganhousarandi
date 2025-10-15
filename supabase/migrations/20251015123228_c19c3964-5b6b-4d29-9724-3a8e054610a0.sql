-- Corrigir search_path na função decrement_prize_distributed_quantity
CREATE OR REPLACE FUNCTION decrement_prize_distributed_quantity()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;