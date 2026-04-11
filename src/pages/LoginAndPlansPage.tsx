import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlanType } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingPlans } from "@/components/landing/LandingPlans";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LoginAndPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("pro");
  const navigate = useNavigate();

  // Redirect ALL authenticated users to dashboard (no landing page for logged-in users)
  useEffect(() => {
    const checkAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate("/dashboard", { replace: true });
        return;
      }
    };
    checkAndRedirect();

    // Also listen for auth state changes (e.g. OAuth redirect back)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          navigate("/dashboard", { replace: true });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePlanSelect = (planId: PlanType) => {
    setSelectedPlan(planId);
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Sticky Header */}
      <LandingHeader />

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
    </div>
  );
}
