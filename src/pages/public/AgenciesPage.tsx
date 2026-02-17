import { AgencyHeroSection } from "@/components/agency-landing/AgencyHeroSection";
import { AgencyValueProps } from "@/components/agency-landing/AgencyValueProps";
import { AgencyHowItWorks } from "@/components/agency-landing/AgencyHowItWorks";
import { AgencyEarningsCalculator } from "@/components/agency-landing/AgencyEarningsCalculator";
import { AgencyApplicationForm } from "@/components/agency-landing/AgencyApplicationForm";
import { AgencyFAQ } from "@/components/agency-landing/AgencyFAQ";

export default function AgenciesPage() {
  return (
    <>
      <AgencyHeroSection />
      <AgencyValueProps />
      <AgencyHowItWorks />
      <AgencyEarningsCalculator />
      <AgencyApplicationForm />
      <AgencyFAQ />
    </>
  );
}
