-- Permitir que usuários anônimos vejam prêmios durante cadastro
CREATE POLICY "Anyone can view prizes for registration"
ON prizes
FOR SELECT
TO anon, authenticated
USING (true);