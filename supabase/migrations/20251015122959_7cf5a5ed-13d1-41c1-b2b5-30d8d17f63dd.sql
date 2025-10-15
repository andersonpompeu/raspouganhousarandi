-- Adicionar campo de comissão da plataforma na tabela prizes
ALTER TABLE prizes ADD COLUMN IF NOT EXISTS platform_commission_percentage NUMERIC DEFAULT 10.00;

-- Criar função para decrementar distributed_quantity quando uma raspadinha é validada
CREATE OR REPLACE FUNCTION decrement_prize_distributed_quantity()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função quando uma registration é criada
DROP TRIGGER IF EXISTS trigger_decrement_distributed_on_registration ON registrations;
CREATE TRIGGER trigger_decrement_distributed_on_registration
AFTER INSERT ON registrations
FOR EACH ROW
EXECUTE FUNCTION decrement_prize_distributed_quantity();