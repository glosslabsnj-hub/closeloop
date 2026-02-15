import { useState, useCallback, useRef } from "react";

export interface FieldError {
  field: string;
  message: string;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: FieldError[];
}

const EMAIL_REGEX = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
const PHONE_REGEX = /^[\d\s()+-]{7,20}$/;

export function validateIdentityStep(
  businessName: string,
  industrySlug: string,
  businessDetails?: { location?: string },
): StepValidationResult {
  const errors: FieldError[] = [];

  if (!businessName.trim()) {
    errors.push({ field: "business-name", message: "Business name is required" });
  } else if (businessName.trim().length < 2) {
    errors.push({ field: "business-name", message: "Business name must be at least 2 characters" });
  }

  if (!industrySlug) {
    errors.push({ field: "industry-selector", message: "Please select your industry" });
  }

  return { isValid: errors.length === 0, errors };
}

export function validateServicesStep(services: Array<{ enabled: boolean; name: string }>): StepValidationResult {
  const errors: FieldError[] = [];
  const hasEnabledService = services.some(s => s.enabled && s.name.trim().length > 0);
  if (!hasEnabledService) {
    errors.push({ field: "services-list", message: "Please select at least one service" });
  }
  return { isValid: errors.length === 0, errors };
}

export function useOnboardingValidation() {
  const [fieldErrors, setFieldErrors] = useState<FieldError[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const scrollToFirstError = useCallback((errors: FieldError[]) => {
    if (errors.length === 0) return;
    const firstField = errors[0].field;
    // Try to find by id, then by data-field
    const el =
      document.getElementById(firstField) ||
      document.querySelector(`[data-field="${firstField}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Try to focus if it's an input
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        setTimeout(() => el.focus(), 300);
      }
    }
  }, []);

  const validateStep = useCallback(
    (
      stepId: string,
      data: {
        businessName?: string;
        industrySlug?: string;
        businessDetails?: { location?: string };
        templateServices?: Array<{ enabled: boolean; name: string }>;
      }
    ): boolean => {
      setHasAttemptedSubmit(true);
      let result: StepValidationResult = { isValid: true, errors: [] };

      switch (stepId) {
        case "identity":
          result = validateIdentityStep(
            data.businessName || "",
            data.industrySlug || "",
            data.businessDetails,
          );
          break;
        case "services-preview":
          result = validateServicesStep(data.templateServices || []);
          break;
        // Other steps always pass (scheduling, team, communication, confirm)
        default:
          result = { isValid: true, errors: [] };
      }

      setFieldErrors(result.errors);
      if (!result.isValid) {
        scrollToFirstError(result.errors);
      }
      return result.isValid;
    },
    [scrollToFirstError]
  );

  const getFieldError = useCallback(
    (fieldId: string): string | undefined => {
      if (!hasAttemptedSubmit) return undefined;
      return fieldErrors.find(e => e.field === fieldId)?.message;
    },
    [fieldErrors, hasAttemptedSubmit]
  );

  const clearErrors = useCallback(() => {
    setFieldErrors([]);
    setHasAttemptedSubmit(false);
  }, []);

  return {
    fieldErrors,
    hasAttemptedSubmit,
    validateStep,
    getFieldError,
    clearErrors,
  };
}
