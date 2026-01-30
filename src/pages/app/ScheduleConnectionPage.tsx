import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScheduleConnectionWizard } from "@/components/schedule/ScheduleConnectionWizard";

export default function ScheduleConnectionPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      {/* Back button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Wizard */}
      <ScheduleConnectionWizard 
        onComplete={() => navigate("/app/dashboard")}
        onSkip={() => navigate("/app/dashboard")}
      />
    </div>
  );
}
