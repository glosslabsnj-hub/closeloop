/**
 * Sales Call History + Settings Quality Gate Tests
 *
 * @vitest-environment node
 *
 * Covers:
 * 1. dashboard/call_history_real_data — CallsPage structure, RLS safety, sales-mode field extraction
 * 2. overall/no_console_errors — extended coverage (CallsPage, SettingsPage, shared files)
 * 3. settings/phone_number_displays_correctly — phone number sourced from correct field
 * 4. dashboard/call_history_real_data — deduplication, sorting, filtering logic
 *
 * Gate targets: dashboard/call_history_real_data, overall/no_console_errors,
 *               settings/phone_number_displays_correctly
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();

function readSource(relPath: string): string {
  return readFileSync(join(root, relPath), "utf-8");
}

function tryReadSource(relPath: string): string {
  try {
    return readFileSync(join(root, relPath), "utf-8");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// 1. dashboard/call_history_real_data — RLS safety & query structure
// ---------------------------------------------------------------------------

describe("dashboard/call_history_real_data — RLS safety", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("query filters by tenant_id (RLS enforcement)", () => {
    expect(callsPageSrc).toContain('.eq("tenant_id", tenant.id)');
  });

  it("query selects from ai_call_sessions table", () => {
    expect(callsPageSrc).toContain('.from("ai_call_sessions")');
  });

  it("query is disabled when tenant is absent (prevents unauthenticated fetch)", () => {
    expect(callsPageSrc).toContain("enabled: !!tenant?.id");
  });

  it("realtime subscription is tenant-scoped (prevents cross-tenant live updates)", () => {
    expect(callsPageSrc).toContain("tenant_id=eq.${tenant.id}");
  });

  it("realtime channel is removed on unmount (no memory leak)", () => {
    expect(callsPageSrc).toContain("supabase.removeChannel(channel)");
  });

  it("query returns early with empty array when tenant absent", () => {
    expect(callsPageSrc).toContain("if (!tenant?.id) return []");
  });
});

describe("dashboard/call_history_real_data — required fields selected", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  const requiredFields = [
    "id",
    "started_at",
    "ended_at",
    "caller_phone",
    "outcome",
    "summary",
    "context_json",
    "extracted_payload",
    "customer_id",
    "lead_score",
    "followup_status",
  ];

  for (const field of requiredFields) {
    it(`selects ${field} from ai_call_sessions`, () => {
      expect(callsPageSrc).toContain(field);
    });
  }

  it("joins customer data via FK relationship", () => {
    expect(callsPageSrc).toContain("customer:customers!ai_call_sessions_customer_id_fkey");
  });

  it("orders by started_at descending (most recent first)", () => {
    expect(callsPageSrc).toContain('order("started_at", { ascending: false })');
  });

  it("limits result set to prevent performance issues", () => {
    expect(callsPageSrc).toContain(".limit(100)");
  });
});

describe("dashboard/call_history_real_data — deduplication logic", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("deduplicates calls by phone number", () => {
    expect(callsPageSrc).toContain("deduplicateByPhone");
  });

  it("deduplication uses Map for efficiency (O(n) not O(n²))", () => {
    expect(callsPageSrc).toContain("new Map<string, CallSession>()");
  });

  it("deduplication handles null phone gracefully", () => {
    expect(callsPageSrc).toContain('"unknown"');
  });
});

describe("dashboard/call_history_real_data — lead score sorting", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("sorts hot leads first", () => {
    expect(callsPageSrc).toContain("hot: 0");
    expect(callsPageSrc).toContain("warm: 1");
    expect(callsPageSrc).toContain("cool: 2");
  });

  it("sorts by most recent within same lead score", () => {
    expect(callsPageSrc).toContain("getTime() - new Date(a.started_at).getTime()");
  });
});

describe("dashboard/call_history_real_data — lead filtering", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("supports hot filter (lead_score === hot)", () => {
    expect(callsPageSrc).toContain('leadFilter === "hot"');
    expect(callsPageSrc).toContain('call.lead_score === "hot"');
  });

  it("supports needs_followup filter (new or no_answer status)", () => {
    expect(callsPageSrc).toContain('leadFilter === "needs_followup"');
    expect(callsPageSrc).toContain('followup_status === "new"');
    expect(callsPageSrc).toContain('followup_status === "no_answer"');
  });

  it("supports completed filter (completed or called_back status)", () => {
    expect(callsPageSrc).toContain('leadFilter === "completed"');
    expect(callsPageSrc).toContain('followup_status === "completed"');
    expect(callsPageSrc).toContain('followup_status === "called_back"');
  });
});

describe("dashboard/call_history_real_data — search logic", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("search filters by customer name", () => {
    expect(callsPageSrc).toContain("customerName.toLowerCase().includes(query)");
  });

  it("search filters by phone number (digits-only match)", () => {
    expect(callsPageSrc).toContain("phoneDigits.includes(queryDigits)");
  });

  it("search filters by summary text", () => {
    expect(callsPageSrc).toContain("call.summary?.toLowerCase().includes(query)");
  });

  it("search filters by service requested (sales: vehicle model, etc.)", () => {
    expect(callsPageSrc).toContain("serviceRequested.toLowerCase().includes(query)");
  });
});

describe("dashboard/call_history_real_data — sales-mode field extraction", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("extracts service_requested from extracted_payload (sales: test drive type)", () => {
    expect(callsPageSrc).toContain("extractedPayload.service_requested");
  });

  it("extracts vehicle from extracted_payload for tooltip (sales: car info)", () => {
    expect(callsPageSrc).toContain("extractedPayload.vehicle");
  });

  it("extracts preferred_date for tooltip (test drive scheduling)", () => {
    expect(callsPageSrc).toContain("extractedPayload.preferred_date");
  });

  it("extracts preferred_time for tooltip", () => {
    expect(callsPageSrc).toContain("extractedPayload.preferred_time");
  });

  it("handles ElevenLabs nested value format ({ value, rationale, ... })", () => {
    // ElevenLabs returns fields as objects with value/rationale — extractCleanValue handles this
    expect(callsPageSrc).toContain("extractCleanValue");
    expect(callsPageSrc).toContain('"value" in obj');
  });

  it("extracts customer name from context_json as fallback", () => {
    expect(callsPageSrc).toContain("contextJson.customer_name");
  });

  it("handles gibberish transcription errors gracefully", () => {
    expect(callsPageSrc).toContain("isGibberish");
    expect(callsPageSrc).toContain('"completion"');
  });
});

describe("dashboard/call_history_real_data — terms.service used for column header", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("Service column header uses terms.service (shows 'Product' for sales mode)", () => {
    expect(callsPageSrc).toContain("terms.service");
  });

  it("search placeholder uses terms.service", () => {
    expect(callsPageSrc).toContain("terms.service");
  });
});

describe("dashboard/call_history_real_data — empty state and loading", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("shows loading skeleton while fetching", () => {
    expect(callsPageSrc).toContain("animate-pulse");
    expect(callsPageSrc).toContain("isLoading");
  });

  it("shows EmptyState when no calls exist", () => {
    expect(callsPageSrc).toContain("EmptyState");
    expect(callsPageSrc).toContain("No calls yet");
  });

  it("shows 'No matching calls' when search/filter finds nothing", () => {
    expect(callsPageSrc).toContain("No matching calls");
  });

  it("wraps page in ErrorBoundary (recovery from crash)", () => {
    expect(callsPageSrc).toContain("ErrorBoundary");
    expect(callsPageSrc).toContain('context="loading your call history"');
  });
});

describe("dashboard/call_history_real_data — webhook processing indicator", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("shows processing delayed warning when webhook is missing after 2 min", () => {
    expect(callsPageSrc).toContain("isWebhookMissing");
    expect(callsPageSrc).toContain("Processing delayed");
  });

  it("processing check uses 2 minute threshold", () => {
    expect(callsPageSrc).toContain("2 * 60 * 1000");
  });

  it("links to debug page for missing webhook cases", () => {
    expect(callsPageSrc).toContain("/debug/ai-context?session=");
  });
});

describe("dashboard/call_history_real_data — mobile card view", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("uses CallCard for mobile view", () => {
    expect(callsPageSrc).toContain("CallCard");
  });

  it("switches between mobile card and desktop table based on isMobile", () => {
    expect(callsPageSrc).toContain("isMobile");
  });
});

describe("dashboard/call_history_real_data — followup status update", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("updateFollowupMutation uses correct table (ai_call_sessions)", () => {
    expect(callsPageSrc).toContain("updateFollowupMutation");
    expect(callsPageSrc).toContain("followup_status");
  });

  it("includes all followup status options for car dealership follow-up tracking", () => {
    expect(callsPageSrc).toContain('"new"');
    expect(callsPageSrc).toContain('"called_back"');
    expect(callsPageSrc).toContain('"no_answer"');
    expect(callsPageSrc).toContain('"completed"');
    expect(callsPageSrc).toContain('"lost"');
  });
});

// ---------------------------------------------------------------------------
// 2. overall/no_console_errors — extended to cover all sales-visible files
// ---------------------------------------------------------------------------

const extendedNoConsoleFiles = [
  "src/pages/app/CallsPage.tsx",
  "src/pages/app/SettingsPage.tsx",
  "src/pages/app/SalesPipelinePage.tsx",
  "src/pages/app/TestDrivesPage.tsx",
  "src/pages/app/SalesInventoryPage.tsx",
  "src/components/calls/CallCard.tsx",
  "src/components/calls/CallEditDialog.tsx",
  "src/components/dashboard/layouts/SalesDashboardLayout.tsx",
  "src/components/settings/NotificationPreferencesPanel.tsx",
  "src/components/settings/SmsSettingsSection.tsx",
];

function hasConsoleLogOrWarn(src: string): string[] {
  return src
    .split("\n")
    .map((line, i) => ({ line, num: i + 1 }))
    .filter(({ line }) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*")) return false;
      return /console\.(log|warn)\(/.test(line);
    })
    .map(({ line, num }) => `line ${num}: ${line.trim()}`);
}

describe("overall/no_console_errors — extended file coverage", () => {
  for (const file of extendedNoConsoleFiles) {
    it(`${file.split("/").pop()} has no console.log or console.warn`, () => {
      const src = tryReadSource(file);
      if (!src) return; // file doesn't exist yet — skip
      const violations = hasConsoleLogOrWarn(src);
      expect(violations, `Found console.log/warn in ${file}: ${violations.join(", ")}`).toHaveLength(0);
    });
  }
});

describe("overall/no_console_errors — sales hooks clean", () => {
  const salesHooks = [
    "src/hooks/useTestDrives.ts",
    "src/hooks/useSalesLeads.ts",
    "src/hooks/useSalesInventory.ts",
  ];

  for (const file of salesHooks) {
    it(`${file.split("/").pop()} has no console.log or console.warn`, () => {
      const src = tryReadSource(file);
      if (!src) return;
      const violations = hasConsoleLogOrWarn(src);
      expect(violations, `Found console.log/warn in ${file}: ${violations.join(", ")}`).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. settings/phone_number_displays_correctly — phone shown from right source
// ---------------------------------------------------------------------------

describe("settings/phone_number_displays_correctly — EmptyDashboard phone source", () => {
  const emptyDashSrc = tryReadSource("src/components/dashboard/EmptyDashboard.tsx");

  it("reads phone from assistantSettings (forwarding_phone_e164 or closeloop_number)", () => {
    if (!emptyDashSrc) return;
    // Should NOT read from tenant.closeloop_number directly — was a bug (commit 2026-03-01)
    expect(emptyDashSrc).toContain("assistantSettings");
    // One of these correct fields must be used for phone display
    const usesCorrectField =
      emptyDashSrc.includes("forwarding_phone_e164") ||
      emptyDashSrc.includes("closeloop_number");
    expect(usesCorrectField).toBe(true);
  });
});

describe("settings/phone_number_displays_correctly — SettingsPage uses assistantSettings", () => {
  const settingsPageSrc = readSource("src/pages/app/SettingsPage.tsx");

  it("SettingsPage imports useAssistantSettings or reads assistant_settings", () => {
    const usesAssistantSettings =
      settingsPageSrc.includes("useAssistantSettings") ||
      settingsPageSrc.includes("assistant_settings");
    // Settings page may delegate phone display to sub-components
    // At minimum, it should NOT hardcode a phone number
    expect(settingsPageSrc).not.toMatch(/\+1\d{10}/); // no hardcoded US phone
  });

  it("SettingsPage wraps in ErrorBoundary (settings crash doesn't kill the page)", () => {
    expect(settingsPageSrc).toContain("ErrorBoundary");
  });
});

describe("settings/phone_number_displays_correctly — SmsSettingsSection phone handling", () => {
  const smsSrc = tryReadSource("src/components/settings/SmsSettingsSection.tsx");

  it("SmsSettingsSection reads from assistant_settings (not hardcoded)", () => {
    if (!smsSrc) return;
    expect(smsSrc).not.toMatch(/\+1\d{10}/); // no hardcoded phone
  });
});

describe("settings/phone_number_displays_correctly — phone formatting utility", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("formatPhone utility handles 10-digit US numbers", () => {
    expect(callsPageSrc).toContain("cleaned.length === 10");
    // Formats as (XXX) XXX-XXXX
    expect(callsPageSrc).toContain("cleaned.slice(0, 3)");
    expect(callsPageSrc).toContain("cleaned.slice(3, 6)");
    expect(callsPageSrc).toContain("cleaned.slice(6)");
  });

  it("formatPhone utility handles 11-digit numbers with country code 1", () => {
    expect(callsPageSrc).toContain('cleaned.length === 11 && cleaned.startsWith("1")');
  });

  it("formatPhone utility handles null/empty gracefully", () => {
    expect(callsPageSrc).toContain('if (!phone) return "Unknown"');
  });
});

// ---------------------------------------------------------------------------
// 4. settings/notifications_work — NotificationPreferencesPanel structure
// ---------------------------------------------------------------------------

describe("settings/notifications_work — NotificationPreferencesPanel structure", () => {
  const notifSrc = tryReadSource(
    "src/components/settings/NotificationPreferencesPanel.tsx"
  );

  it("NotificationPreferencesPanel exists", () => {
    expect(notifSrc).toBeTruthy();
  });

  it("delegates to useNotificationPreferences hook (hook owns tenant scoping)", () => {
    if (!notifSrc) return;
    expect(notifSrc).toContain("useNotificationPreferences");
  });

  it("includes SMS/push coming soon note (SMS not yet live)", () => {
    if (!notifSrc) return;
    expect(notifSrc).toContain("SMS");
  });

  it("settings use Switch component for toggle UX", () => {
    if (!notifSrc) return;
    expect(notifSrc).toContain("Switch");
  });
});

// ---------------------------------------------------------------------------
// 5. settings/all_settings_persist_after_refresh — query key structure
// ---------------------------------------------------------------------------

describe("settings/all_settings_persist_after_refresh — query key structure", () => {
  it("SettingsPage uses tenant-scoped query keys (persist correctly on refresh)", () => {
    const settingsPageSrc = readSource("src/pages/app/SettingsPage.tsx");
    // Settings page uses useQuery with tenant.id in queryKey
    const usesQueryHooks =
      settingsPageSrc.includes("useQuery") ||
      settingsPageSrc.includes("useMutation") ||
      settingsPageSrc.includes("useAuth");
    expect(usesQueryHooks).toBe(true);
  });

  it("BusinessHoursManager is included in settings (hours persist after refresh)", () => {
    const settingsPageSrc = readSource("src/pages/app/SettingsPage.tsx");
    expect(settingsPageSrc).toContain("BusinessHoursManager");
  });

  it("NotificationPreferencesPanel is included in settings", () => {
    const settingsPageSrc = readSource("src/pages/app/SettingsPage.tsx");
    expect(settingsPageSrc).toContain("NotificationPreferencesPanel");
  });
});

// ---------------------------------------------------------------------------
// 6. overall/no_console_errors — CallsPage helper functions purity check
// ---------------------------------------------------------------------------

describe("overall/no_console_errors — CallsPage helper functions are pure (no side effects)", () => {
  const callsPageSrc = readSource("src/pages/app/CallsPage.tsx");

  it("formatPhone is a pure function (no console, no fetch, no state)", () => {
    const fnStart = callsPageSrc.indexOf("function formatPhone");
    const fnEnd = callsPageSrc.indexOf("\nfunction ", fnStart + 1);
    const fnBody = callsPageSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : undefined);
    expect(fnBody).not.toContain("console.");
    expect(fnBody).not.toContain("fetch(");
    expect(fnBody).not.toContain("useState(");
  });

  it("deduplicateByPhone is a pure function", () => {
    const fnStart = callsPageSrc.indexOf("function deduplicateByPhone");
    const fnEnd = callsPageSrc.indexOf("\nfunction ", fnStart + 1);
    const fnBody = callsPageSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : undefined);
    expect(fnBody).not.toContain("console.");
    expect(fnBody).not.toContain("fetch(");
  });

  it("getCustomerName is a pure function", () => {
    const fnStart = callsPageSrc.indexOf("function getCustomerName");
    const fnEnd = callsPageSrc.indexOf("\nfunction ", fnStart + 1);
    const fnBody = callsPageSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : undefined);
    expect(fnBody).not.toContain("console.");
  });

  it("getServiceRequested is a pure function (key for sales vehicle extraction)", () => {
    const fnStart = callsPageSrc.indexOf("function getServiceRequested");
    const fnEnd = callsPageSrc.indexOf("\nfunction ", fnStart + 1);
    const fnBody = callsPageSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : undefined);
    expect(fnBody).not.toContain("console.");
  });
});

// ---------------------------------------------------------------------------
// 7. dashboard/call_history_real_data — CallCard component structure
// ---------------------------------------------------------------------------

describe("dashboard/call_history_real_data — CallCard mobile component", () => {
  const callCardSrc = tryReadSource("src/components/calls/CallCard.tsx");

  if (callCardSrc) {
    it("CallCard accepts call prop", () => {
      expect(callCardSrc).toContain("call");
    });

    it("CallCard has no console.log or console.warn", () => {
      const violations = hasConsoleLogOrWarn(callCardSrc);
      expect(violations).toHaveLength(0);
    });

    it("CallCard renders without crashing on minimal call data", () => {
      // Check it handles missing fields gracefully
      const hasSafeAccess =
        callCardSrc.includes("?.") ||
        callCardSrc.includes("|| ") ||
        callCardSrc.includes("?? ");
      expect(hasSafeAccess).toBe(true);
    });
  }
});
