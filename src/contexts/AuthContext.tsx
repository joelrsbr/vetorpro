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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; alreadyExists?: boolean }>;
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
    let currentUserId: string | null = null;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Always sync session/user references for downstream consumers
        setSession(session);
        setUser(session?.user ?? null);

        const newUserId = session?.user?.id ?? null;

        // TOKEN_REFRESHED dispara periodicamente em segundo plano e quando a aba volta
        // de inativa. Não devemos re-buscar profile/limites nesses casos — isso causa
        // flicker, perda momentânea de estado derivado e, se o token estiver em fase
        // de renovação, pode lançar e derrubar a árvore (tela branca).
        if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
          setLoading(false);
          currentUserId = newUserId;
          return;
        }

        // Apenas (re)buscar quando a identidade do usuário realmente muda.
        if (newUserId !== currentUserId) {
          currentUserId = newUserId;

          if (session?.user) {
            // setTimeout para não bloquear o callback de auth (evita deadlock).
            setTimeout(async () => {
              try {
                const profileData = await fetchProfile(session.user.id);
                setProfile(profileData);
                const limits = await fetchUsageLimits(session.user.id);
                setUsageLimits(limits);
              } catch (err) {
                console.error("Erro ao carregar profile/limites:", err);
              }
            }, 0);
          } else {
            setProfile(null);
            setUsageLimits(null);
          }
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      currentUserId = session?.user?.id ?? null;

      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile).catch((e) => console.error(e));
        fetchUsageLimits(session.user.id).then(setUsageLimits).catch((e) => console.error(e));
      }

      setLoading(false);
    }).catch((err) => {
      console.error("Erro ao recuperar sessão inicial:", err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Quando a aba volta de inativa, força refresh do token Supabase.
  // Sem isso, o primeiro request após longa inatividade pode falhar com token expirado
  // e derrubar componentes que não tratam o erro (sintoma: tela branca + CRM vazio).
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            // Não-bloqueante; se falhar o usuário continua logado até a próxima ação.
            supabase.auth.refreshSession().catch((err) => {
              console.warn("[Auth] refreshSession após retorno da aba falhou:", err);
            });
          }
        }).catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const translateAuthError = (msg: string): string => {
    const m = (msg || "").toLowerCase();
    if (m.includes("rate limit")) return "Limite de envio atingido. Aguarde alguns instantes e tente novamente.";
    if (m.includes("invalid login credentials") || m.includes("invalid credentials")) return "E-mail ou senha incorretos.";
    if (m.includes("user already registered") || m.includes("already registered")) return "Este e-mail já está cadastrado. Faça login ou recupere sua senha.";
    if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    if (m.includes("password should be") || m.includes("password is too short") || m.includes("weak password")) return "Senha muito fraca. Use ao menos 6 caracteres com letras e números.";
    if (m.includes("invalid email")) return "E-mail inválido. Verifique e tente novamente.";
    if (m.includes("user not found")) return "Usuário não encontrado. Verifique o e-mail informado.";
    if (m.includes("token has expired") || m.includes("expired")) return "Link expirado. Solicite um novo e-mail e tente novamente.";
    if (m.includes("network") || m.includes("failed to fetch")) return "Falha de conexão. Verifique sua internet e tente novamente.";
    if (m.includes("same password")) return "A nova senha deve ser diferente da atual.";
    if (m.includes("signup") && m.includes("disabled")) return "Cadastros temporariamente desativados. Tente novamente mais tarde.";
    return "Não foi possível concluir a operação. Tente novamente em instantes.";
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/login`;
    console.log("[Auth] signUp →", { email, redirectUrl });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });

    console.log("[Auth] signUp response:", { data, error });

    if (error) {
      console.error("[Auth] signUp error:", error);
      toast({
        title: "Erro ao criar conta",
        description: translateAuthError(error.message),
        variant: "destructive",
      });
      return { error };
    }

    // Supabase returns 200 with empty `identities` when the email already exists
    // (anti-enumeration). Detect that and surface a real message instead of a
    // false-positive "check your email" toast.
    const identities = data?.user?.identities;
    const alreadyExists = Array.isArray(identities) && identities.length === 0;

    if (alreadyExists) {
      console.warn("[Auth] signUp: email já cadastrado (identities vazio)");
      toast({
        title: "E-mail já cadastrado",
        description: "Já existe uma conta com este e-mail. Faça login ou recupere sua senha.",
        variant: "destructive",
      });
      return { error: null, alreadyExists: true };
    }

    toast({
      title: "Conta criada com sucesso!",
      description: "Enviamos um link de confirmação para seu e-mail.",
    });

    return { error: null, alreadyExists: false };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: translateAuthError(error.message),
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
