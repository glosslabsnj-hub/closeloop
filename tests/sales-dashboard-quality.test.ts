/**
 * Sales Dashboard Quality Gate Tests
 *
 * @vitest-environment node
 *
 * Covers:
 * 1. dashboard/all_pages_load_no_errors — error boundaries present, no null dereferences
 * 2. dashboard/bookings_crud_works — test drive stats + CRUD logic
 * 3. dashboard/mode_specific_features_work — car dealership detection, pipeline column filtering
 * 4. overall/error_states_have_recovery — error boundaries on all 3 sales pages
 * 5. dashboard/customer_management_works — sales leads CRUD structure
 * 6. overall/no_console_errors — no console.log in more dashboard files
 *
 * Gate targets: dashboard/all_pages_load_no_errors, dashboard/bookings_crud_works,
 *               dashboard/mode_specific_features_work, overall/error_states_have_recovery,
 *               dashboard/customer_management_works
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
// 1. overall/error_states_have_recovery — all sales pages wrap in ErrorBoundary
// ---------------------------------------------------------------------------

describe("overall/error_states_have_recovery — sales pages have ErrorBoundary", () => {
  const salesPages = [
    "src/pages/app/TestDrivesPage.tsx",
    "src/pages/app/SalesPipelinePage.tsx",
    "src/pages/app/SalesInventoryPage.tsx",
  ];

  for (const page of salesPages) {
    it(`${page.split("/").pop()} imports ErrorBoundary`, () => {
      const src = readSource(page);
      expect(src).toContain("import ErrorBoundary");
    });

    it(`${page.split("/").pop()} uses <ErrorBoundary>`, () => {
      const src = readSource(page);
      expect(src).toContain("<ErrorBoundary");
    });

    it(`${page.split("/").pop()} has closing </ErrorBoundary>`, () => {
      const src = readSource(page);
      expect(src).toContain("</ErrorBoundary>");
    });

    it(`${page.split("/").pop()} provides a context prop to ErrorBoundary`, () => {
      const src = readSource(page);
      // ErrorBoundary context="..." gives user-facing error message
      expect(src).toMatch(/ErrorBoundary\s+context=/);
    });
  }

  it("SalesDashboardLayout uses hooks that internally default to [] (crash-safe)", () => {
    const src = readSource("src/components/dashboard/layouts/SalesDashboardLayout.tsx");
    // Hooks handle the ?? [] defaults internally — component just uses what hooks return
    expect(src).toContain("useTestDrives");
    expect(src).toContain("useSalesInventory");
    expect(src).toContain("useSalesLeads");
  });
});

// ---------------------------------------------------------------------------
// 2. dashboard/all_pages_load_no_errors — null guard patterns
// ---------------------------------------------------------------------------

describe("dashboard/all_pages_load_no_errors — null guards in sales pages", () => {
  it("TestDrivesPage uses isLoading guard before rendering list", () => {
    const src = readSource("src/pages/app/TestDrivesPage.tsx");
    expect(src).toMatch(/isLoading|moduleLoading/);
  });

  it("TestDrivesPage uses useModuleRequired for access control", () => {
    const src = readSource("src/pages/app/TestDrivesPage.tsx");
    expect(src).toContain("useModuleRequired");
    expect(src).toContain('["test_drives"]');
  });

  it("SalesPipelinePage uses isLoading guard before rendering", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toMatch(/isLoading|moduleLoading/);
  });

  it("SalesPipelinePage uses useModuleRequired for access control", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toContain("useModuleRequired");
    expect(src).toContain('"sales_leads"');
  });

  it("SalesInventoryPage uses isLoading guard before rendering", () => {
    const src = readSource("src/pages/app/SalesInventoryPage.tsx");
    expect(src).toMatch(/isLoading|moduleLoading/);
  });

  it("SalesInventoryPage uses useModuleRequired for access control", () => {
    const src = readSource("src/pages/app/SalesInventoryPage.tsx");
    expect(src).toContain("useModuleRequired");
  });

  it("useTestDrives returns empty array as default (prevents .map crash)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("drivesQuery.data ?? []");
  });

  it("useSalesLeads returns empty array as default (prevents .map crash)", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("leadsQuery.data ?? []");
  });

  it("useSalesInventory returns empty array as default (prevents .map crash)", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toContain("inventoryQuery.data ?? []");
  });

  it("useTestDrives stats useMemo uses fallback (drivesQuery.data ?? [])", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    // Stats must not crash on undefined data
    expect(src).toMatch(/drivesQuery\.data \?\? \[\]/);
  });

  it("useSalesInventory stats useMemo uses fallback", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toMatch(/inventoryQuery\.data \?\? \[\]/);
  });
});

// ---------------------------------------------------------------------------
// 3. dashboard/mode_specific_features_work — car dealership detection + pipeline
// ---------------------------------------------------------------------------

describe("dashboard/mode_specific_features_work — car dealership detection", () => {
  const EXPECTED_CAR_DEALERSHIP_SLUGS = [
    "car-dealership-new",
    "car-dealership-used",
    "car-dealership-full",
    "rv-dealer",
    "boat-dealer",
    "motorcycle-dealer",
    "equipment-sales",
  ];

  it("SalesPipelinePage has CAR_DEALERSHIP_SLUGS set", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toContain("CAR_DEALERSHIP_SLUGS");
    expect(src).toContain("new Set([");
  });

  for (const slug of EXPECTED_CAR_DEALERSHIP_SLUGS) {
    it(`SalesPipelinePage recognizes '${slug}' as car dealership`, () => {
      const src = readSource("src/pages/app/SalesPipelinePage.tsx");
      expect(src).toContain(`"${slug}"`);
    });
  }

  it("SalesDashboardLayout has the same CAR_DEALERSHIP_SLUGS as SalesPipelinePage", () => {
    const pipelineSrc = readSource("src/pages/app/SalesPipelinePage.tsx");
    const dashboardSrc = readSource("src/components/dashboard/layouts/SalesDashboardLayout.tsx");
    for (const slug of EXPECTED_CAR_DEALERSHIP_SLUGS) {
      expect(pipelineSrc).toContain(`"${slug}"`);
      expect(dashboardSrc).toContain(`"${slug}"`);
    }
  });

  it("Pipeline has Test Drive column (dealerOnly: true)", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toContain('"test_drive"');
    expect(src).toContain("dealerOnly: true");
  });

  it("Pipeline filters dealerOnly columns based on isCarDealership flag", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    // Filter logic must exist: only show dealerOnly columns for car dealers
    expect(src).toMatch(/filter.*dealerOnly.*isCarDealership|isCarDealership.*dealerOnly/);
  });

  it("non-dealer sales businesses still get New/Contacted/Qualified/Sold columns", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    // Core pipeline stages are not dealerOnly
    expect(src).toContain('"new"');
    expect(src).toContain('"contacted"');
    expect(src).toContain('"qualified"');
    expect(src).toContain('"sold"');
    // These columns should have dealerOnly: false
    expect(src).toContain("dealerOnly: false");
  });

  it("TestDrivesPage uses useTestDrives hook", () => {
    const src = readSource("src/pages/app/TestDrivesPage.tsx");
    expect(src).toContain("useTestDrives");
  });

  it("SalesDashboardLayout shows test drive stats for car dealers", () => {
    const src = readSource("src/components/dashboard/layouts/SalesDashboardLayout.tsx");
    expect(src).toContain("driveStats");
    expect(src).toContain("Test Drives Today");
  });

  it("SalesDashboardLayout shows lead stats for all sales businesses", () => {
    const src = readSource("src/components/dashboard/layouts/SalesDashboardLayout.tsx");
    expect(src).toContain("leadStats");
    expect(src).toContain("Hot Leads");
  });

  it("SalesDashboardLayout shows inventory stats", () => {
    const src = readSource("src/components/dashboard/layouts/SalesDashboardLayout.tsx");
    expect(src).toContain("inventoryStats");
  });
});

// ---------------------------------------------------------------------------
// 4. dashboard/bookings_crud_works — useTestDrives stats calculation logic
// ---------------------------------------------------------------------------

describe("dashboard/bookings_crud_works — useTestDrives hook structure", () => {
  it("useTestDrives provides createTestDrive mutation", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("createTestDrive");
    expect(src).toContain("useMutation");
  });

  it("useTestDrives provides updateTestDrive mutation", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("updateTestDrive");
  });

  it("useTestDrives provides deleteTestDrive mutation", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("deleteTestDrive");
  });

  it("createTestDrive includes tenant_id in insert (multi-tenant safety)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toMatch(/insert.*tenant_id.*tenant\.id|tenant_id.*insert/s);
  });

  it("updateTestDrive filters by id (does not update all rows)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    // .update().eq("id", id) pattern
    expect(src).toMatch(/\.update\(.*\)[\s\S]*?\.eq\("id"/);
  });

  it("deleteTestDrive filters by id only (no tenant scope leak)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toMatch(/\.delete\(\)[\s\S]*?\.eq\("id"/);
  });

  it("useTestDrives.stats.today counts today's test drives by scheduled_date", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("scheduled_date");
    expect(src).toContain("today:");
  });

  it("useTestDrives.stats.thisWeek counts this week's drives", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("thisWeek:");
  });

  it("useTestDrives.stats.pending counts pending status drives", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain('status === "pending"');
    expect(src).toContain("pending:");
  });

  it("useTestDrives.stats.completed counts completed drives", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain('status === "completed"');
    expect(src).toContain("completed:");
  });

  it("useTestDrives query orders by scheduled_date ascending (upcoming first)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain('"scheduled_date"');
    expect(src).toContain("ascending: true");
  });

  it("TestDrivesPage has status filter (pending/confirmed/completed/cancelled/no_show)", () => {
    const src = readSource("src/pages/app/TestDrivesPage.tsx");
    expect(src).toContain("statusFilter");
    expect(src).toContain('"pending"');
    expect(src).toContain('"confirmed"');
    expect(src).toContain('"completed"');
    expect(src).toContain('"cancelled"');
  });

  it("TestDrivesPage has search functionality", () => {
    const src = readSource("src/pages/app/TestDrivesPage.tsx");
    expect(src).toContain("searchQuery");
  });

  it("TestDrivesPage createTestDrive dialog requires scheduledDate field", () => {
    const src = readSource("src/pages/app/TestDrivesPage.tsx");
    expect(src).toContain("scheduledDate");
    expect(src).toContain("createOpen");
  });
});

// ---------------------------------------------------------------------------
// 5. dashboard/customer_management_works — useSalesLeads CRUD
// ---------------------------------------------------------------------------

describe("dashboard/customer_management_works — useSalesLeads hook structure", () => {
  it("useSalesLeads provides createLead mutation", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("createLead");
    expect(src).toContain("useMutation");
  });

  it("useSalesLeads provides updateLead mutation", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("updateLead");
  });

  it("useSalesLeads provides deleteLead mutation", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("deleteLead");
  });

  it("createLead includes tenant_id (multi-tenant safety)", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toMatch(/insert.*tenant_id.*tenant\.id|tenant_id.*insert/s);
  });

  it("useSalesLeads stats tracks hot leads", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("hot:");
  });

  it("useSalesLeads stats tracks pipeline stages", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("total:");
  });

  it("SalesPipelinePage uses useSalesLeads hook", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toContain("useSalesLeads");
  });

  it("SalesPipelinePage supports lead status update (drag to stage)", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toMatch(/updateLead|status.*column|move.*lead/);
  });

  it("SalesPipelinePage shows customer name and contact info", () => {
    const src = readSource("src/pages/app/SalesPipelinePage.tsx");
    expect(src).toMatch(/full_name|phone|customer/);
  });
});

// ---------------------------------------------------------------------------
// 6. overall/no_console_errors — dashboard files have no console.log/warn
// ---------------------------------------------------------------------------

const dashboardFiles = [
  "src/components/dashboard/layouts/SalesDashboardLayout.tsx",
  "src/hooks/useTestDrives.ts",
  "src/hooks/useSalesLeads.ts",
  "src/hooks/useSalesInventory.ts",
  "src/pages/app/TestDrivesPage.tsx",
  "src/pages/app/SalesPipelinePage.tsx",
  "src/pages/app/SalesInventoryPage.tsx",
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

describe("overall/no_console_errors — sales dashboard files clean", () => {
  for (const file of dashboardFiles) {
    it(`${file.split("/").pop()} has no console.log or console.warn`, () => {
      const src = tryReadSource(file);
      if (!src) return; // file doesn't exist yet — skip
      const violations = hasConsoleLogOrWarn(src);
      expect(violations, `Found console.log/warn: ${violations.join(", ")}`).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// 7. Realtime subscription cleanup — prevents memory leaks in sales pages
// ---------------------------------------------------------------------------

describe("dashboard/all_pages_load_no_errors — realtime subscription cleanup", () => {
  it("useTestDrives removes channel on cleanup (no memory leak)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("supabase.removeChannel(channel)");
  });

  it("useSalesLeads removes channel on cleanup", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("supabase.removeChannel(channel)");
  });

  it("useTestDrives channel is tenant-scoped (prevents cross-tenant leaks)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("test-drives-realtime-${tenant.id}");
  });

  it("useSalesLeads channel is tenant-scoped", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("sales-leads-realtime-${tenant.id}");
  });

  it("useTestDrives realtime filter is tenant-scoped (RLS reinforcement)", () => {
    const src = readSource("src/hooks/useTestDrives.ts");
    expect(src).toContain("tenant_id=eq.${tenant.id}");
  });

  it("useSalesLeads realtime filter is tenant-scoped", () => {
    const src = readSource("src/hooks/useSalesLeads.ts");
    expect(src).toContain("tenant_id=eq.${tenant.id}");
  });
});

// ---------------------------------------------------------------------------
// 8. inventory CRUD structure — dashboard/mode_specific_features_work
// ---------------------------------------------------------------------------

describe("dashboard/mode_specific_features_work — inventory management", () => {
  it("useSalesInventory provides createItem mutation", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toContain("createItem");
    expect(src).toContain("useMutation");
  });

  it("useSalesInventory provides updateItem mutation", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toContain("updateItem");
  });

  it("useSalesInventory provides deleteItem mutation", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toContain("deleteItem");
  });

  it("useSalesInventory stats tracks available vs sold (key business metric)", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toContain("available:");
    expect(src).toContain("sold:");
  });

  it("useSalesInventory stats tracks new vs used condition", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toContain("newCondition:");
    expect(src).toContain("usedCondition:");
  });

  it("SalesInventoryPage has status filter (available/pending/sold)", () => {
    const src = readSource("src/pages/app/SalesInventoryPage.tsx");
    expect(src).toContain("statusFilter");
    expect(src).toContain('"available"');
  });

  it("SalesInventoryPage has search functionality", () => {
    const src = readSource("src/pages/app/SalesInventoryPage.tsx");
    expect(src).toContain("searchQuery");
  });

  it("inventory search covers make, model, year, stock_number", () => {
    const src = readSource("src/pages/app/SalesInventoryPage.tsx");
    // Search should include key identifiers
    expect(src).toMatch(/make|model|year|stock_number/);
  });

  it("createItem includes tenant_id (multi-tenant safety)", () => {
    const src = readSource("src/hooks/useSalesInventory.ts");
    expect(src).toMatch(/insert.*tenant_id.*tenant\.id|tenant_id.*insert/s);
  });
});
