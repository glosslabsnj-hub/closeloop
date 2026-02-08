/**
 * BrainSetupPage - Guided interview for Business Brain setup
 * 
 * Routes: /app/brain-setup
 * 
 * New users are directed here after onboarding.
 * Existing users can access via "Improve Your Setup" in Business Brain.
 */

import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import { useInterviewToFields } from "@/hooks/useInterviewToFields";
import { BrainInterviewFlow } from "@/components/brain/interview";
import type { InterviewAnswers } from "@/hooks/useInterviewState";

export default function BrainSetupPage() {
  const navigate = useNavigate();
  const { businessMode } = useTenantConfig();
  const { saveAnswers, isSaving } = useInterviewToFields();

  const handleComplete = useCallback(async (answers: InterviewAnswers) => {
    await saveAnswers(answers);
    navigate("/app/business-brain");
  }, [saveAnswers, navigate]);

  const handleSkip = useCallback(() => {
    navigate("/app/business-brain");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      <BrainInterviewFlow
        mode={businessMode}
        onComplete={handleComplete}
        onSkip={handleSkip}
      />
    </div>
  );
}
