-- Criar enum para tipos de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'company_partner');

-- Criar tabela de roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'company_partner',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seu próprio role
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Política: Admins podem ver todos os roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Política: Admins podem inserir roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Política: Admins podem deletar roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para pegar company_id do usuário
CREATE OR REPLACE FUNCTION public.get_user_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Atualizar RLS em scratch_cards para empresas parceiras
CREATE POLICY "Company partners can view own scratch cards"
ON public.scratch_cards FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  (public.has_role(auth.uid(), 'company_partner') AND 
   company_id = public.get_user_company(auth.uid()))
);

-- Atualizar RLS em redemptions para empresas parceiras
CREATE POLICY "Company partners can insert own redemptions"
ON public.redemptions FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  (public.has_role(auth.uid(), 'company_partner') AND
   scratch_card_id IN (
     SELECT id FROM scratch_cards 
     WHERE company_id = public.get_user_company(auth.uid())
   ))
);

CREATE POLICY "Company partners can view own redemptions"
ON public.redemptions FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  (public.has_role(auth.uid(), 'company_partner') AND
   scratch_card_id IN (
     SELECT id FROM scratch_cards 
     WHERE company_id = public.get_user_company(auth.uid())
   ))
);