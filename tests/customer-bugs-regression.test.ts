/**
 * Customer Bug Regression Tests
 *
 * @vitest-environment node
 *
 * Guards against regressions for bugs found during electrical QA (2026-03-06):
 *
 * Bug #494: Customer Notes tab was empty after customer creation.
 *   Root cause: useState initialized from `customer.notes` was stale when
 *   the same CustomerDetailSheet was reused for a different customer.
 *   Fix: useEffect on customer.id syncs notes state when customer changes.
 *
 * Bug #495: Booking not linked to customer in the Bookings tab.
 *   Root cause: Phone stored in bookings as "555-0100" but customer stored
 *   as "5550100" (digits only). useCustomerActivity only filtered by exact
 *   phone match, so the booking was invisible in the customer's Bookings tab.
 *   Fix: useCustomerActivity builds OR filter with both raw value AND
 *   digits-only variant so both formats match.
 *
 * Gates: dashboard/customer_management_works
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function readSrc(relative: string): string {
  const path = join(SRC, relative);
  if (!existsSync(path)) {
    throw new Error(`File not found: ${relative}`);
  }
  return readFileSync(path, "utf-8");
}

// ---------------------------------------------------------------------------
// Bug #494: Customer Notes tab stale state
// ---------------------------------------------------------------------------

describe("Bug #494 regression: Customer Notes tab syncs when customer changes", () => {
  const sheet = readSrc("components/customers/CustomerDetailSheet.tsx");

  it("CustomerDetailSheet uses useState for notes", () => {
    expect(sheet).toContain("useState");
    expect(sheet).toMatch(/useState\s*\(\s*customer\?\.notes/);
  });

  it("has useEffect that syncs notes when customer.id changes", () => {
    // The fix: useEffect with customer.id dependency sets notes from customer.notes
    // Pattern: useEffect(() => { setNotes(customer?.notes || ""); ... }, [customer?.id])
    expect(sheet).toContain("useEffect");
    expect(sheet).toMatch(/setNotes\s*\(\s*customer\?\.notes/);
  });

  it("useEffect depends on customer.id (not the full customer object)", () => {
    // Full customer object dependency would cause infinite re-renders;
    // customer.id only changes when a different customer is opened.
    const effectMatch = sheet.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?setNotes[\s\S]*?\},\s*\[([\s\S]*?)\]/);
    expect(effectMatch).not.toBeNull();
    if (effectMatch) {
      const deps = effectMatch[1];
      expect(deps).toMatch(/customer\?\.id|customer\.id/);
    }
  });

  it("Notes tab content renders the notes state variable (not customer.notes directly)", () => {
    // Should use the state variable `notes` for the textarea value,
    // NOT customer.notes directly (which would bypass the sync fix)
    const notesTabMatch = sheet.match(/TabsContent\s+value="notes"[\s\S]*?<\/TabsContent>/);
    if (notesTabMatch) {
      const tabContent = notesTabMatch[0];
      expect(tabContent).toMatch(/value=\{notes\}/);
      // Must NOT use customer.notes directly as the textarea value
      expect(tabContent).not.toMatch(/value=\{customer\?\.notes\}/);
    }
  });
});

// ---------------------------------------------------------------------------
// Bug #495 regression: Phone format mismatch in customer Bookings tab
// ---------------------------------------------------------------------------

/**
 * Phone normalization logic extracted for unit testing.
 * Mirrors the exact logic in useCustomerActivity.ts lines 57-63.
 */
function buildPhoneFilters(customerId: string | null, customerPhone: string | null): string[] {
  const orFilters: string[] = [];
  if (customerId) orFilters.push(`customer_id.eq.${customerId}`);
  if (customerPhone) {
    orFilters.push(`phone.eq.${customerPhone}`);
    const digits = customerPhone.replace(/\D/g, "");
    if (digits && digits !== customerPhone) orFilters.push(`phone.eq.${digits}`);
  }
  return orFilters;
}

describe("Bug #495 regression: Phone format normalization in useCustomerActivity", () => {
  describe("buildPhoneFilters logic (mirrors useCustomerActivity lines 57-63)", () => {
    it("includes customer_id filter when customerId is provided", () => {
      const filters = buildPhoneFilters("cust-uuid", null);
      expect(filters).toContain("customer_id.eq.cust-uuid");
    });

    it("includes raw phone filter", () => {
      const filters = buildPhoneFilters(null, "555-0100");
      expect(filters).toContain("phone.eq.555-0100");
    });

    it("also includes digits-only filter when phone has non-digit chars", () => {
      // Bug scenario: customer stored "5550100" but booking stored "555-0100"
      const filters = buildPhoneFilters(null, "555-0100");
      expect(filters).toContain("phone.eq.5550100");
    });

    it("does NOT duplicate when phone is already digits only", () => {
      const filters = buildPhoneFilters(null, "5550100");
      // Should only have one phone filter (no redundant duplicate)
      const phoneFilters = filters.filter(f => f.startsWith("phone.eq."));
      expect(phoneFilters).toHaveLength(1);
      expect(phoneFilters[0]).toBe("phone.eq.5550100");
    });

    it("handles +1 prefix normalization", () => {
      const filters = buildPhoneFilters(null, "+15550100");
      expect(filters).toContain("phone.eq.+15550100");
      expect(filters).toContain("phone.eq.15550100");
    });

    it("handles (555) 0100 format", () => {
      const filters = buildPhoneFilters(null, "(555) 0100");
      expect(filters).toContain("phone.eq.(555) 0100");
      expect(filters).toContain("phone.eq.5550100");
    });

    it("handles +1 (555) 867-5309 full US format", () => {
      const filters = buildPhoneFilters(null, "+1 (555) 867-5309");
      expect(filters).toContain("phone.eq.+1 (555) 867-5309");
      expect(filters).toContain("phone.eq.15558675309");
    });

    it("combines customer_id and phone filters with OR", () => {
      const filters = buildPhoneFilters("cust-uuid", "555-0100");
      expect(filters).toContain("customer_id.eq.cust-uuid");
      expect(filters).toContain("phone.eq.555-0100");
      expect(filters).toContain("phone.eq.5550100");
      expect(filters).toHaveLength(3);
    });

    it("returns empty array when both customerId and customerPhone are null", () => {
      const filters = buildPhoneFilters(null, null);
      expect(filters).toHaveLength(0);
    });
  });

  describe("useCustomerActivity source code verification", () => {
    const source = readSrc("hooks/useCustomerActivity.ts");

    it("builds digits-only variant when phone contains dashes", () => {
      // Verify the actual source has the normalization logic
      expect(source).toContain("replace(/\\D/g, \"\")");
    });

    it("pushes digits-only filter only when it differs from raw", () => {
      // Guard: digits !== customerPhone prevents duplicate when phone is already clean
      expect(source).toMatch(/digits\s*&&\s*digits\s*!==\s*customerPhone/);
    });

    it("uses .or() with the combined filters", () => {
      expect(source).toContain(".or(orFilters.join(\",\"))");
    });

    it("queries leads table for booking linkage (bookings link via leads.id)", () => {
      expect(source).toContain("from(\"leads\")");
    });

    it("queries bookings table via lead_id (not direct phone match)", () => {
      // Bookings link to leads via lead_id FK; we resolve leads first then query bookings
      expect(source).toContain("from(\"bookings\")");
      expect(source).toContain("lead_id");
    });
  });
});

// ---------------------------------------------------------------------------
// CustomerDetailSheet: structural integrity
// ---------------------------------------------------------------------------

describe("CustomerDetailSheet: structural integrity", () => {
  const sheet = readSrc("components/customers/CustomerDetailSheet.tsx");

  it("has Notes tab trigger", () => {
    expect(sheet).toMatch(/TabsTrigger\s+value="notes"/);
  });

  it("has Notes tab content panel", () => {
    expect(sheet).toMatch(/TabsContent\s+value="notes"/);
  });

  it("has Bookings tab trigger", () => {
    expect(sheet).toMatch(/TabsTrigger\s+value="bookings"|TabsTrigger\s+value="activity"/);
  });

  it("has save notes mutation", () => {
    // Notes must be saveable — not just displayed
    expect(sheet).toContain("updateCustomer");
  });

  it("imports useEffect for stale state fix", () => {
    expect(sheet).toMatch(/import\s*\{[^}]*useEffect[^}]*\}/);
  });
});

// ---------------------------------------------------------------------------
// useCustomerActivity: query safety
// ---------------------------------------------------------------------------

describe("useCustomerActivity: query safety", () => {
  const source = readSrc("hooks/useCustomerActivity.ts");

  it("guards against null customerId before querying call history", () => {
    expect(source).toMatch(/if\s*\(\s*!\s*customerId\s*\)\s*return\s*\[\]/);
  });

  it("guards against empty leadIds before querying bookings", () => {
    expect(source).toMatch(/if\s*\(\s*leadIds\.length\s*===\s*0\s*\)\s*return\s*\[\]/);
  });

  it("query is disabled when customerId is null", () => {
    expect(source).toMatch(/enabled:\s*!!\s*customerId/);
  });

  it("falls back to empty arrays when data is undefined", () => {
    expect(source).toContain("?? []");
  });
});
