import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  subscription_plan: "free" | "pro" | "basic" | "business";
  simulations_used: number;
  proposals_used: number;
  simulations_reset_at: string;
  proposals_reset_at: string;
}

interface UsageLimits {
  canSimulate: boolean;
  canGenerateProposal: boolean;
  simulationsRemaining: number;
  proposalsRemaining: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  usageLimits: UsageLimits | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUsageLimits: () => Promise<void>;
  incrementSimulationCount: () => Promise<void>;
  incrementProposalCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data as Profile | null;
  };

  const fetchUsageLimits = async (userId: string) => {
    const { data, error } = await supabase.rpc("check_and_reset_limits", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching usage limits:", error);
      return null;
    }

    if (data && data[0]) {
      return {
        canSimulate: data[0].can_simulate,
        canGenerateProposal: data[0].can_generate_proposal,
        simulationsRemaining: data[0].simulations_remaining,
        proposalsRemaining: data[0].proposals_remaining,
      };
    }
    return null;
  };

  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  const refreshUsageLimits = async () => {
    if (user) {
      const limits = await fetchUsageLimits(user.id);
      setUsageLimits(limits);
    }
  };

  const incrementSimulationCount = async () => {
    if (user) {
      await supabase.rpc("increment_simulation_count", { p_user_id: user.id });
      await refreshUsageLimits();
    }
  };

  const incrementProposalCount = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ proposals_used: (profile?.proposals_used || 0) + 1 })
        .eq("user_id", user.id);
      await refreshUsageLimits();
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            const profileData = await fetchProfile(session.user.id);
            setProfile(profileData);
            const limits = await fetchUsageLimits(session.user.id);
            setUsageLimits(limits);
          }, 0);
        } else {
          setProfile(null);
          setUsageLimits(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
        fetchUsageLimits(session.user.id).then(setUsageLimits);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: "Erro ao criar conta",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Conta criada com sucesso!",
      description: "Você já pode fazer login.",
    });

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Bem-vindo!",
      description: "Login realizado com sucesso.",
    });

    return { error: null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setUsageLimits(null);
    toast({
      title: "Até logo!",
      description: "Você saiu da sua conta.",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        usageLimits,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshUsageLimits,
        incrementSimulationCount,
        incrementProposalCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
