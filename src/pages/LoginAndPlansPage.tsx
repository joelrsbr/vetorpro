import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSession, PlanType } from "@/contexts/SessionContext";

import { LandingHero } from "@/components/landing/LandingHero";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingPlans } from "@/components/landing/LandingPlans";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LoginModal } from "@/components/landing/LoginModal";
import { WelcomeModal } from "@/components/landing/WelcomeModal";

export default function LoginAndPlansPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { session, login } = useSession();
  
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("pro");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState("");

  // Redirect if already logged in (via Supabase auth)
  useEffect(() => {
    if (user) {
      navigate("/business");
    }
  }, [user, navigate]);

  // Redirect if already logged in via session
  useEffect(() => {
    if (session.isLoggedIn) {
      navigate("/home");
    }
  }, [session.isLoggedIn, navigate]);

  // Auto-redirect after welcome modal
  useEffect(() => {
    if (showWelcomeModal) {
      const timer = setTimeout(() => {
        navigate("/home");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showWelcomeModal, navigate]);

  const handlePlanSelect = (planId: PlanType) => {
    setSelectedPlan(planId);
    setShowLoginModal(true);
  };

  const handleLogin = (method: string) => {
    setIsLoading(true);
    setLoginMethod(method);

    // Simulate loading time
    setTimeout(() => {
      setIsLoading(false);
      setShowLoginModal(false);
      // Save session with selected plan
      login(method, selectedPlan);
      setShowWelcomeModal(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Hero Section */}
      <LandingHero />

      {/* Benefits Section */}
      <LandingBenefits />

      {/* Plans Section */}
      <LandingPlans 
        selectedPlan={selectedPlan} 
        onSelectPlan={handlePlanSelect} 
      />

      {/* Footer */}
      <LandingFooter />

      {/* Login Modal */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        selectedPlan={selectedPlan}
        onLogin={handleLogin}
        isLoading={isLoading}
        loginMethod={loginMethod}
      />

      {/* Welcome Modal */}
      <WelcomeModal 
        open={showWelcomeModal} 
        planId={selectedPlan} 
      />
    </div>
  );
}
