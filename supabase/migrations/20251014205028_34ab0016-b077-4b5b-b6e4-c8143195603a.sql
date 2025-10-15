-- Tabela de empresas parceiras
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de prêmios configurados
CREATE TABLE public.prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  distributed_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT positive_quantities CHECK (total_quantity >= 0 AND distributed_quantity >= 0 AND distributed_quantity <= total_quantity)
);

-- Tabela de raspadinhas
CREATE TABLE public.scratch_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_code TEXT NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  prize_id UUID REFERENCES public.prizes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'registered', 'redeemed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de cadastros de clientes
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scratch_card_id UUID NOT NULL REFERENCES public.scratch_cards(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de retiradas/entregas de prêmios
CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scratch_card_id UUID NOT NULL REFERENCES public.scratch_cards(id) ON DELETE CASCADE,
  attendant_name TEXT NOT NULL,
  notes TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_scratch_cards_serial ON public.scratch_cards(serial_code);
CREATE INDEX idx_scratch_cards_company ON public.scratch_cards(company_id);
CREATE INDEX idx_scratch_cards_status ON public.scratch_cards(status);
CREATE INDEX idx_registrations_card ON public.registrations(scratch_card_id);
CREATE INDEX idx_redemptions_card ON public.redemptions(scratch_card_id);

-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prizes_updated_at
  BEFORE UPDATE ON public.prizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scratch_cards_updated_at
  BEFORE UPDATE ON public.scratch_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Tabela de perfis de usuário
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'company')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'admin'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies para Admin (acesso total para usuários autenticados)
CREATE POLICY "Admins can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (true);

-- Prizes policies
CREATE POLICY "Admins can view all prizes"
  ON public.prizes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert prizes"
  ON public.prizes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update prizes"
  ON public.prizes FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete prizes"
  ON public.prizes FOR DELETE
  TO authenticated
  USING (true);

-- Scratch cards policies (admin tem acesso total, público pode ver para validação)
CREATE POLICY "Anyone can view scratch cards by serial"
  ON public.scratch_cards FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert scratch cards"
  ON public.scratch_cards FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update scratch cards"
  ON public.scratch_cards FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete scratch cards"
  ON public.scratch_cards FOR DELETE
  TO authenticated
  USING (true);

-- Registrations policies (público pode inserir, admin pode ver tudo)
CREATE POLICY "Anyone can register scratch card"
  ON public.registrations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all registrations"
  ON public.registrations FOR SELECT
  TO authenticated
  USING (true);

-- Redemptions policies (público pode inserir confirmação de entrega, admin vê tudo)
CREATE POLICY "Anyone can confirm redemption"
  ON public.redemptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all redemptions"
  ON public.redemptions FOR SELECT
  TO authenticated
  USING (true);

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Inserir dados de exemplo
INSERT INTO public.prizes (name, description, total_quantity, distributed_quantity) VALUES
  ('Lanche R$ 30', 'Vale para lanche de até R$ 30', 200, 120),
  ('Desconto 20%', 'Desconto de 20% na próxima compra', 150, 80),
  ('Refrigerante Grátis', 'Refrigerante 350ml grátis', 300, 200),
  ('Sobremesa Grátis', 'Sobremesa do dia grátis', 100, 45);

INSERT INTO public.companies (name, contact_phone, contact_email, commission_percentage, status) VALUES
  ('Pizzaria Bella Vista', '(11) 98765-4321', 'contato@pizzariabella.com', 15.00, 'active'),
  ('Café Central', '(11) 97654-3210', 'cafe@central.com', 12.00, 'active'),
  ('Hamburgueria Top Burger', '(11) 96543-2109', 'contato@topburger.com', 18.00, 'paused');
