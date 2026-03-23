import { useState } from "react";
import { PlanType } from "@/contexts/SessionContext";

import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingBenefits } from "@/components/landing/LandingBenefits";
import { LandingPlans } from "@/components/landing/LandingPlans";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LoginAndPlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("pro");

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
