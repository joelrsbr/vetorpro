-- Criar enum para os novos planos de assinatura
CREATE TYPE public.subscription_plan_v2 AS ENUM ('basic', 'pro', 'business');

-- Criar enum para status da assinatura
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'canceled', 'past_due');

-- Criar tabela de assinaturas
CREATE TABLE public.subscriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    plan subscription_plan_v2 NOT NULL DEFAULT 'basic',
    status subscription_status NOT NULL DEFAULT 'inactive',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para provisionar assinatura para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.subscriptions (user_id, plan, status)
    VALUES (NEW.id, 'basic', 'inactive');
    RETURN NEW;
END;
$$;

-- Trigger para criar assinatura quando usuário é criado
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();

-- Função helper para verificar assinatura do usuário
CREATE OR REPLACE FUNCTION public.get_user_subscription(p_user_id UUID)
RETURNS TABLE (
    plan subscription_plan_v2,
    status subscription_status,
    is_active BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.plan,
        s.status,
        (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > now())) AS is_active,
        s.expires_at
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$;