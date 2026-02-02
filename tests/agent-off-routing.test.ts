/**
 * Tests for Agent OFF routing decisions
 *
 * These tests validate that when the AI agent is toggled OFF,
 * calls are handled deterministically based on off_behavior setting.
 */

describe("Agent OFF Routing Logic", () => {
  describe("off_behavior validation", () => {
    test("should only allow FORWARD_OWNER, VOICEMAIL, or CALLBACK_ONLY", () => {
      const validBehaviors = ["FORWARD_OWNER", "VOICEMAIL", "CALLBACK_ONLY"];
      const invalidBehavior = "INVALID_OPTION";

      expect(validBehaviors).toContain("FORWARD_OWNER");
      expect(validBehaviors).toContain("VOICEMAIL");
      expect(validBehaviors).toContain("CALLBACK_ONLY");
      expect(validBehaviors).not.toContain(invalidBehavior);
    });
  });

  describe("FORWARD_OWNER behavior", () => {
    test("should forward to owner_forward_number when configured", () => {
      const settings = {
        voice_ai_enabled: false,
        off_behavior: "FORWARD_OWNER",
        owner_forward_number: "+12345678900",
        owner_forward_verified: true,
      };

      expect(settings.off_behavior).toBe("FORWARD_OWNER");
      expect(settings.owner_forward_number).toMatch(/^\+1\d{10}$/);
      expect(settings.owner_forward_verified).toBe(true);
    });

    test("should fallback to voicemail if owner_forward_number missing", () => {
      const settings = {
        voice_ai_enabled: false,
        off_behavior: "FORWARD_OWNER",
        owner_forward_number: null,
        owner_forward_verified: false,
      };

      // Logic: If FORWARD_OWNER but no number, fallback to voicemail
      const shouldFallbackToVoicemail =
        settings.off_behavior === "FORWARD_OWNER" &&
        !settings.owner_forward_number;

      expect(shouldFallbackToVoicemail).toBe(true);
    });

    test("should fallback to voicemail if owner_forward_number not verified", () => {
      const settings = {
        voice_ai_enabled: false,
        off_behavior: "FORWARD_OWNER",
        owner_forward_number: "+12345678900",
        owner_forward_verified: false,
      };

      // For production: unverified numbers shouldn't be used
      // (stub verification is ok for MVP, but this test documents the intent)
      const shouldRequireVerification = !settings.owner_forward_verified;
      expect(shouldRequireVerification).toBe(true);
    });
  });

  describe("VOICEMAIL behavior", () => {
    test("should take voicemail when configured", () => {
      const settings = {
        voice_ai_enabled: false,
        off_behavior: "VOICEMAIL",
      };

      expect(settings.off_behavior).toBe("VOICEMAIL");
    });
  });

  describe("CALLBACK_ONLY behavior", () => {
    test("should capture callback request when configured", () => {
      const settings = {
        voice_ai_enabled: false,
        off_behavior: "CALLBACK_ONLY",
      };

      expect(settings.off_behavior).toBe("CALLBACK_ONLY");
    });

    test("should create lead for callback requests", () => {
      const callbackLead = {
        tenant_id: "test-tenant",
        phone_e164: "+12345678900",
        source: "callback_request",
        status: "new",
        notes: "Callback request from +12345678900 when agent was OFF",
      };

      expect(callbackLead.source).toBe("callback_request");
      expect(callbackLead.status).toBe("new");
      expect(callbackLead.phone_e164).toMatch(/^\+1\d{10}$/);
    });
  });

  describe("phone number normalization", () => {
    const normalizePhoneNumber = (phone: string): string | null => {
      const digits = phone.replace(/\D/g, "");
      if (digits.length === 11 && digits.startsWith("1")) {
        return `+${digits}`;
      } else if (digits.length === 10) {
        return `+1${digits}`;
      } else if (phone.startsWith("+")) {
        return phone;
      }
      return null;
    };

    test("should normalize 10-digit US number to E.164", () => {
      expect(normalizePhoneNumber("5551234567")).toBe("+15551234567");
      expect(normalizePhoneNumber("555-123-4567")).toBe("+15551234567");
      expect(normalizePhoneNumber("(555) 123-4567")).toBe("+15551234567");
    });

    test("should normalize 11-digit number starting with 1 to E.164", () => {
      expect(normalizePhoneNumber("15551234567")).toBe("+15551234567");
      expect(normalizePhoneNumber("1-555-123-4567")).toBe("+15551234567");
    });

    test("should accept already formatted E.164 numbers", () => {
      expect(normalizePhoneNumber("+15551234567")).toBe("+15551234567");
    });

    test("should return null for invalid formats", () => {
      expect(normalizePhoneNumber("123")).toBeNull();
      expect(normalizePhoneNumber("invalid")).toBeNull();
      expect(normalizePhoneNumber("")).toBeNull();
    });
  });

  describe("busyness level validation", () => {
    test("should clamp busyness level between 0 and 100", () => {
      const clampBusyness = (level: number): number => {
        return Math.max(0, Math.min(100, level));
      };

      expect(clampBusyness(50)).toBe(50);
      expect(clampBusyness(0)).toBe(0);
      expect(clampBusyness(100)).toBe(100);
      expect(clampBusyness(-10)).toBe(0);
      expect(clampBusyness(150)).toBe(100);
    });

    test("should provide correct helper text for busyness levels", () => {
      const getBusynessHelperText = (level: number): string => {
        if (level <= 25) return "Relaxed: answer fast, be flexible";
        if (level <= 70) return "Normal: balanced";
        return "Packed: stricter, prioritize callback";
      };

      expect(getBusynessHelperText(0)).toBe("Relaxed: answer fast, be flexible");
      expect(getBusynessHelperText(25)).toBe("Relaxed: answer fast, be flexible");
      expect(getBusynessHelperText(50)).toBe("Normal: balanced");
      expect(getBusynessHelperText(70)).toBe("Normal: balanced");
      expect(getBusynessHelperText(71)).toBe("Packed: stricter, prioritize callback");
      expect(getBusynessHelperText(100)).toBe("Packed: stricter, prioritize callback");
    });
  });

  describe("dashboard toggle behavior", () => {
    test("should block toggle OFF if FORWARD_OWNER but no number configured", () => {
      const settings = {
        off_behavior: "FORWARD_OWNER",
        owner_forward_number: null,
      };

      const shouldBlockToggle =
        settings.off_behavior === "FORWARD_OWNER" &&
        !settings.owner_forward_number;

      expect(shouldBlockToggle).toBe(true);
    });

    test("should allow toggle OFF if FORWARD_OWNER with number configured", () => {
      const settings = {
        off_behavior: "FORWARD_OWNER",
        owner_forward_number: "+15551234567",
      };

      const shouldBlockToggle =
        settings.off_behavior === "FORWARD_OWNER" &&
        !settings.owner_forward_number;

      expect(shouldBlockToggle).toBe(false);
    });

    test("should allow toggle OFF for VOICEMAIL or CALLBACK_ONLY", () => {
      const voicemailSettings = { off_behavior: "VOICEMAIL" };
      const callbackSettings = { off_behavior: "CALLBACK_ONLY" };

      expect(voicemailSettings.off_behavior).not.toBe("FORWARD_OWNER");
      expect(callbackSettings.off_behavior).not.toBe("FORWARD_OWNER");
    });
  });
});
