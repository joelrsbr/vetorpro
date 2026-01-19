-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('free', 'pro');

-- Create enum for amortization type
CREATE TYPE public.amortization_type AS ENUM ('sac', 'price');

-- Create enum for extra amortization strategy
CREATE TYPE public.extra_amortization_strategy AS ENUM ('reduce_term', 'reduce_payment');

-- Create enum for reinforcement frequency
CREATE TYPE public.reinforcement_frequency AS ENUM ('monthly', 'semiannual', 'annual');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    subscription_plan subscription_plan NOT NULL DEFAULT 'free',
    simulations_used INTEGER NOT NULL DEFAULT 0,
    proposals_used INTEGER NOT NULL DEFAULT 0,
    simulations_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    proposals_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create simulations table
CREATE TABLE public.simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    property_value DECIMAL(15, 2) NOT NULL,
    down_payment DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL,
    term_months INTEGER NOT NULL,
    amortization_type amortization_type NOT NULL,
    extra_amortization DECIMAL(15, 2),
    extra_amortization_strategy extra_amortization_strategy,
    reinforcement_value DECIMAL(15, 2),
    reinforcement_frequency reinforcement_frequency,
    monthly_payment DECIMAL(15, 2) NOT NULL,
    total_paid DECIMAL(15, 2) NOT NULL,
    total_interest DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table
CREATE TABLE public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    simulation_id UUID REFERENCES public.simulations(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    property_description TEXT NOT NULL,
    proposal_text TEXT NOT NULL,
    interest_savings DECIMAL(15, 2),
    term_savings_months INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Simulations policies
CREATE POLICY "Users can view own simulations" ON public.simulations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own simulations" ON public.simulations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own simulations" ON public.simulations
    FOR DELETE USING (auth.uid() = user_id);

-- Proposals policies
CREATE POLICY "Users can view own proposals" ON public.proposals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proposals" ON public.proposals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own proposals" ON public.proposals
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to check and reset monthly limits
CREATE OR REPLACE FUNCTION public.check_and_reset_limits(p_user_id UUID)
RETURNS TABLE(
    can_simulate BOOLEAN,
    can_generate_proposal BOOLEAN,
    simulations_remaining INTEGER,
    proposals_remaining INTEGER
) AS $$
DECLARE
    v_profile profiles%ROWTYPE;
    v_sim_limit INTEGER;
    v_prop_limit INTEGER;
BEGIN
    SELECT * INTO v_profile FROM profiles WHERE user_id = p_user_id;
    
    -- Reset counters if month has passed
    IF v_profile.simulations_reset_at < date_trunc('month', now()) THEN
        UPDATE profiles 
        SET simulations_used = 0, simulations_reset_at = now()
        WHERE user_id = p_user_id;
        v_profile.simulations_used := 0;
    END IF;
    
    IF v_profile.proposals_reset_at < date_trunc('month', now()) THEN
        UPDATE profiles 
        SET proposals_used = 0, proposals_reset_at = now()
        WHERE user_id = p_user_id;
        v_profile.proposals_used := 0;
    END IF;
    
    -- Set limits based on plan
    IF v_profile.subscription_plan = 'pro' THEN
        v_sim_limit := 999999;
        v_prop_limit := 999999;
    ELSE
        v_sim_limit := 10;
        v_prop_limit := 2;
    END IF;
    
    RETURN QUERY SELECT 
        v_profile.simulations_used < v_sim_limit,
        v_profile.proposals_used < v_prop_limit,
        GREATEST(0, v_sim_limit - v_profile.simulations_used),
        GREATEST(0, v_prop_limit - v_profile.proposals_used);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to increment simulation count
CREATE OR REPLACE FUNCTION public.increment_simulation_count(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET simulations_used = simulations_used + 1
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;